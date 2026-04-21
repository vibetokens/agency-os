import { config as dotenvConfig } from "dotenv";
dotenvConfig({ path: ".env.local", override: true });
import { chromium } from "playwright";
import { db, schema } from "../lib/db";
import { eq, isNull, and, ne } from "drizzle-orm";

const { leads } = schema;
const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
const SKIP = ["example.com","yoursite.com","email.com","domain.com","sentry.io","wixpress.com","googleapis.com","schema.org","wordpress.org","w3.org","googleusercontent.com","gstatic.com"];

function isValid(email: string): boolean {
  const lower = email.toLowerCase();
  return !SKIP.some(d => lower.endsWith(d)) && !lower.includes("@2x") && !lower.includes("@3x");
}

async function main() {
  const toEnrich = await db.select().from(leads)
    .where(and(isNull(leads.emailAddress), ne(leads.website, "")))
    .limit(100);

  console.log(`Enriching ${toEnrich.length} leads...\n`);
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0" });
  const page = await ctx.newPage();
  let found = 0;

  for (const lead of toEnrich) {
    const site = lead.website!;
    const urls = [site, site.replace(/\/$/, "") + "/contact", site.replace(/\/$/, "") + "/contact-us", site.replace(/\/$/, "") + "/about", site.replace(/\/$/, "") + "/about-us", site.replace(/\/$/, "") + "/our-team", site.replace(/\/$/, "") + "/meet-us"];
    let email: string | null = null;
    for (const url of urls) {
      try {
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 8000 });
        const html = await page.content();
        const matches = (html.match(EMAIL_RE) ?? []).filter(isValid);
        if (matches.length) { email = matches[0]; break; }
        // Also check mailto: hrefs that might be obfuscated in text but present in DOM
        const mailtoEmail = await page.evaluate(() => {
          const links = document.querySelectorAll('a[href^="mailto:"]');
          for (const link of links) {
            const href = link.getAttribute('href');
            if (href) return href.replace('mailto:', '').split('?')[0];
          }
          return null;
        });
        if (mailtoEmail && isValid(mailtoEmail)) { email = mailtoEmail; break; }
      } catch {}
    }
    if (email) {
      await db.update(leads).set({ emailAddress: email, updatedAt: new Date().toISOString() }).where(eq(leads.id, lead.id));
      found++;
      console.log(`✓ ${lead.businessName} → ${email}`);
    } else {
      process.stdout.write("·");
    }
  }

  await browser.close();
  console.log(`\n\nDone. Found ${found} emails out of ${toEnrich.length} leads.`);
}

main().catch(console.error);
