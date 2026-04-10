/**
 * scripts/run-pipeline.ts
 *
 * The daily runner. Runs for every active ICP in pipeline.config.ts:
 *   1. Discovers new leads if the pool is running low
 *   2. Sends Day 1 to new leads
 *   3. Advances existing leads to their next sequence email
 *
 * Designed to run nightly via Task Scheduler / cron.
 *
 * Usage:
 *   npm run pipeline                        — full run, all active ICPs
 *   npm run pipeline -- --dry-run           — preview, no sends
 *   npm run pipeline -- --icp med-spa       — single ICP only
 *   npm run pipeline -- --discover-only     — skip email, just discover
 *   npm run pipeline -- --email-only        — skip discovery, just send
 */

// IMPORTANT: override is required because the shell env may have a stale
// ANTHROPIC_API_KEY (ending in 1FlwAA) that doesn't match the working key
// in .env.local (ending in WgAA). Without override, the SDK uses the stale
// key and returns 401 invalid_api_key. Discovered 2026-04-10.
import { config as dotenvConfig } from "dotenv";
dotenvConfig({ path: ".env.local", override: true });

// ── PAUSE GATE ────────────────────────────────────────────────────────────────
// Set PIPELINE_PAUSED=true in .env.local or the shell to short-circuit the
// nightly cron without commenting out scheduler entries.
//
// Paused 2026-04-10 because the audit funnel is broken against the Abilene case
// (see TONIGHT.md). Unpause ONLY after the Audit Integrity Gate in
// vibetokens/lib/audit/deliver.ts is live and tested.
if (process.env.PIPELINE_PAUSED === "true") {
  console.log("[pipeline] PIPELINE_PAUSED=true — skipping this run");
  console.log("[pipeline] Unset PIPELINE_PAUSED in .env.local to resume");
  process.exit(0);
}
import { execSync } from "child_process";
import { db, schema } from "../lib/db";
import { eq, and, lt, isNull, or, lte } from "drizzle-orm";
import { PIPELINE } from "../pipeline.config";
import { getIcp } from "../icp/sequences";
import Anthropic from "@anthropic-ai/sdk";
import { withRetry } from "../lib/anthropic-retry";
import nodemailer from "nodemailer";
import { chromium } from "playwright";
import { getNextEmail } from "../icp/sequences";
import { wrapHtml } from "../icp/sequences/email-html";

const { leads } = schema;

// ── Args ──────────────────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (flag: string) => {
    const idx = args.indexOf(flag);
    return idx !== -1 ? args[idx + 1] : null;
  };
  return {
    dryRun: args.includes("--dry-run"),
    discoverOnly: args.includes("--discover-only"),
    emailOnly: args.includes("--email-only"),
    icpSlug: get("--icp") ?? null,
  };
}

// ── Discovery ─────────────────────────────────────────────────────────────────

async function discoverForIcp(niche: string, city: string, limit = 20): Promise<number> {
  try {
    const cmd = `npx tsx --env-file=.env.local scripts/discover.ts --niche "${niche}" --city "${city}" --limit ${limit}`;
    const out = execSync(cmd, { cwd: process.cwd(), encoding: "utf8" });
    const match = out.match(/\+(\d+) new leads/);
    return match ? parseInt(match[1]) : 0;
  } catch (err) {
    console.error(`  Discovery failed for ${city}: ${(err as Error).message}`);
    return 0;
  }
}

// ── Email scraping ────────────────────────────────────────────────────────────

const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
const SKIP_DOMAINS = [
  "sentry.io", "wixpress.com", "squarespace.com", "wordpress.com",
  "example.com", "yoursite.com", "email.com", "domain.com",
  "google.com", "facebook.com", "instagram.com", "yelp.com",
];

function isValidEmail(e: string) {
  const l = e.toLowerCase();
  if (SKIP_DOMAINS.some((d) => l.endsWith(`@${d}`))) return false;
  if (l.endsWith(".png") || l.endsWith(".jpg") || l.endsWith(".svg")) return false;
  return true;
}

async function scrapeEmail(website: string, page: import("playwright").Page) {
  const urls = [
    website,
    website.replace(/\/$/, "") + "/contact",
    website.replace(/\/$/, "") + "/contact-us",
    website.replace(/\/$/, "") + "/about",
  ];
  for (const url of urls) {
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 12000 });
      const emails = ((await page.content()).match(EMAIL_RE) ?? []).filter(isValidEmail);
      if (emails.length) return emails[0];
    } catch { /* skip */ }
  }
  return null;
}

// ── Email drafting ────────────────────────────────────────────────────────────

async function draftEmail(prompt: string, client: Anthropic) {
  const msg = await withRetry(() =>
    client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 900,
      messages: [{ role: "user", content: prompt }],
    }),
  );
  const text = msg.content[0].type === "text" ? msg.content[0].text.trim() : "";
  const lines = text.split("\n");
  const subject = (lines.find((l) => l.startsWith("Subject:")) ?? "")
    .replace("Subject:", "").trim();
  const body = lines.filter((l) => !l.startsWith("Subject:")).join("\n").trim();
  return {
    subject: subject || "Quick question about your website",
    body: wrapHtml(body),
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const { dryRun, discoverOnly, emailOnly, icpSlug } = parseArgs();

  if (dryRun) console.log("\n[DRY RUN — no emails will be sent]\n");

  const activeIcps = PIPELINE.filter(
    (icp) => icp.active && (!icpSlug || icp.slug === icpSlug)
  );

  if (activeIcps.length === 0) {
    console.log("No active ICPs found.");
    return;
  }

  console.log(`\n=== Pipeline run — ${new Date().toLocaleString()} ===`);
  console.log(`Active ICPs: ${activeIcps.map((i) => i.slug).join(", ")}\n`);

  const client = new Anthropic();
  const transporter = dryRun ? null : nodemailer.createTransport({
    service: "gmail",
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
  });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
  });
  const page = await context.newPage();

  for (const icp of activeIcps) {
    console.log(`\n── ICP: ${icp.slug} (target: ${icp.dailyTarget}/day) ──`);

    // ── 1. Discovery ──────────────────────────────────────────────────────────
    if (!emailOnly) {
      // Count unstarted leads for this ICP
      const all = await db.select().from(leads);
      const unstarted = all.filter(
        (l) => l.niche.toLowerCase().includes(icp.niche) && l.emailDay === 0 && l.website
      );

      const BUFFER = icp.dailyTarget * 3; // keep 3 days of leads in reserve

      if (unstarted.length < BUFFER) {
        const needed = BUFFER - unstarted.length;
        console.log(`  Pool low (${unstarted.length} unstarted). Discovering ~${needed} new leads...`);

        // Rotate through cities
        const cityIdx = Math.floor(Date.now() / 86400000) % icp.cities.length;
        const city = icp.cities[cityIdx];
        const perCity = Math.ceil(needed / 1);
        const found = await discoverForIcp(icp.niche, city, perCity);
        console.log(`  +${found} leads from ${city}`);
      } else {
        console.log(`  Pool healthy — ${unstarted.length} unstarted leads ready`);
      }
    }

    if (discoverOnly) continue;

    // ── 2. Email ──────────────────────────────────────────────────────────────
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const allLeads = await db.select().from(leads);

    const due = allLeads
      .filter((l) => {
        if (!l.website) return false;
        if (!getIcp(l)) return false; // no sequence for this niche
        if (l.emailDay >= 14) return false; // sequence done
        if (l.emailDay === 0) return true;  // never emailed
        return !l.lastEmailedAt || l.lastEmailedAt < yesterday;
      })
      .filter((l) => l.niche.toLowerCase().includes(icp.niche))
      .slice(0, icp.dailyTarget);

    console.log(`  ${due.length} leads due for email today`);

    let sent = 0;
    let noEmail = 0;

    for (const lead of due) {
      process.stdout.write(`  [${lead.id}] ${lead.businessName} (day ${lead.emailDay + 1}) — `);

      // Get or scrape email
      let emailAddress = lead.emailAddress;
      if (!emailAddress) {
        emailAddress = await scrapeEmail(lead.website!, page);
        if (!emailAddress) {
          console.log("no email, skipping");
          noEmail++;
          continue;
        }
      }

      // Get next email in sequence
      const next = getNextEmail(lead);
      if (!next) { console.log("sequence complete"); continue; }

      // Draft
      const { subject, body } = await draftEmail(next.prompt, client);

      if (dryRun) {
        console.log(`"${subject}" [dry run]`);
        continue;
      }

      // Send
      try {
        await transporter!.sendMail({
          from: `Jason Murphy <${process.env.GMAIL_USER}>`,
          to: emailAddress,
          subject,
          html: body,
        });

        await db.update(leads).set({
          emailDay: next.day,
          lastEmailedAt: new Date().toISOString(),
          emailAddress,
          updatedAt: new Date().toISOString(),
        }).where(eq(leads.id, lead.id));

        sent++;
        console.log(`sent ✓ — "${subject}"`);
      } catch (err) {
        console.log(`failed: ${(err as Error).message}`);
      }

      await new Promise((r) => setTimeout(r, 3000 + Math.random() * 2000));
    }

    console.log(`\n  Done: ${sent} sent, ${noEmail} no email found`);
  }

  await browser.close();
  console.log(`\n=== Pipeline complete — ${new Date().toLocaleString()} ===\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
