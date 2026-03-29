/**
 * scripts/sync-notion.ts
 *
 * Syncs leads from SQLite → Notion database.
 * Creates new pages for unseen leads; updates status on existing ones.
 *
 * Notion database must have these properties:
 *   Name         (title)
 *   Niche        (select)
 *   City         (rich_text)
 *   Phone        (phone_number)
 *   Website      (url)
 *   Address      (rich_text)
 *   Rating       (number)
 *   Reviews      (number)
 *   Status       (select)
 *   Place ID     (rich_text)  ← used as idempotency key
 *
 * Usage:
 *   npx tsx scripts/sync-notion.ts
 *   npx tsx scripts/sync-notion.ts --status draft_ready
 *   npx tsx scripts/sync-notion.ts --limit 50
 */

import "dotenv/config";
import { Client } from "@notionhq/client";
import { db, schema } from "../lib/db";
import { eq } from "drizzle-orm";

const { leads } = schema;

function parseArgs(): { status: string | null; limit: number } {
  const args = process.argv.slice(2);
  const get = (flag: string) => {
    const idx = args.indexOf(flag);
    return idx !== -1 ? args[idx + 1] : null;
  };
  return {
    status: get("--status"),
    limit: parseInt(get("--limit") ?? "100", 10),
  };
}

function statusColor(
  status: string
): "default" | "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red" {
  const map: Record<string, "default" | "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red"> = {
    discovered: "gray",
    matched: "blue",
    monitoring: "yellow",
    draft_ready: "orange",
    engaged: "green",
    rejected: "red",
  };
  return map[status] ?? "default";
}

function buildProperties(lead: typeof leads.$inferSelect) {
  return {
    Name: {
      title: [{ text: { content: lead.businessName } }],
    },
    Niche: {
      select: { name: lead.niche },
    },
    City: {
      rich_text: [{ text: { content: lead.city } }],
    },
    Phone: lead.phone
      ? { phone_number: lead.phone }
      : { phone_number: null },
    Website: lead.website
      ? { url: lead.website }
      : { url: null },
    Address: {
      rich_text: [{ text: { content: lead.address ?? "" } }],
    },
    Rating: lead.rating !== null
      ? { number: lead.rating }
      : { number: null },
    Reviews: lead.reviewCount !== null
      ? { number: lead.reviewCount }
      : { number: null },
    Status: {
      select: { name: lead.status, color: statusColor(lead.status) },
    },
    "Place ID": {
      rich_text: [{ text: { content: lead.placeId } }],
    },
  };
}

async function getExistingPages(
  notion: Client,
  databaseId: string
): Promise<Map<string, string>> {
  // Returns map of placeId → notionPageId
  const map = new Map<string, string>();
  let cursor: string | undefined;

  do {
    const res = await notion.databases.query({
      database_id: databaseId,
      start_cursor: cursor,
      page_size: 100,
    });

    for (const page of res.results) {
      if (page.object !== "page") continue;
      const props = (page as any).properties;
      const placeIdProp = props["Place ID"];
      if (placeIdProp?.rich_text?.[0]?.plain_text) {
        map.set(placeIdProp.rich_text[0].plain_text, page.id);
      }
    }

    cursor = res.has_more ? (res.next_cursor ?? undefined) : undefined;
  } while (cursor);

  return map;
}

async function main() {
  const { status, limit } = parseArgs();

  const notionToken = process.env.NOTION_TOKEN;
  const databaseId = process.env.NOTION_LEADS_DATABASE_ID;

  if (!notionToken) {
    console.error("NOTION_TOKEN not set in .env.local");
    process.exit(1);
  }
  if (!databaseId) {
    console.error("NOTION_LEADS_DATABASE_ID not set in .env.local");
    process.exit(1);
  }

  const notion = new Client({ auth: notionToken });

  // Fetch leads from SQLite
  const query = db.select().from(leads);
  const allLeads = status
    ? await query.where(eq(leads.status, status)).limit(limit)
    : await query.limit(limit);

  if (allLeads.length === 0) {
    console.log("No leads to sync.");
    return;
  }

  console.log(`\nSyncing ${allLeads.length} leads to Notion...`);

  // Fetch existing Notion pages to detect create vs update
  process.stdout.write("Fetching existing Notion pages... ");
  const existing = await getExistingPages(notion, databaseId);
  console.log(`${existing.size} found.\n`);

  let created = 0;
  let updated = 0;
  let errored = 0;

  for (const lead of allLeads) {
    process.stdout.write(`[${lead.id}] ${lead.businessName}... `);

    try {
      const properties = buildProperties(lead);
      const existingPageId = existing.get(lead.placeId);

      if (existingPageId) {
        await notion.pages.update({
          page_id: existingPageId,
          properties,
        });
        updated++;
        console.log("updated");
      } else {
        await notion.pages.create({
          parent: { database_id: databaseId },
          properties,
        });
        created++;
        console.log("created");
      }
    } catch (err) {
      errored++;
      console.log(`error: ${(err as Error).message}`);
    }

    // Stay within Notion rate limit (3 req/s)
    await new Promise((r) => setTimeout(r, 350));
  }

  console.log(`\nDone. +${created} created, ~${updated} updated, ${errored} errors.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
