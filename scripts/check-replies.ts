/**
 * scripts/check-replies.ts
 *
 * Connects to Gmail via IMAP, searches for replies from leads, updates DB.
 * Uses IMAP SEARCH (fast) rather than full inbox scan.
 * Runs every 30 minutes via Task Scheduler.
 *
 * Usage:
 *   npm run check-replies
 *   npm run check-replies -- --dry-run
 */

import "dotenv/config";
import Database from "better-sqlite3";
import path from "path";
import { ImapFlow } from "imapflow";

const DB_PATH = path.join(process.cwd(), "outreach.db");
const DRY_RUN = process.argv.includes("--dry-run");

// ── Schema migration ──────────────────────────────────────────────────────────

function ensureColumns(db: Database.Database) {
  const cols = db.prepare("PRAGMA table_info(leads)").all() as { name: string }[];
  const names = cols.map((c) => c.name);
  if (!names.includes("replied_at")) {
    db.prepare("ALTER TABLE leads ADD COLUMN replied_at TEXT").run();
  }
  if (!names.includes("reply_snippet")) {
    db.prepare("ALTER TABLE leads ADD COLUMN reply_snippet TEXT").run();
  }
  if (!names.includes("bounced_at")) {
    db.prepare("ALTER TABLE leads ADD COLUMN bounced_at TEXT").run();
  }
}

// ── Auto-reply / bounce filter ────────────────────────────────────────────────
// Emails from these senders or with these subject patterns are not real replies

const BOUNCE_DOMAINS = new Set([
  "webador.com", "wix.com", "squarespace.com", "godaddy.com",
  "mailer-daemon", "postmaster", "noreply", "no-reply",
  "bounce", "mailchimp.com", "sendgrid.net", "amazonses.com",
  "smtp.google.com", "googlemail.com",
]);

const BOUNCE_SUBJECT_PATTERNS = [
  "delivery status notification", "mail delivery failed", "undeliverable",
  "auto-reply", "automatic reply", "out of office", "vacation",
  "mailer-daemon", "delivery failure",
];

function isAutoReply(fromAddr: string, subject: string): boolean {
  const lowerFrom = fromAddr.toLowerCase();
  const lowerSubject = subject.toLowerCase();
  if (BOUNCE_DOMAINS.has(lowerFrom.split("@")[1] ?? "")) return true;
  if (BOUNCE_DOMAINS.has(lowerFrom)) return true;
  if (BOUNCE_SUBJECT_PATTERNS.some((p) => lowerSubject.includes(p))) return true;
  return false;
}

// ── Reply intent classifier ───────────────────────────────────────────────────

function classifyReply(subject: string, body: string): "interested" | "not_interested" | "unsubscribe" | "replied" {
  const text = (subject + " " + body).toLowerCase();

  if (["unsubscribe", "remove me", "take me off", "stop emailing", "opt out", "opt-out"].some((s) => text.includes(s))) {
    return "unsubscribe";
  }
  if (["not interested", "no thanks", "no thank you", "not a fit", "we have someone", "already have", "not looking", "please stop"].some((s) => text.includes(s))) {
    return "not_interested";
  }
  if (["interested", "tell me more", "sounds good", "would love", "let's chat", "can we talk", "schedule", "book", "call me", "what does it cost", "pricing", "how much", "curious"].some((s) => text.includes(s))) {
    return "interested";
  }

  return "replied";
}

// ── Bounce detection ─────────────────────────────────────────────────────────
// Searches for mailer-daemon delivery failure emails, extracts the bounced
// address, and marks the matching lead as bounced so it stops getting emailed.

async function checkBounces(
  client: ImapFlow,
  db: Database.Database,
  dryRun: boolean
): Promise<number> {
  // Build a map of all lead email addresses we've sent to
  const emailedLeads = db
    .prepare(
      `SELECT id, business_name, email_address
       FROM leads
       WHERE email_address IS NOT NULL
         AND email_day > 0
         AND (status IS NULL OR status != 'bounced')`
    )
    .all() as { id: number; business_name: string; email_address: string }[];

  if (emailedLeads.length === 0) return 0;

  const emailToLead = new Map(
    emailedLeads.map((l) => [l.email_address.toLowerCase(), l])
  );

  // Search for delivery failure messages in the last 60 days
  const since = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
  const lock = await client.getMailboxLock("INBOX");
  let bounced = 0;

  try {
    const uids = await client.search(
      {
        since,
        or: [
          { from: "mailer-daemon" },
          { from: "postmaster" },
        ],
      },
      { uid: true }
    );

    if (uids.length === 0) return 0;

    for await (const msg of client.fetch(
      uids.join(","),
      { envelope: true, source: true, uid: true },
      { uid: true }
    )) {
      // Parse raw message source for any email address matching a lead we've sent to
      const raw = msg.source?.toString() ?? "";

      // Look for standard DSN Final-Recipient header first, then fall back to
      // scanning the full body for a matching address
      const finalRecipientMatch = raw.match(/Final-Recipient:\s*rfc822;\s*([^\s\r\n]+)/i);
      const candidates: string[] = [];

      if (finalRecipientMatch?.[1]) {
        candidates.push(finalRecipientMatch[1].toLowerCase());
      } else {
        // Extract all email-like strings from the body and check against leads
        const allEmails = raw.match(/[\w.+-]+@[\w-]+\.[a-zA-Z]{2,}/g) ?? [];
        candidates.push(...allEmails.map((e) => e.toLowerCase()));
      }

      for (const addr of candidates) {
        const lead = emailToLead.get(addr);
        if (!lead) continue;

        const subject = msg.envelope?.subject ?? "(no subject)";
        console.log(`  BOUNCE: ${lead.business_name} <${addr}> — "${subject}"`);

        if (!dryRun) {
          const now = new Date().toISOString();
          db.prepare(
            `UPDATE leads
             SET status = 'bounced', bounced_at = ?, email_day = 14, updated_at = ?
             WHERE id = ?`
          ).run(now, now, lead.id);
          // Remove from map so we don't double-count if multiple bounce messages exist
          emailToLead.delete(addr);
        }

        bounced++;
        break; // one bounce per message is enough
      }
    }
  } finally {
    lock.release();
  }

  return bounced;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const db = new Database(DB_PATH);
  ensureColumns(db);

  // Get leads that haven't replied yet and have email addresses
  const leads = db
    .prepare(
      `SELECT id, business_name, email_address, call_status
       FROM leads
       WHERE email_address IS NOT NULL
         AND email_day > 0
         AND replied_at IS NULL
         AND call_status NOT IN ('booked', 'dnc', 'not_interested')`
    )
    .all() as { id: number; business_name: string; email_address: string; call_status: string }[];

  let foundCount = 0;

  if (leads.length === 0) {
    console.log("No unreplied leads with email addresses — skipping reply check.");
  } else {
    console.log(`Searching Gmail for replies from ${leads.length} leads...`);

    const client = new ImapFlow({
      host: "imap.gmail.com",
      port: 993,
      secure: true,
      auth: {
        user: process.env.GMAIL_USER!,
        pass: process.env.GMAIL_APP_PASSWORD!,
      },
      logger: false,
    });

    await client.connect();

    try {
      const lock = await client.getMailboxLock("INBOX");

      try {
        const emailAddresses = leads.map((l) => l.email_address.toLowerCase());
        const emailToLead = new Map(leads.map((l) => [l.email_address.toLowerCase(), l]));

        const BATCH = 20;
        const matchedUids = new Set<number>();

        for (let i = 0; i < emailAddresses.length; i += BATCH) {
          const batch = emailAddresses.slice(i, i + BATCH);
          let query: object;
          if (batch.length === 1) {
            query = { from: batch[0] };
          } else {
            query = batch.reduceRight<object>(
              (acc, addr, idx) => idx === batch.length - 1 ? { from: addr } : { or: [{ from: addr }, acc] },
              { from: batch[batch.length - 1] }
            );
          }
          const uids = await client.search(query, { uid: true });
          for (const uid of uids) matchedUids.add(uid as number);
        }

        if (matchedUids.size > 0) {
          console.log(`Found ${matchedUids.size} potential repl${matchedUids.size === 1 ? "y" : "ies"} — fetching details...`);
          const uidList = Array.from(matchedUids).join(",");

          for await (const msg of client.fetch(uidList, { envelope: true, uid: true }, { uid: true })) {
            const fromAddr = msg.envelope?.from?.[0]?.address?.toLowerCase();
            if (!fromAddr) continue;

            const lead = emailToLead.get(fromAddr);
            if (!lead) continue;

            const subject = msg.envelope?.subject ?? "";

            if (isAutoReply(fromAddr, subject)) {
              console.log(`  SKIP (auto-reply): ${fromAddr} — "${subject}"`);
              continue;
            }

            const intent = classifyReply(subject, "");
            const snippet = `${subject}`.trim().slice(0, 200);
            const now = new Date().toISOString();

            const newCallStatus =
              intent === "unsubscribe" ? "dnc" :
              intent === "not_interested" ? "not_interested" :
              lead.call_status;

            console.log(`REPLY [${intent.toUpperCase()}]: ${lead.business_name} <${fromAddr}> — "${subject}"`);

            if (!DRY_RUN) {
              db.prepare(
                `UPDATE leads SET replied_at = ?, reply_snippet = ?, call_status = ?, updated_at = ? WHERE id = ?`
              ).run(now, snippet, newCallStatus, now, lead.id);
            }

            foundCount++;
          }
        }
      } finally {
        lock.release();
      }
    } finally {
      await client.logout();
    }

    if (foundCount === 0) {
      console.log("No new replies found.");
    } else {
      console.log(`\n${foundCount} repl${foundCount === 1 ? "y" : "ies"} processed.${DRY_RUN ? " (dry-run — no writes)" : ""}`);
    }
  }

  // ── Bounce pass ────────────────────────────────────────────────────────────
  console.log("\nChecking for bounced addresses...");
  const client2 = new ImapFlow({
    host: "imap.gmail.com",
    port: 993,
    secure: true,
    auth: {
      user: process.env.GMAIL_USER!,
      pass: process.env.GMAIL_APP_PASSWORD!,
    },
    logger: false,
  });
  await client2.connect();
  try {
    const bouncedCount = await checkBounces(client2, db, DRY_RUN);
    if (bouncedCount === 0) {
      console.log("No new bounces found.");
    } else {
      console.log(`${bouncedCount} address${bouncedCount === 1 ? "" : "es"} marked bounced.${DRY_RUN ? " (dry-run)" : ""}`);
    }
  } finally {
    await client2.logout();
    db.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
