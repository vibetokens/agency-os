/**
 * scripts/send-brief.ts
 *
 * CEO Morning OS — fires at 5:45am and 2pm.
 * Pulls revenue, content status, client health, outreach pipeline, and call list.
 * This is the dashboard Jason sees when he sits down.
 *
 * Usage:
 *   npm run brief               — send the brief
 *   npm run brief -- --dry-run  — print to console, no email
 */

import "dotenv/config";
import { db, schema } from "../lib/db";
import { eq } from "drizzle-orm";
import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";

const { leads, clients, deals } = schema;

const TO = "jasonmatthewmurphy@gmail.com";
const MRR_TARGET = 50000;

// ── Scoring ───────────────────────────────────────────────────────────────────

type Priority = "intake" | "replied" | "hot" | "warm" | "follow";

function score(lead: typeof leads.$inferSelect): { priority: Priority; reason: string } | null {
  const cs = lead.callStatus ?? "not_called";
  if (cs === "booked" || cs === "not_interested" || cs === "dnc") return null;
  if (lead.callStatus === "bounced" || (lead as any).status === "bounced") return null;
  if (lead.calledAt) {
    const calledToday = lead.calledAt.startsWith(new Date().toISOString().slice(0, 10));
    if (calledToday) return null;
  }

  if (lead.status === "intake") return { priority: "intake", reason: "Submitted intake form on vibetokens.io" };

  if (lead.repliedAt && cs === "not_called") {
    const snippet = lead.replySnippet ? ` · "${lead.replySnippet.slice(0, 80)}"` : "";
    return { priority: "replied", reason: `Replied to email sequence${snippet}` };
  }

  if (!lead.phone) return null;

  if (lead.emailDay >= 7 && (lead.rating ?? 0) >= 4.0 && (lead.reviewCount ?? 0) >= 20) {
    return { priority: "hot", reason: `Day ${lead.emailDay} of sequence · ${lead.rating}★ · ${lead.reviewCount} reviews` };
  }

  if (lead.emailDay >= 4 && lead.emailDay <= 6) {
    return { priority: "warm", reason: `Day ${lead.emailDay} of sequence — mid-sequence call window` };
  }

  if (lead.emailDay >= 14 && cs === "not_called") {
    return { priority: "follow", reason: "Completed full 14-day sequence — last shot" };
  }

  return null;
}

// ── Revenue data ──────────────────────────────────────────────────────────────

async function getRevenue() {
  let activeClients: typeof clients.$inferSelect[] = [];
  let totalMrr = 0;
  let hasTables = true;

  try {
    activeClients = await db.select().from(clients).where(eq(clients.status, "active"));
    totalMrr = activeClients.reduce((sum, c) => sum + (c.mrr ?? 0), 0);
  } catch {
    hasTables = false;
  }

  return { activeClients, totalMrr, hasTables };
}

// ── Content status ────────────────────────────────────────────────────────────

const LAYER_EPISODES: Array<{ num: number; title: string; slug: string }> = [
  { num: 0, title: "The Layer", slug: "the-layer" },
  { num: 1, title: "Email Is a Trap I No Longer Spring", slug: "the-layer-email" },
  { num: 2, title: "I Stopped Owning My Calendar", slug: "the-layer-calendar" },
  { num: 3, title: "Social Without the Scroll", slug: "the-layer-social" },
  { num: 4, title: "What I Eat Shouldn't Cost Me 45 Minutes of Focus", slug: "the-layer-meals" },
  { num: 5, title: "The Body Next", slug: "the-layer-body" },
  { num: 6, title: "The Professor Model", slug: "the-layer-professor" },
];

function getContentStatus() {
  const postsDir = path.join(process.cwd(), "../vibetokens/data/posts");
  const published: number[] = [];
  const next: { num: number; title: string; slug: string } | null = (() => {
    for (const ep of LAYER_EPISODES) {
      const exists = fs.existsSync(path.join(postsDir, `${ep.slug}.mdx`));
      if (exists) {
        published.push(ep.num);
      } else {
        return ep;
      }
    }
    return null;
  })();

  return { published, next };
}

// ── HTML builder ──────────────────────────────────────────────────────────────

const PRIORITY_COLOR: Record<Priority, string> = {
  intake:  "#00FFB2",
  replied: "#FF2D78",
  hot:     "#FF6B35",
  warm:    "#FFD700",
  follow:  "#8B8FA8",
};

const PRIORITY_LABEL: Record<Priority, string> = {
  intake:  "INTAKE · CALL NOW",
  replied: "REPLIED · CALL NOW",
  hot:     "HOT",
  warm:    "WARM",
  follow:  "FOLLOW-UP",
};

function stat(label: string, value: string | number, color = "#ffffff") {
  return `<td style="text-align:center;padding:0 10px;border-right:1px solid #1e2028;">
    <p style="margin:0;font-family:Arial,sans-serif;font-size:20px;font-weight:700;color:${color};">${value}</p>
    <p style="margin:4px 0 0 0;font-family:Arial,sans-serif;font-size:9px;color:#52526b;text-transform:uppercase;letter-spacing:0.1em;">${label}</p>
  </td>`;
}

function section(label: string, color: string, content: string) {
  return `
  <tr><td style="padding:24px 0 0 0;">
    <p style="margin:0 0 12px 0;font-family:Arial,sans-serif;font-size:9px;font-weight:700;letter-spacing:0.2em;color:${color};text-transform:uppercase;">${label}</p>
    ${content}
  </td></tr>`;
}

function buildHtml(data: {
  callList: Array<{ lead: typeof leads.$inferSelect; priority: Priority; reason: string }>;
  outreachStats: { total: number; active: number; booked: number; replied: number; sentToday: number; bounced: number };
  revenue: { activeClients: typeof clients.$inferSelect[]; totalMrr: number; hasTables: boolean };
  content: { published: number[]; next: { num: number; title: string; slug: string } | null };
}) {
  const now = new Date().toLocaleString("en-US", {
    weekday: "long", month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true,
  });

  const isAM = new Date().getHours() < 12;
  const { callList, outreachStats: stats, revenue, content } = data;

  // ── Revenue section ──
  const mrrGap = MRR_TARGET - revenue.totalMrr;
  const retainersNeeded = Math.ceil(mrrGap / 800);
  const revenueHtml = revenue.hasTables ? `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
      <tr>
        ${stat("MRR", `$${revenue.totalMrr.toLocaleString()}`, "#00FFB2")}
        ${stat("Target", `$${MRR_TARGET.toLocaleString()}`)}
        ${stat("Gap", `$${mrrGap.toLocaleString()}`, "#FF6B35")}
        ${stat("Retainers needed", retainersNeeded, "#FFD700")}
      </tr>
    </table>
    ${revenue.activeClients.length > 0 ? `
    <table width="100%" cellpadding="0" cellspacing="0">
      ${revenue.activeClients.map(c => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #0c0e13;">
          <p style="margin:0;font-family:Arial,sans-serif;font-size:13px;font-weight:700;color:#ffffff;">${c.name}</p>
          ${c.contact ? `<p style="margin:2px 0 0 0;font-family:Arial,sans-serif;font-size:11px;color:#52526b;">${c.contact}${c.email ? ` · ${c.email}` : ""}</p>` : ""}
          ${c.nextAction ? `<p style="margin:4px 0 0 0;font-family:Arial,sans-serif;font-size:12px;color:#b9cbbe;">→ ${c.nextAction}</p>` : ""}
          ${c.lastTouchAt ? `<p style="margin:2px 0 0 0;font-family:Arial,sans-serif;font-size:10px;color:#52526b;">Last touch: ${c.lastTouchAt.slice(0, 10)}</p>` : ""}
        </td>
        <td style="text-align:right;padding:8px 0;border-bottom:1px solid #0c0e13;vertical-align:top;">
          <p style="margin:0;font-family:Arial,sans-serif;font-size:14px;font-weight:700;color:#00FFB2;">$${c.mrr}/mo</p>
        </td>
      </tr>`).join("")}
    </table>` : `<p style="font-family:Arial,sans-serif;font-size:13px;color:#52526b;">No active clients. Run: npm run log-deal -- --seed</p>`}
  ` : `<p style="font-family:Arial,sans-serif;font-size:13px;color:#52526b;">Revenue tables not found. Run: npm run log-deal -- --seed</p>`;

  // ── Content section ──
  const contentHtml = `
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding:12px 16px;background:#0c0e13;border-left:3px solid ${content.next ? "#FFD700" : "#00FFB2"};">
          ${content.next ? `
          <p style="margin:0 0 4px 0;font-family:Arial,sans-serif;font-size:9px;font-weight:700;color:#FFD700;text-transform:uppercase;letter-spacing:0.1em;">NEXT UP — DRAFT QUEUED</p>
          <p style="margin:0;font-family:Arial,sans-serif;font-size:15px;font-weight:700;color:#ffffff;">Episode ${content.next.num}: "${content.next.title}"</p>
          <p style="margin:4px 0 0 0;font-family:Arial,sans-serif;font-size:11px;color:#52526b;">Slug: ${content.next.slug} · Draft email runs 5am daily</p>
          ` : `
          <p style="margin:0 0 4px 0;font-family:Arial,sans-serif;font-size:9px;font-weight:700;color:#00FFB2;text-transform:uppercase;letter-spacing:0.1em;">ALL CAUGHT UP</p>
          <p style="margin:0;font-family:Arial,sans-serif;font-size:14px;color:#ffffff;">Episodes 0–6 published.</p>
          `}
          <p style="margin:8px 0 0 0;font-family:Arial,sans-serif;font-size:11px;color:#52526b;">Published: ${content.published.map(n => `Ep ${n}`).join(" · ")}</p>
        </td>
      </tr>
    </table>`;

  // ── Call list ──
  const callRows = callList.length === 0
    ? `<p style="color:#52526b;font-size:14px;padding:20px 0;">No calls queued for this run.</p>`
    : callList.map((item, i) => {
        const { lead, priority, reason } = item;
        const color = PRIORITY_COLOR[priority];
        const label = PRIORITY_LABEL[priority];
        return `
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:10px;border-top:2px solid ${color};background:#0c0e13;">
          <tr><td style="padding:14px 18px;">
            <span style="display:inline-block;background:${color};color:#003824;font-family:Arial,sans-serif;font-size:9px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;padding:3px 8px;margin-bottom:6px;">${label}</span>
            <p style="margin:0 0 2px 0;font-family:Arial,sans-serif;font-size:16px;font-weight:700;color:#ffffff;">${i + 1}. ${lead.businessName}</p>
            <p style="margin:0 0 6px 0;font-family:Arial,sans-serif;font-size:11px;color:#8B8FA8;text-transform:uppercase;letter-spacing:0.1em;">${lead.city} · ${lead.niche}</p>
            <p style="margin:0 0 10px 0;font-family:Arial,sans-serif;font-size:12px;color:#b9cbbe;">${reason}</p>
            <div style="border-top:1px solid #1e2028;padding-top:8px;">
              ${lead.phone ? `<a href="tel:${lead.phone}" style="font-family:Arial,sans-serif;font-size:20px;font-weight:700;color:${color};text-decoration:none;">${lead.phone}</a>` : `<span style="font-family:Arial,sans-serif;font-size:12px;color:#52526b;">No phone · ${lead.emailAddress ?? "email unknown"}</span>`}
              ${lead.website ? `<span style="font-family:Arial,sans-serif;font-size:10px;color:#52526b;margin-left:14px;">${lead.website.replace(/^https?:\/\/(www\.)?/, "")}</span>` : ""}
            </div>
          </td></tr>
        </table>`;
      }).join("");

  return `<!DOCTYPE html>
<html>
<head><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#080A0F;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#080A0F;">
  <tr><td align="center" style="padding:24px 16px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;">

      <!-- Header -->
      <tr><td style="border-bottom:1px solid #1e2028;padding-bottom:16px;">
        <p style="margin:0 0 4px 0;font-family:Arial,sans-serif;font-size:9px;font-weight:700;letter-spacing:0.2em;color:#00FFB2;text-transform:uppercase;">VibeTokens · ${isAM ? "Morning Standup" : "Afternoon Brief"}</p>
        <p style="margin:0;font-family:Arial,sans-serif;font-size:22px;font-weight:700;color:#ffffff;">${isAM ? "Good morning." : "Afternoon check-in."}</p>
        <p style="margin:4px 0 0 0;font-family:Arial,sans-serif;font-size:12px;color:#52526b;">${now}</p>
      </td></tr>

      ${section("Revenue", "#00FFB2", revenueHtml)}

      ${section("Content — The Layer Series", "#FFD700", contentHtml)}

      <!-- Outreach stats -->
      <tr><td style="padding:24px 0 0 0;">
        <p style="margin:0 0 12px 0;font-family:Arial,sans-serif;font-size:9px;font-weight:700;letter-spacing:0.2em;color:#7c3aed;text-transform:uppercase;">Outreach Pipeline</p>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            ${stat("Total Leads", stats.total)}
            ${stat("In Sequence", stats.active)}
            ${stat("Replied", stats.replied, stats.replied > 0 ? "#FF2D78" : "#ffffff")}
            ${stat("Booked", stats.booked, stats.booked > 0 ? "#00FFB2" : "#ffffff")}
            ${stat("Sent Today", stats.sentToday)}
            ${stat("Bounced", stats.bounced, "#52526b")}
          </tr>
        </table>
      </td></tr>

      <!-- Call list -->
      ${section("Call List · Ranked by Priority", "#52526b", `
        <p style="margin:0 0 12px 0;font-family:Arial,sans-serif;font-size:12px;color:#8B8FA8;">${callList.length === 0 ? "No calls queued." : `${callList.length} lead${callList.length !== 1 ? "s" : ""} to call today.`}</p>
        ${callRows}
      `)}

      <!-- Reply instructions -->
      <tr><td style="border-top:1px solid #1e2028;padding-top:20px;margin-top:24px;">
        <p style="margin:0 0 8px 0;font-family:Arial,sans-serif;font-size:11px;font-weight:700;color:#52526b;text-transform:uppercase;letter-spacing:0.1em;">Update a lead — reply to this email:</p>
        <p style="margin:0;font-family:Arial,sans-serif;font-size:12px;color:#8B8FA8;line-height:1.8;">
          <span style="color:#00FFB2;font-weight:700;">BOOKED [id]</span> · booked a meeting<br>
          <span style="color:#FF6B35;font-weight:700;">CALLED [id]</span> · called, no answer<br>
          <span style="color:#FFD700;font-weight:700;">VM [id]</span> · left voicemail<br>
          <span style="color:#52526b;font-weight:700;">PASS [id]</span> · not a fit<br>
          <span style="color:#52526b;font-weight:700;">DNC [id]</span> · do not contact
        </p>
        <p style="margin:12px 0 0 0;font-family:Arial,sans-serif;font-size:10px;color:#52526b;">Next brief: ${new Date().getHours() < 14 ? "2:00 PM" : "5:45 AM tomorrow"}.</p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  // Gather all data in parallel
  const [allLeads, revenueData] = await Promise.all([
    db.select().from(leads),
    getRevenue(),
  ]);

  const content = getContentStatus();

  // Score + sort call list
  const callList: Array<{ lead: typeof leads.$inferSelect; priority: Priority; reason: string }> = [];
  for (const lead of allLeads) {
    const result = score(lead);
    if (result) callList.push({ lead, priority: result.priority, reason: result.reason });
  }
  const ORDER: Priority[] = ["intake", "replied", "hot", "warm", "follow"];
  callList.sort((a, b) => ORDER.indexOf(a.priority) - ORDER.indexOf(b.priority));
  const topCalls = callList.slice(0, 10);

  const today = new Date().toISOString().slice(0, 10);
  const outreachStats = {
    total: allLeads.length,
    active: allLeads.filter(l => l.emailDay > 0 && l.emailDay < 14 && l.status !== "bounced").length,
    booked: allLeads.filter(l => l.callStatus === "booked").length,
    replied: allLeads.filter(l => l.repliedAt != null).length,
    sentToday: allLeads.filter(l => l.lastEmailedAt?.startsWith(today)).length,
    bounced: allLeads.filter(l => l.status === "bounced").length,
  };

  const callsLabel = topCalls.length > 0
    ? `${topCalls.length} call${topCalls.length !== 1 ? "s" : ""} · $${revenueData.totalMrr.toLocaleString()} MRR`
    : `Pipeline running · $${revenueData.totalMrr.toLocaleString()} MRR`;

  const subject = `[VT] ${callsLabel} · ${new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}`;

  if (dryRun) {
    console.log("\n── VT Brief (dry run) ──");
    console.log(`Subject: ${subject}`);
    console.log(`\nRevenue: $${revenueData.totalMrr.toLocaleString()} MRR (${revenueData.activeClients.length} clients) — gap: $${(MRR_TARGET - revenueData.totalMrr).toLocaleString()}`);
    revenueData.activeClients.forEach(c => console.log(`  · ${c.name} — $${c.mrr}/mo — next: ${c.nextAction ?? "none"}`));
    console.log(`\nContent: Episode ${content.next ? `${content.next.num} "${content.next.title}" — DRAFT NEEDED` : "all published"}`);
    console.log(`Published: ${content.published.map(n => `Ep${n}`).join(", ")}`);
    console.log(`\nOutreach: ${outreachStats.total} leads · ${outreachStats.active} in sequence · ${outreachStats.replied} replied · ${outreachStats.booked} booked · ${outreachStats.sentToday} sent today`);
    console.log(`\nCall list (${topCalls.length}):`);
    topCalls.forEach((item, i) => {
      console.log(`  ${i + 1}. [${item.priority.toUpperCase()}] ${item.lead.businessName} — ${item.lead.city} — ${item.lead.phone ?? "no phone"}`);
    });
    return;
  }

  const html = buildHtml({ callList: topCalls, outreachStats, revenue: revenueData, content });

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
  });

  await transporter.sendMail({
    from: `VibeTokens OS <${process.env.GMAIL_USER}>`,
    to: TO,
    subject,
    html,
  });

  console.log(`Brief sent — ${subject}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
