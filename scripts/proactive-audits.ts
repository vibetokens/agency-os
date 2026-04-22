/**
 * scripts/proactive-audits.ts
 *
 * Runs proactive brand audits for leads in the pipeline who have:
 *   - A valid email
 *   - A valid website
 *   - Already received Day 1 cold email (warm enough)
 *   - Not been audited yet
 *
 * Each audit sends a branded report email automatically via the VT audit pipeline.
 * This replaces cold email as the primary outbound value delivery mechanism.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/proactive-audits.ts
 *   npx tsx --env-file=.env.local scripts/proactive-audits.ts --limit 5
 *   npx tsx --env-file=.env.local scripts/proactive-audits.ts --niche "med spa"
 *   npx tsx --env-file=.env.local scripts/proactive-audits.ts --dry-run
 */

import { config as dotenvConfig } from "dotenv";
dotenvConfig({ path: ".env.local", override: true });

import Database from "better-sqlite3";

const db = new Database("outreach.db");

const AUDIT_API = "https://www.vibetokens.io/api/audit/start";

// Parse args
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const limitIdx = args.indexOf("--limit");
const limit = limitIdx >= 0 ? parseInt(args[limitIdx + 1]) || 10 : 10;
const nicheIdx = args.indexOf("--niche");
const nicheFilter = nicheIdx >= 0 ? args[nicheIdx + 1] : null;

// Emails that are clearly scraped junk
const JUNK_DOMAINS = [
  "sentry", "criteo", "wixpress", "godaddy", "example.com",
  "yoursite.com", "email.com", "domain.com",
];

function isJunkEmail(email: string): boolean {
  return JUNK_DOMAINS.some((d) => email.toLowerCase().includes(d));
}

function extractState(city: string): string {
  const parts = city.split(" ");
  return parts[parts.length - 1] || "FL";
}

function extractCity(city: string): string {
  const parts = city.split(" ");
  return parts.slice(0, -1).join(" ") || city;
}

async function main() {
  // Find leads that haven't been proactively audited
  let query = `
    SELECT id, business_name, city, website, email_address, niche
    FROM leads
    WHERE email_address IS NOT NULL
      AND website IS NOT NULL AND website != ''
      AND email_day >= 1
      AND bounced_at IS NULL
  `;
  if (nicheFilter) {
    query += ` AND niche = '${nicheFilter}'`;
  }
  query += ` ORDER BY RANDOM() LIMIT ${limit}`;

  const leads = db.prepare(query).all() as Array<{
    id: number;
    business_name: string;
    city: string;
    website: string;
    email_address: string;
    niche: string;
  }>;

  console.log(`Found ${leads.length} leads for proactive audits${nicheFilter ? ` (niche: ${nicheFilter})` : ""}${dryRun ? " [DRY RUN]" : ""}\n`);

  let sent = 0;
  let skipped = 0;

  for (const lead of leads) {
    if (isJunkEmail(lead.email_address)) {
      console.log(`  ✗ ${lead.business_name} — junk email (${lead.email_address})`);
      skipped++;
      continue;
    }

    const city = extractCity(lead.city);
    const state = extractState(lead.city);
    const url = lead.website.replace(/\?.*$/, ""); // strip UTM params

    if (dryRun) {
      console.log(`  [dry] ${lead.business_name} | ${city}, ${state} | ${lead.email_address} | ${url}`);
      sent++;
      continue;
    }

    try {
      const res = await fetch(AUDIT_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: lead.business_name,
          websiteUrl: url,
          city,
          state,
          email: lead.email_address,
        }),
      });

      const data = await res.json() as { slug?: string; status?: string; error?: string };

      if (data.slug) {
        console.log(`  ✓ ${lead.business_name} → ${data.slug} (${data.status})`);
        sent++;
      } else {
        console.log(`  ✗ ${lead.business_name} — ${data.error || "unknown error"}`);
        skipped++;
      }

      // Space requests 5 seconds apart to avoid overwhelming the audit pipeline
      await new Promise((r) => setTimeout(r, 5000));
    } catch (err) {
      console.log(`  ✗ ${lead.business_name} — ${err instanceof Error ? err.message : "fetch failed"}`);
      skipped++;
    }
  }

  console.log(`\nDone. ${sent} audits fired, ${skipped} skipped.`);
}

main().catch(console.error);
