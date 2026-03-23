/**
 * scripts/monitor.ts
 *
 * Checks matched social profiles for recent posts (last 7 days by default).
 * Uses saved Playwright browser sessions for LinkedIn and Facebook.
 *
 * Sessions are stored in ./sessions/ as browser storage state JSON files.
 * Run `npx tsx scripts/login.ts --platform linkedin` to create/refresh sessions.
 *
 * Usage:
 *   npx tsx scripts/monitor.ts
 *   npx tsx scripts/monitor.ts --platform linkedin --days 14
 */

import "dotenv/config";
import { chromium } from "playwright";
import path from "path";
import fs from "fs";
import { db, schema } from "../lib/db";
import { eq, and } from "drizzle-orm";

const { socialProfiles, posts, leads } = schema;

const SESSIONS_DIR = path.join(process.cwd(), "sessions");

interface ExtractedPost {
  postUrl: string;
  postText: string;
  postedAt: string | null;
}

// ── LinkedIn extractor ────────────────────────────────────────────────────────
async function extractLinkedInPosts(
  profileUrl: string,
  page: import("playwright").Page,
  cutoffDate: Date
): Promise<ExtractedPost[]> {
  const postsUrl = profileUrl.replace(/\/$/, "") + "/posts/";

  try {
    await page.goto(postsUrl, { waitUntil: "networkidle", timeout: 20000 });
    await page.waitForTimeout(2000);
  } catch {
    return [];
  }

  // Scroll once to load more posts
  await page.evaluate(() => window.scrollBy(0, 1500));
  await page.waitForTimeout(1500);

  const extracted: ExtractedPost[] = [];

  const postElements = await page.$$("div.feed-shared-update-v2");

  for (const el of postElements.slice(0, 10)) {
    try {
      const text = await el.$eval(
        ".feed-shared-inline-show-more-text, .feed-shared-text",
        (n) => n.textContent?.trim() ?? ""
      ).catch(() => "");

      const timeEl = await el.$("time");
      const datetime = timeEl ? await timeEl.getAttribute("datetime") : null;

      if (datetime) {
        const postDate = new Date(datetime);
        if (postDate < cutoffDate) continue;
      }

      // Try to get permalink
      const linkEl = await el.$("a.app-aware-link[href*='/feed/update/']");
      const href = linkEl ? await linkEl.getAttribute("href") : null;
      const postUrl = href ? href.split("?")[0] : `${profileUrl}#post-${Date.now()}`;

      if (text.length > 20) {
        extracted.push({
          postUrl,
          postText: text.slice(0, 2000),
          postedAt: datetime,
        });
      }
    } catch {
      // skip malformed post element
    }
  }

  return extracted;
}

// ── Facebook extractor ────────────────────────────────────────────────────────
async function extractFacebookPosts(
  profileUrl: string,
  page: import("playwright").Page,
  cutoffDate: Date
): Promise<ExtractedPost[]> {
  try {
    await page.goto(profileUrl, { waitUntil: "networkidle", timeout: 20000 });
    await page.waitForTimeout(2000);
  } catch {
    return [];
  }

  await page.evaluate(() => window.scrollBy(0, 1500));
  await page.waitForTimeout(1500);

  const extracted: ExtractedPost[] = [];

  // Facebook post containers typically have data-pagelet or role=article
  const articles = await page.$$("div[role='article']");

  for (const article of articles.slice(0, 10)) {
    try {
      const text = await article.$eval(
        "div[data-ad-comet-preview='message'], div[data-ad-preview='message']",
        (n) => n.textContent?.trim() ?? ""
      ).catch(async () => {
        // Fallback: grab all text content from the article
        return await article.evaluate((el) => el.textContent?.slice(0, 2000) ?? "");
      });

      const timeEl = await article.$("abbr[data-utime], a[role='link'] abbr");
      const utime = timeEl ? await timeEl.getAttribute("data-utime") : null;
      const datetime = utime ? new Date(parseInt(utime) * 1000).toISOString() : null;

      if (datetime) {
        const postDate = new Date(datetime);
        if (postDate < cutoffDate) continue;
      }

      const linkEl = await article.$("a[href*='/posts/'], a[href*='/permalink/']");
      const href = linkEl ? await linkEl.getAttribute("href") : null;
      const postUrl = href
        ? href.startsWith("http") ? href.split("?")[0] : `https://facebook.com${href.split("?")[0]}`
        : `${profileUrl}#post-${Date.now()}`;

      if (text.length > 20) {
        extracted.push({
          postUrl,
          postText: text.slice(0, 2000),
          postedAt: datetime,
        });
      }
    } catch {
      // skip
    }
  }

  return extracted;
}

function parseArgs(): { platform: "linkedin" | "facebook" | "all"; days: number } {
  const args = process.argv.slice(2);
  const get = (flag: string) => {
    const idx = args.indexOf(flag);
    return idx !== -1 ? args[idx + 1] : null;
  };
  const platform = (get("--platform") ?? "all") as "linkedin" | "facebook" | "all";
  const days = parseInt(get("--days") ?? "7", 10);
  return { platform, days };
}

async function main() {
  const { platform, days } = parseArgs();
  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  console.log(`\nMonitoring posts from the last ${days} days...`);

  const platformFilter =
    platform === "all" ? ["linkedin", "facebook"] : [platform];

  for (const plat of platformFilter) {
    const sessionFile = path.join(SESSIONS_DIR, `${plat}.json`);
    if (!fs.existsSync(sessionFile)) {
      console.warn(`\nNo session file for ${plat}. Run: npx tsx scripts/login.ts --platform ${plat}`);
      continue;
    }

    console.log(`\n── ${plat.toUpperCase()} ──`);

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      storageState: sessionFile,
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
    });
    const page = await context.newPage();

    // Get profiles for this platform
    const profiles = await db
      .select()
      .from(socialProfiles)
      .where(eq(socialProfiles.platform, plat));

    for (const profile of profiles) {
      process.stdout.write(`  ${profile.profileName ?? profile.profileUrl}... `);

      const extracted =
        plat === "linkedin"
          ? await extractLinkedInPosts(profile.profileUrl, page, cutoffDate)
          : await extractFacebookPosts(profile.profileUrl, page, cutoffDate);

      let newPosts = 0;
      for (const ep of extracted) {
        try {
          await db.insert(posts).values({
            socialProfileId: profile.id,
            postUrl: ep.postUrl,
            postText: ep.postText,
            postedAt: ep.postedAt,
          });
          newPosts++;
        } catch {
          // duplicate post_url — skip
        }
      }

      // Update last checked timestamp
      await db
        .update(socialProfiles)
        .set({ lastCheckedAt: new Date().toISOString() })
        .where(eq(socialProfiles.id, profile.id));

      // Advance lead status if we found posts
      if (newPosts > 0) {
        await db
          .update(leads)
          .set({ status: "monitoring", updatedAt: new Date().toISOString() })
          .where(eq(leads.id, profile.leadId));
      }

      console.log(`${newPosts} new posts`);
      await new Promise((r) => setTimeout(r, 800));
    }

    await browser.close();
  }

  console.log("\nMonitoring complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
