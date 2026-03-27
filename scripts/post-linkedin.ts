/**
 * scripts/post-linkedin.ts
 *
 * Posts staged LinkedIn content via Playwright CDP.
 * Reads from pending-linkedin.txt (written by publish-post.ts).
 * Connects to Chrome on port 9222 — requires launch-chrome-debug.bat running.
 *
 * Usage:
 *   npm run post-linkedin
 *   npm run post-linkedin -- --text "Custom post text here"
 */

import "dotenv/config";
import { chromium } from "playwright";
import fs from "fs";
import path from "path";

async function postToLinkedIn(text: string): Promise<void> {
  // Connect to existing Chrome via CDP
  const browser = await chromium.connectOverCDP("http://localhost:9222");
  const contexts = browser.contexts();
  const context = contexts[0] ?? await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto("https://www.linkedin.com/feed/", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);

    // Close any blocking dialog
    const dialog = page.locator("dialog[open]");
    if (await dialog.count() > 0) {
      await page.keyboard.press("Escape");
      await page.waitForTimeout(800);
    }

    await page.getByRole("button", { name: /start a post/i }).click();
    await page.waitForTimeout(2000);

    const editor = page.getByRole("textbox", { name: /text editor for creating content/i });
    await editor.waitFor({ timeout: 10000 });
    await editor.click();
    await page.waitForTimeout(400);
    await editor.fill(text);
    await page.waitForTimeout(800);

    await page.getByRole("button", { name: /^post$/i }).click();
    await page.waitForTimeout(4000);

    console.log("  ✓ Posted to LinkedIn");
  } finally {
    await page.close();
    await browser.close();
  }
}

async function main() {
  const args = process.argv.slice(2);
  const textArg = args.indexOf("--text") !== -1 ? args[args.indexOf("--text") + 1] : null;

  let text: string;

  if (textArg) {
    text = textArg;
  } else {
    // Read from staged file
    const pendingFile = path.join(process.cwd(), "pending-linkedin.txt");
    if (!fs.existsSync(pendingFile)) {
      console.error("No pending-linkedin.txt found. Run publish-post first.");
      process.exit(1);
    }
    const data = JSON.parse(fs.readFileSync(pendingFile, "utf8"));
    text = data.post;
    console.log(`\nPosting LinkedIn for: "${data.title}"`);

    // Clear the pending file after reading
    fs.unlinkSync(pendingFile);
  }

  await postToLinkedIn(text);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
