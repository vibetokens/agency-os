/**
 * scripts/match-social.ts
 *
 * Attempts to find LinkedIn/Facebook pages for discovered leads.
 *
 * Strategy (in order):
 *   1. Scrape the business website for social links
 *   2. Fall back to a Google search: site:linkedin.com/company "<name>"
 *
 * Usage:
 *   npx tsx scripts/match-social.ts
 *   npx tsx scripts/match-social.ts --limit 10
 */

import "dotenv/config";
import { chromium } from "playwright";
import { db, schema } from "../lib/db";
import { eq, and, isNull } from "drizzle-orm";

const { leads, socialProfiles } = schema;

const LINKEDIN_RE = /https?:\/\/(www\.)?linkedin\.com\/company\/[^"'\s>]+/gi;
const FACEBOOK_RE = /https?:\/\/(www\.)?facebook\.com\/[^"'\s>/?]+/gi;

function extractSocialLinks(html: string): {
  linkedin: string[];
  facebook: string[];
} {
  const linkedin = [...new Set([...(html.match(LINKEDIN_RE) ?? [])])].map(clean);
  const facebook = [...new Set([...(html.match(FACEBOOK_RE) ?? [])])].map(clean);
  return { linkedin, facebook };
}

function clean(url: string): string {
  // Strip trailing slashes and tracking params
  return url.split("?")[0].replace(/\/$/, "");
}

function isPersonalFB(url: string): boolean {
  // Skip profile.php and short numeric IDs — we want pages, not personal accounts
  return url.includes("profile.php") || /facebook\.com\/\d+$/.test(url);
}

async function scrapeWebsite(
  url: string,
  page: import("playwright").Page
): Promise<{ linkedin: string[]; facebook: string[] }> {
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });
    const html = await page.content();
    return extractSocialLinks(html);
  } catch {
    return { linkedin: [], facebook: [] };
  }
}

async function googleFallback(
  businessName: string,
  platform: "linkedin" | "facebook",
  page: import("playwright").Page
): Promise<string | null> {
  const query =
    platform === "linkedin"
      ? `site:linkedin.com/company "${businessName}"`
      : `site:facebook.com "${businessName}" business page`;

  try {
    await page.goto(
      `https://www.google.com/search?q=${encodeURIComponent(query)}`,
      { waitUntil: "domcontentloaded", timeout: 15000 }
    );

    // Grab first result link matching the platform
    const re = platform === "linkedin" ? LINKEDIN_RE : FACEBOOK_RE;
    const html = await page.content();
    const matches = html.match(re);
    if (!matches) return null;

    const candidates = [...new Set(matches)].map(clean);
    if (platform === "facebook") {
      return candidates.find((u) => !isPersonalFB(u)) ?? null;
    }
    return candidates[0] ?? null;
  } catch {
    return null;
  }
}

function parseArgs(): { limit: number } {
  const args = process.argv.slice(2);
  const idx = args.indexOf("--limit");
  return { limit: idx !== -1 ? parseInt(args[idx + 1], 10) : 50 };
}

async function main() {
  const { limit } = parseArgs();

  // Leads that are "discovered" and have a website but no social profiles yet
  const unmatched = await db
    .select()
    .from(leads)
    .where(
      and(
        eq(leads.status, "discovered"),
        // Has website (not null) — using isNull negated isn't ideal,
        // but drizzle doesn't have isNotNull in older versions
        // We filter in JS below for clarity
      )
    )
    .limit(limit * 2); // fetch more, filter in JS

  const toProcess = unmatched
    .filter((l) => l.website)
    .slice(0, limit);

  if (toProcess.length === 0) {
    console.log("No unmatched leads with websites found.");
    return;
  }

  console.log(`\nMatching social profiles for ${toProcess.length} leads...\n`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
  });
  const page = await context.newPage();

  let matched = 0;

  for (const lead of toProcess) {
    console.log(`[${lead.id}] ${lead.businessName} — ${lead.website}`);
    const found: Array<{ platform: "linkedin" | "facebook"; url: string; method: string }> = [];

    // Step 1: scrape website
    const { linkedin, facebook } = await scrapeWebsite(lead.website!, page);

    for (const url of linkedin) {
      found.push({ platform: "linkedin", url, method: "site_link" });
    }
    for (const url of facebook.filter((u) => !isPersonalFB(u))) {
      found.push({ platform: "facebook", url, method: "site_link" });
    }

    // Step 2: Google fallback for missing platforms
    const hasLI = found.some((f) => f.platform === "linkedin");
    const hasFB = found.some((f) => f.platform === "facebook");

    if (!hasLI) {
      const url = await googleFallback(lead.businessName, "linkedin", page);
      if (url) found.push({ platform: "linkedin", url, method: "google_search" });
    }
    if (!hasFB) {
      const url = await googleFallback(lead.businessName, "facebook", page);
      if (url) found.push({ platform: "facebook", url, method: "google_search" });
    }

    // Insert found profiles (skip duplicates)
    for (const f of found) {
      try {
        await db.insert(socialProfiles).values({
          leadId: lead.id,
          platform: f.platform,
          profileUrl: f.url,
          matchMethod: f.method,
        });
        process.stdout.write(` +${f.platform}`);
      } catch {
        // unique constraint — already exists
      }
    }

    if (found.length > 0) {
      matched++;
      await db
        .update(leads)
        .set({ status: "matched", updatedAt: new Date().toISOString() })
        .where(eq(leads.id, lead.id));
    }

    console.log();
    await new Promise((r) => setTimeout(r, 500));
  }

  await browser.close();
  console.log(`\nDone. ${matched}/${toProcess.length} leads matched to social profiles.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
