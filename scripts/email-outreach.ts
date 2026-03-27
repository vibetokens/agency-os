/**
 * scripts/email-outreach.ts
 *
 * Sequence-aware cold email outreach.
 * Sends the next email in a 14-day drip sequence for each lead.
 * Scrapes contact email on day 1, reuses it on subsequent days.
 *
 * Usage:
 *   npm run email                          — send next email to all due leads
 *   npm run email -- --dry-run             — preview, no sends
 *   npm run email -- --limit 5
 *   npm run email -- --id 21               — single lead
 *   npm run email -- --id 21 --day 1       — force a specific day (useful for testing)
 *   npm run email -- --id 21 --to me@example.com   — override recipient
 */

import "dotenv/config";
import { chromium } from "playwright";
import Anthropic from "@anthropic-ai/sdk";
import nodemailer from "nodemailer";
import { db, schema } from "../lib/db";
import { eq, isNull, or, lte, sql } from "drizzle-orm";
import { getNextEmail } from "../icp/sequences";
import { wrapHtml } from "../icp/sequences/email-html";

const { leads } = schema;

// ── Email scraping ────────────────────────────────────────────────────────────

const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;

const SKIP_DOMAINS = [
  "sentry.io", "wixpress.com", "squarespace.com", "wordpress.com",
  "example.com", "yoursite.com", "email.com", "domain.com",
  "google.com", "facebook.com", "instagram.com", "yelp.com",
];

function isValidEmail(email: string): boolean {
  const lower = email.toLowerCase();
  if (SKIP_DOMAINS.some((d) => lower.endsWith(`@${d}`))) return false;
  if (lower.endsWith(".png") || lower.endsWith(".jpg") || lower.endsWith(".svg")) return false;
  return true;
}

async function scrapeEmail(
  website: string,
  page: import("playwright").Page
): Promise<string | null> {
  const urlsToTry = [
    website,
    website.replace(/\/$/, "") + "/contact",
    website.replace(/\/$/, "") + "/contact-us",
    website.replace(/\/$/, "") + "/about",
  ];

  for (const url of urlsToTry) {
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 12000 });
      const html = await page.content();
      const emails = (html.match(EMAIL_RE) ?? []).filter(isValidEmail);
      if (emails.length > 0) return emails[0];
    } catch {
      // skip inaccessible pages
    }
  }
  return null;
}

// ── Email drafting ────────────────────────────────────────────────────────────

async function draftEmail(
  prompt: string,
  client: Anthropic
): Promise<{ subject: string; body: string }> {
  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 900,
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text.trim() : "";
  const lines = text.split("\n");
  const subjectLine = lines.find((l) => l.startsWith("Subject:")) ?? "";
  const subject = subjectLine.replace("Subject:", "").trim();
  const body = lines
    .filter((l) => !l.startsWith("Subject:"))
    .join("\n")
    .trim();

  return { subject: subject || "Quick question about your website", body: wrapHtml(body) };
}

// ── Sending ───────────────────────────────────────────────────────────────────

function createTransport() {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
}

// ── CLI args ──────────────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (flag: string) => {
    const idx = args.indexOf(flag);
    return idx !== -1 ? args[idx + 1] : null;
  };
  return {
    dryRun: args.includes("--dry-run"),
    limit: parseInt(get("--limit") ?? "10", 10),
    id: get("--id") ? parseInt(get("--id")!, 10) : null,
    forceDay: get("--day") ? parseInt(get("--day")!, 10) : null,
    to: get("--to") ?? null,
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const { dryRun, limit, id, forceDay, to } = parseArgs();

  if (dryRun) console.log("\n[DRY RUN — no emails will be sent]\n");

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY not set"); process.exit(1);
  }
  if (!dryRun && !process.env.GMAIL_APP_PASSWORD) {
    console.error("GMAIL_APP_PASSWORD not set. Get one at myaccount.google.com/apppasswords");
    process.exit(1);
  }

  const client = new Anthropic();
  const transporter = dryRun ? null : createTransport();

  // Fetch leads
  // A lead is "due" if:
  //   - email_day is 0 (never contacted) AND has a website, OR
  //   - email_day is 1–13 AND last_emailed_at was ≥24h ago
  let leadsToProcess;

  if (id) {
    leadsToProcess = await db.select().from(leads).where(eq(leads.id, id));
  } else {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const allLeads = await db.select().from(leads).limit(limit * 3);
    leadsToProcess = allLeads
      .filter((l) => l.website)
      .filter((l) => l.status !== "bounced")
      .filter((l) => {
        if (l.emailDay === 0) return true; // never emailed
        if (l.emailDay >= 14) return false; // sequence complete
        return !l.lastEmailedAt || l.lastEmailedAt < yesterday; // due for next
      })
      .slice(0, limit);
  }

  if (leadsToProcess.length === 0) {
    console.log("No leads due for email.");
    return;
  }

  console.log(`\nProcessing ${leadsToProcess.length} leads...\n`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
  });
  const page = await context.newPage();

  let sent = 0;
  let noEmail = 0;

  for (const lead of leadsToProcess) {
    console.log(`[${lead.id}] ${lead.businessName} — day ${lead.emailDay + 1}`);

    // 1. Get or scrape email address
    let emailAddress = lead.emailAddress;
    if (!emailAddress) {
      process.stdout.write("  Scraping email... ");
      emailAddress = await scrapeEmail(lead.website!, page);
      if (!emailAddress) {
        console.log("no email found, skipping.");
        noEmail++;
        continue;
      }
      console.log(emailAddress);
    }

    // 2. Get next sequence email
    const effectiveLead = forceDay
      ? { ...lead, emailDay: forceDay - 1 }
      : lead;
    const next = getNextEmail(effectiveLead as typeof lead);
    if (!next) {
      console.log("  Sequence complete, skipping.");
      continue;
    }

    // 3. Draft
    process.stdout.write(`  Drafting day ${next.day}... `);
    const { subject, body } = await draftEmail(next.prompt, client);
    console.log(`"${subject}"`);

    if (dryRun) {
      console.log("  ---");
      console.log(body);
      console.log("  ---\n");
      continue;
    }

    // 4. Send
    process.stdout.write("  Sending... ");
    try {
      await transporter!.sendMail({
        from: `Jason Murphy <${process.env.GMAIL_USER}>`,
        to: to ?? emailAddress,
        subject,
        html: body,
      });

      // 5. Update lead record
      await db.update(leads)
        .set({
          emailDay: next.day,
          lastEmailedAt: new Date().toISOString(),
          emailAddress,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(leads.id, lead.id));

      sent++;
      console.log("sent ✓");
    } catch (err) {
      console.log(`failed: ${(err as Error).message}`);
    }

    // Human-paced delay
    await new Promise((r) => setTimeout(r, 3000 + Math.random() * 2000));
  }

  await browser.close();
  console.log(`\nDone. ${sent} sent, ${noEmail} had no email found.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
