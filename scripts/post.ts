/**
 * scripts/post.ts
 *
 * Posts approved comments via Playwright.
 * Reads approved comments from DB, posts them, marks as "posted".
 * Hard cap: 10 comments per run (5 per platform) to stay under ToS radar.
 *
 * Usage:
 *   npx tsx scripts/post.ts
 *   npx tsx scripts/post.ts --dry-run   (logs what would be posted, no actual posting)
 */

import "dotenv/config";
import { chromium } from "playwright";
import path from "path";
import fs from "fs";
import { db, schema } from "../lib/db";
import { eq, and } from "drizzle-orm";

const { comments, posts, socialProfiles, leads } = schema;

const SESSIONS_DIR = path.join(process.cwd(), "sessions");
const MAX_PER_PLATFORM = 5;

function parseArgs(): { dryRun: boolean } {
  return { dryRun: process.argv.includes("--dry-run") };
}

async function postToLinkedIn(
  page: import("playwright").Page,
  postUrl: string,
  commentText: string
): Promise<boolean> {
  try {
    await page.goto(postUrl, { waitUntil: "networkidle", timeout: 20000 });
    await page.waitForTimeout(2000);

    // Click the comment button
    const commentBtn = await page.$("button.comment-button, button[aria-label*='comment' i]");
    if (!commentBtn) {
      console.log("  (could not find comment button)");
      return false;
    }
    await commentBtn.click();
    await page.waitForTimeout(1000);

    // Type into the comment editor
    const editor = await page.$("div.ql-editor[contenteditable='true'], div[role='textbox']");
    if (!editor) {
      console.log("  (could not find comment editor)");
      return false;
    }
    await editor.click();
    await editor.type(commentText, { delay: 30 });
    await page.waitForTimeout(500);

    // Submit
    const submitBtn = await page.$(
      "button.comments-comment-box__submit-button, button[type='submit']"
    );
    if (!submitBtn) {
      console.log("  (could not find submit button)");
      return false;
    }
    await submitBtn.click();
    await page.waitForTimeout(2000);

    return true;
  } catch (err) {
    console.log(`  error: ${(err as Error).message}`);
    return false;
  }
}

async function postToFacebook(
  page: import("playwright").Page,
  postUrl: string,
  commentText: string
): Promise<boolean> {
  try {
    await page.goto(postUrl, { waitUntil: "networkidle", timeout: 20000 });
    await page.waitForTimeout(2000);

    // Click "Write a comment..." placeholder
    const commentArea = await page.$(
      "div[aria-label='Write a comment…'], div[data-testid='UFI2CommentInputField/root']"
    );
    if (!commentArea) {
      console.log("  (could not find comment area)");
      return false;
    }
    await commentArea.click();
    await page.waitForTimeout(800);

    await page.keyboard.type(commentText, { delay: 30 });
    await page.waitForTimeout(500);

    // Enter submits on Facebook
    await page.keyboard.press("Enter");
    await page.waitForTimeout(2000);

    return true;
  } catch (err) {
    console.log(`  error: ${(err as Error).message}`);
    return false;
  }
}

async function main() {
  const { dryRun } = parseArgs();

  if (dryRun) console.log("\n[DRY RUN — no comments will actually be posted]\n");

  // Get approved comments
  const approved = await db
    .select({
      comment: comments,
      post: posts,
      profile: socialProfiles,
      lead: leads,
    })
    .from(comments)
    .innerJoin(posts, eq(comments.postId, posts.id))
    .innerJoin(socialProfiles, eq(posts.socialProfileId, socialProfiles.id))
    .innerJoin(leads, eq(socialProfiles.leadId, leads.id))
    .where(eq(comments.status, "approved"))
    .limit(MAX_PER_PLATFORM * 2);

  if (approved.length === 0) {
    console.log("No approved comments to post.");
    return;
  }

  // Split by platform, cap each
  const byPlatform = {
    linkedin: approved.filter((r) => r.profile.platform === "linkedin").slice(0, MAX_PER_PLATFORM),
    facebook: approved.filter((r) => r.profile.platform === "facebook").slice(0, MAX_PER_PLATFORM),
  };

  console.log(
    `\nPosting: ${byPlatform.linkedin.length} LinkedIn, ${byPlatform.facebook.length} Facebook`
  );

  for (const [platform, rows] of Object.entries(byPlatform)) {
    if (rows.length === 0) continue;

    const sessionFile = path.join(SESSIONS_DIR, `${platform}.json`);
    if (!fs.existsSync(sessionFile)) {
      console.warn(`No session for ${platform}. Run: npx tsx scripts/login.ts --platform ${platform}`);
      continue;
    }

    console.log(`\n── ${platform.toUpperCase()} ──`);

    const browser = await chromium.launch({ headless: !dryRun });
    const context = await browser.newContext({
      storageState: sessionFile,
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
    });
    const page = await context.newPage();

    for (const row of rows) {
      const text = row.comment.editedDraft ?? row.comment.draft;
      console.log(`\n  [${row.comment.id}] ${row.lead.businessName}`);
      console.log(`  Post: ${row.post.postUrl}`);
      console.log(`  Comment: "${text.slice(0, 80)}..."`);

      if (dryRun) continue;

      const success =
        platform === "linkedin"
          ? await postToLinkedIn(page, row.post.postUrl, text)
          : await postToFacebook(page, row.post.postUrl, text);

      if (success) {
        await db
          .update(comments)
          .set({ status: "posted", postedAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
          .where(eq(comments.id, row.comment.id));

        await db
          .update(leads)
          .set({ status: "engaged", updatedAt: new Date().toISOString() })
          .where(eq(leads.id, row.lead.id));

        console.log("  ✓ Posted");
      }

      // Human-paced delay between posts (30-60s range)
      const delay = 30000 + Math.random() * 30000;
      if (!dryRun) {
        console.log(`  Waiting ${Math.round(delay / 1000)}s before next post...`);
        await new Promise((r) => setTimeout(r, delay));
      }
    }

    await browser.close();
  }

  console.log("\nPost run complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
