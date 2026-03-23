/**
 * scripts/login.ts
 *
 * Interactive login to LinkedIn or Facebook. Saves browser storage state
 * to ./sessions/<platform>.json for use by monitor.ts and post.ts.
 *
 * Run headed so you can handle 2FA manually:
 *   npx tsx scripts/login.ts --platform linkedin
 *   npx tsx scripts/login.ts --platform facebook
 */

import "dotenv/config";
import { chromium } from "playwright";
import path from "path";
import fs from "fs";

const SESSIONS_DIR = path.join(process.cwd(), "sessions");

function parseArgs(): { platform: "linkedin" | "facebook" } {
  const args = process.argv.slice(2);
  const idx = args.indexOf("--platform");
  const platform = idx !== -1 ? args[idx + 1] : null;

  if (platform !== "linkedin" && platform !== "facebook") {
    console.error("Usage: npx tsx scripts/login.ts --platform <linkedin|facebook>");
    process.exit(1);
  }

  return { platform: platform as "linkedin" | "facebook" };
}

async function loginLinkedIn(page: import("playwright").Page) {
  const email = process.env.LINKEDIN_EMAIL!;
  const password = process.env.LINKEDIN_PASSWORD!;

  await page.goto("https://www.linkedin.com/login");
  await page.fill("#username", email);
  await page.fill("#password", password);
  await page.click("[type=submit]");

  console.log("\nLogging in to LinkedIn...");
  console.log("If 2FA is required, complete it in the browser window.");
  console.log("Press Enter here when you are fully logged in and on the LinkedIn feed.");

  await waitForEnter();
}

async function loginFacebook(page: import("playwright").Page) {
  const email = process.env.FACEBOOK_EMAIL!;
  const password = process.env.FACEBOOK_PASSWORD!;

  await page.goto("https://www.facebook.com/login");
  await page.fill("#email", email);
  await page.fill("#pass", password);
  await page.click("[name=login]");

  console.log("\nLogging in to Facebook...");
  console.log("If 2FA is required, complete it in the browser window.");
  console.log("Press Enter here when you are fully logged in and on the Facebook feed.");

  await waitForEnter();
}

function waitForEnter(): Promise<void> {
  return new Promise((resolve) => {
    process.stdin.resume();
    process.stdin.once("data", () => {
      process.stdin.pause();
      resolve();
    });
  });
}

async function main() {
  const { platform } = parseArgs();

  if (!process.env[`${platform.toUpperCase()}_EMAIL`]) {
    console.error(`${platform.toUpperCase()}_EMAIL not set in .env.local`);
    process.exit(1);
  }

  if (!fs.existsSync(SESSIONS_DIR)) {
    fs.mkdirSync(SESSIONS_DIR, { recursive: true });
  }

  const sessionFile = path.join(SESSIONS_DIR, `${platform}.json`);

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  if (platform === "linkedin") {
    await loginLinkedIn(page);
  } else {
    await loginFacebook(page);
  }

  await context.storageState({ path: sessionFile });
  console.log(`\nSession saved to ${sessionFile}`);

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
