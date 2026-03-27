/**
 * scripts/log-deal.ts
 *
 * Revenue tracker CLI — log deals, view MRR, manage client records.
 *
 * Usage:
 *   npm run log-deal -- --list
 *   npm run log-deal -- --client "Beyond Care HC" --type growth_retainer --amount 800 --monthly --contact "Sarah Atkin" --email satkin@beyondcarehc.com
 *   npm run log-deal -- --client "Ilya's Tree Service" --type starter_site --amount 1500 --one-time --contact "Ilya Shpilman"
 *   npm run log-deal -- --seed       ← seeds known clients from memory
 *   npm run log-deal -- --touch "Beyond Care HC" --note "Sent revised homepage mockup"
 *   npm run log-deal -- --next "Beyond Care HC" --action "Follow up on blog content approval"
 */

import "dotenv/config";
import { db, schema } from "../lib/db";
import { eq } from "drizzle-orm";

const { clients, deals } = schema;

// ── Args ──────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const flag = (f: string) => args.includes(f);
const arg = (f: string) => {
  const i = args.indexOf(f);
  return i !== -1 && args[i + 1] ? args[i + 1] : null;
};

// ── Create tables if missing ──────────────────────────────────────────────────

function migrate() {
  const raw = (db as any).session?.client ?? (db as any).$client;
  // Use better-sqlite3 directly via drizzle internals
  const sqlite = (db as any).session?.db ?? (db as any)._session?.db;
  if (!sqlite) {
    // Fallback: try to import and open directly
    return;
  }
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      contact TEXT,
      email TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      mrr REAL NOT NULL DEFAULT 0,
      notes TEXT,
      last_touch_at TEXT,
      next_action TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS deals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER REFERENCES clients(id),
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      billing_type TEXT NOT NULL DEFAULT 'one_time',
      status TEXT NOT NULL DEFAULT 'active',
      closed_at TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function ensureTables() {
  try {
    await db.select().from(clients).limit(1);
  } catch {
    // Tables don't exist — create via raw SQL
    const Database = require("better-sqlite3");
    const path = require("path");
    const sqlite = new Database(path.join(process.cwd(), "outreach.db"));
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS clients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        contact TEXT,
        email TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        mrr REAL NOT NULL DEFAULT 0,
        notes TEXT,
        last_touch_at TEXT,
        next_action TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS deals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER REFERENCES clients(id),
        type TEXT NOT NULL,
        amount REAL NOT NULL,
        billing_type TEXT NOT NULL DEFAULT 'one_time',
        status TEXT NOT NULL DEFAULT 'active',
        closed_at TEXT,
        notes TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);
    sqlite.close();
    console.log("✓ Revenue tables created.");
  }
}

async function getOrCreateClient(name: string, contact?: string | null, email?: string | null): Promise<typeof clients.$inferSelect> {
  const existing = await db.select().from(clients).where(eq(clients.name, name));
  if (existing.length > 0) return existing[0];
  const [created] = await db.insert(clients).values({
    name,
    contact: contact ?? null,
    email: email ?? null,
    status: "active",
    mrr: 0,
  }).returning();
  return created;
}

// ── List command ──────────────────────────────────────────────────────────────

async function listAll() {
  const allClients = await db.select().from(clients).where(eq(clients.status, "active"));
  const allDeals = await db.select().from(deals);

  const mrr = allClients.reduce((sum, c) => sum + (c.mrr ?? 0), 0);
  const TARGET = 50000;
  const gap = TARGET - mrr;

  console.log("\n╔══════════════════════════════════════════════════════╗");
  console.log("║  VIBE TOKENS — REVENUE DASHBOARD                    ║");
  console.log("╚══════════════════════════════════════════════════════╝");
  console.log(`\n  MRR:     $${mrr.toLocaleString()}/mo`);
  console.log(`  Target:  $${TARGET.toLocaleString()}/mo`);
  console.log(`  Gap:     $${gap.toLocaleString()} — need ${Math.ceil(gap / 800)} more retainers or ${Math.ceil(gap / 2500)} consulting closes`);

  if (allClients.length === 0) {
    console.log("\n  No active clients. Run --seed to add known clients.\n");
    return;
  }

  console.log(`\n  ACTIVE CLIENTS (${allClients.length})`);
  console.log("  " + "─".repeat(50));
  for (const c of allClients) {
    const clientDeals = allDeals.filter(d => d.clientId === c.id);
    const mrrLabel = c.mrr > 0 ? `$${c.mrr}/mo` : "no MRR";
    const touch = c.lastTouchAt ? `last touch: ${c.lastTouchAt.slice(0, 10)}` : "no touch recorded";
    console.log(`\n  ${c.name} — ${mrrLabel}`);
    if (c.contact) console.log(`    Contact:  ${c.contact}${c.email ? ` · ${c.email}` : ""}`);
    console.log(`    Status:   ${touch}`);
    if (c.nextAction) console.log(`    Next:     ${c.nextAction}`);
    if (clientDeals.length > 0) {
      console.log("    Deals:");
      clientDeals.forEach(d => {
        const closed = d.closedAt ? d.closedAt.slice(0, 10) : "open";
        console.log(`      • ${d.type} — $${d.amount} (${d.billingType}) — ${d.status} — ${closed}`);
      });
    }
  }

  // One-time deals
  const oneTimeTotal = allDeals
    .filter(d => d.billingType === "one_time" && d.status === "active")
    .reduce((sum, d) => sum + d.amount, 0);
  if (oneTimeTotal > 0) {
    console.log(`\n  One-time revenue logged: $${oneTimeTotal.toLocaleString()}`);
  }

  console.log("\n" + "─".repeat(54));
  console.log(`  Path to target: ${Math.ceil(gap / 800)} retainers × $800 OR ${Math.ceil(gap / 2500)} consulting closes × $2,500`);
  console.log("");
}

// ── Seed command ──────────────────────────────────────────────────────────────

async function seed() {
  console.log("\nSeeding known clients...");

  // Beyond Care HC
  const bcId = await getOrCreateClient("Beyond Care HC", "Sarah Atkin", "satkin@beyondcarehc.com");
  await db.update(clients).set({ mrr: 800, lastTouchAt: new Date().toISOString(), nextAction: "Follow up on content approval", updatedAt: new Date().toISOString() }).where(eq(clients.id, bcId.id));
  const bcDealExists = await db.select().from(deals).where(eq(deals.clientId, bcId.id));
  if (bcDealExists.length === 0) {
    await db.insert(deals).values({ clientId: bcId.id, type: "growth_retainer", amount: 800, billingType: "monthly", status: "active", closedAt: "2025-12-01" });
  }
  console.log("  ✓ Beyond Care HC — $800/mo");

  // Mavon Beauty
  const mavonId = await getOrCreateClient("Mavon Beauty", "Erica Fontaine", null);
  await db.update(clients).set({ mrr: 800, lastTouchAt: new Date().toISOString(), nextAction: "Send updated product page mockup", updatedAt: new Date().toISOString() }).where(eq(clients.id, mavonId.id));
  const mavonDealExists = await db.select().from(deals).where(eq(deals.clientId, mavonId.id));
  if (mavonDealExists.length === 0) {
    await db.insert(deals).values({ clientId: mavonId.id, type: "growth_retainer", amount: 800, billingType: "monthly", status: "active", closedAt: "2026-01-15" });
  }
  console.log("  ✓ Mavon Beauty — $800/mo");

  // Ilya's Tree Service
  const ilyaId = await getOrCreateClient("Ilya's Tree Service", "Ilya Shpilman", null);
  await db.update(clients).set({ mrr: 800, lastTouchAt: new Date().toISOString(), nextAction: "Check in on SEO results, ask for updated testimonial", updatedAt: new Date().toISOString() }).where(eq(clients.id, ilyaId.id));
  const ilyaDealExists = await db.select().from(deals).where(eq(deals.clientId, ilyaId.id));
  if (ilyaDealExists.length === 0) {
    await db.insert(deals).values([
      { clientId: ilyaId.id, type: "starter_site", amount: 1500, billingType: "one_time", status: "completed", closedAt: "2025-11-01" },
      { clientId: ilyaId.id, type: "growth_retainer", amount: 800, billingType: "monthly", status: "active", closedAt: "2025-11-15" },
    ]);
  }
  console.log("  ✓ Ilya's Tree Service — $800/mo + $1,500 site");

  console.log("\n  MRR seeded: $2,400/mo from 3 active clients.");
  console.log("  Gap to $50k: $47,600 — 60 more retainers or combination of consulting closes.\n");
}

// ── Touch command ─────────────────────────────────────────────────────────────

async function touch(name: string, note: string) {
  const rows = await db.select().from(clients);
  const match = rows.find(c => c.name.toLowerCase().includes(name.toLowerCase()));
  if (!match) { console.error(`Client not found: ${name}`); process.exit(1); }
  await db.update(clients).set({
    lastTouchAt: new Date().toISOString(),
    notes: note,
    updatedAt: new Date().toISOString(),
  }).where(eq(clients.id, match.id));
  console.log(`✓ Logged touch for ${match.name}: "${note}"`);
}

// ── Next action command ───────────────────────────────────────────────────────

async function setNext(name: string, action: string) {
  const rows = await db.select().from(clients);
  const match = rows.find(c => c.name.toLowerCase().includes(name.toLowerCase()));
  if (!match) { console.error(`Client not found: ${name}`); process.exit(1); }
  await db.update(clients).set({ nextAction: action, updatedAt: new Date().toISOString() }).where(eq(clients.id, match.id));
  console.log(`✓ Next action set for ${match.name}: "${action}"`);
}

// ── Add deal command ──────────────────────────────────────────────────────────

async function addDeal() {
  const clientName = arg("--client");
  const type = arg("--type");
  const amountStr = arg("--amount");
  const contact = arg("--contact");
  const email = arg("--email");

  if (!clientName || !type || !amountStr) {
    console.error("Usage: --client <name> --type <type> --amount <amount> [--monthly|--one-time] [--contact <name>] [--email <email>]");
    process.exit(1);
  }

  const amount = parseFloat(amountStr);
  const billingType = flag("--monthly") ? "monthly" : "one_time";
  const client = await getOrCreateClient(clientName, contact, email);

  if (billingType === "monthly") {
    // Update client MRR
    await db.update(clients).set({
      mrr: (client.mrr ?? 0) + amount,
      contact: contact ?? client.contact,
      email: email ?? client.email,
      updatedAt: new Date().toISOString(),
    }).where(eq(clients.id, client.id));
  }

  await db.insert(deals).values({
    clientId: client.id,
    type,
    amount,
    billingType,
    status: "active",
    closedAt: new Date().toISOString(),
  });

  console.log(`✓ Deal logged: ${clientName} — ${type} — $${amount} (${billingType})`);
  if (billingType === "monthly") {
    const updated = await db.select().from(clients).where(eq(clients.id, client.id));
    console.log(`  New MRR for ${clientName}: $${updated[0].mrr}/mo`);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  await ensureTables();

  if (flag("--list")) return listAll();
  if (flag("--seed")) return seed();

  const touchName = arg("--touch");
  const touchNote = arg("--note");
  if (touchName && touchNote) return touch(touchName, touchNote);

  const nextName = arg("--next");
  const nextAction = arg("--action");
  if (nextName && nextAction) return setNext(nextName, nextAction);

  if (arg("--client")) return addDeal();

  // Default: show list
  return listAll();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
