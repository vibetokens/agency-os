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

  if (leads.length === 0) {
    console.log("No unreplied leads with email addresses.");
    db.close();
    return;
  }

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

  let foundCount = 0;

  try {
    const lock = await client.getMailboxLock("INBOX");

    try {
      // Search for messages from each lead in batches of 10
      // IMAP OR is binary — build a search tree
      const emailAddresses = leads.map((l) => l.email_address.toLowerCase());
      const emailToLead = new Map(leads.map((l) => [l.email_address.toLowerCase(), l]));

      // Build OR search for all lead addresses — IMAP supports nested OR
      // ImapFlow search: { or: [{ from: "a" }, { from: "b" }] }
      // For large lists, batch into groups of 20 to avoid oversized queries
      const BATCH = 20;
      const matchedUids = new Set<number>();

      for (let i = 0; i < emailAddresses.length; i += BATCH) {
        const batch = emailAddresses.slice(i, i + BATCH);

        let query: object;
        if (batch.length === 1) {
          query = { from: batch[0] };
        } else {
          // Fold into nested OR: { or: [{ from: a }, { or: [{ from: b }, ...] }] }
          query = batch.reduceRight<object>(
            (acc, addr, idx) => idx === batch.length - 1 ? { from: addr } : { or: [{ from: addr }, acc] },
            { from: batch[batch.length - 1] }
          );
        }

        const uids = await client.search(query, { uid: true });
        for (const uid of uids) matchedUids.add(uid as number);
      }

      if (matchedUids.size === 0) {
        console.log("No replies found.");
        return;
      }

      console.log(`Found ${matchedUids.size} potential repl${matchedUids.size === 1 ? "y" : "ies"} — fetching details...`);

      // Fetch envelope + body for matched UIDs
      const uidList = Array.from(matchedUids).join(",");

      for await (const msg of client.fetch(uidList, { envelope: true, uid: true }, { uid: true })) {
        const fromAddr = msg.envelope?.from?.[0]?.address?.toLowerCase();
        if (!fromAddr) continue;

        const lead = emailToLead.get(fromAddr);
        if (!lead) continue;

        const subject = msg.envelope?.subject ?? "";

        // Skip bounces and auto-replies
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
    } finally {
      lock.release();
    }
  } finally {
    await client.logout();
    db.close();
  }

  if (foundCount === 0) {
    console.log("No new replies found.");
  } else {
    console.log(`\n${foundCount} repl${foundCount === 1 ? "y" : "ies"} processed.${DRY_RUN ? " (dry-run — no writes)" : ""}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
