/**
 * scripts/send-brief.ts
 *
 * CEO Morning OS — fires at 5:00am and 2pm.
 * Pulls revenue, content status, social queue, client health, outreach pipeline, and call list.
 * This is the dashboard Jason sees when he wakes up.
 *
 * Usage:
 *   npm run brief               — send the brief
 *   npm run brief -- --dry-run  — print to console, no email
 */

import { config as dotenvConfig } from "dotenv";
dotenvConfig({ path: ".env.local", override: true });
import { db, schema } from "../lib/db";
import { eq } from "drizzle-orm";
import { Resend } from "resend";
import { ImapFlow } from "imapflow";
import fs from "fs";
import path from "path";

// ── Toptal Inbox (Gmail IMAP) ─────────────────────────────────────────────────

interface ToptalEmail {
  subject: string;
  from: string;
  snippet: string;
  date: string;
  urgent: boolean;
}

async function getToptalInbox(): Promise<ToptalEmail[]> {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) return [];

  const client = new ImapFlow({
    host: "imap.gmail.com",
    port: 993,
    secure: true,
    auth: { user, pass },
    logger: false,
  });

  try {
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");
    const emails: ToptalEmail[] = [];

    try {
      // Search for Toptal emails in last 24 hours
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const uids = await client.search({ from: "@toptal.com", since });

      if (uids.length > 0) {
        const uidList = uids.slice(-20).join(",");
        for await (const msg of client.fetch(uidList, { envelope: true, bodyStructure: true }, { uid: true })) {
          const from = msg.envelope?.from?.[0]?.address ?? "";
          const subject = msg.envelope?.subject ?? "(no subject)";
          const date = msg.envelope?.date?.toISOString().slice(0, 16).replace("T", " ") ?? "";
          const urgent = /urgent|asap|deadline|today|overdue|action required/i.test(subject);
          emails.push({ subject, from, snippet: "", date, urgent });
        }
      }
    } finally {
      lock.release();
    }

    await client.logout();
    return emails.sort((a, b) => (b.urgent ? 1 : 0) - (a.urgent ? 1 : 0));
  } catch {
    return [];
  }
}

// ── VT Inbox (Notion) ─────────────────────────────────────────────────────────

interface VtInboxEntry {
  subject: string;
  from: string;
  category: string;
  status: string;
  bodyPreview: string;
  receivedAt: string;
}

async function getVtInbox(): Promise<VtInboxEntry[]> {
  const token = process.env.NOTION_TOKEN;
  const dbId = process.env.NOTION_VT_INBOX_ID;
  if (!token || !dbId) return [];

  try {
    const res = await fetch(`https://api.notion.com/v1/databases/${dbId}/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        filter: {
          or: [
            { property: "Status", select: { equals: "needs_review" } },
            { property: "Status", select: { equals: "auto_replied" } },
          ],
        },
        sorts: [{ property: "Received At", direction: "descending" }],
        page_size: 10,
      }),
    });
    if (!res.ok) return [];
    const data = await res.json() as { results: Array<{ properties: Record<string, { title?: Array<{plain_text: string}>, rich_text?: Array<{plain_text: string}>, select?: {name: string}, date?: {start: string} } > }> };
    return data.results.map((page) => ({
      subject: page.properties["Subject"]?.title?.[0]?.plain_text ?? "(no subject)",
      from: page.properties["From"]?.rich_text?.[0]?.plain_text ?? "",
      category: page.properties["Category"]?.select?.name ?? "",
      status: page.properties["Status"]?.select?.name ?? "",
      bodyPreview: page.properties["Body Preview"]?.rich_text?.[0]?.plain_text ?? "",
      receivedAt: page.properties["Received At"]?.date?.start ?? "",
    }));
  } catch {
    return [];
  }
}

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

// ── Revenue data (Stripe) ─────────────────────────────────────────────────────

interface StripeRevenue {
  mrr: number;
  subscriptions: Array<{ customer: string; amount: number; interval: string; status: string }>;
  pendingBalance: number;
  availableBalance: number;
  hasStripe: boolean;
}

async function getStripeRevenue(): Promise<StripeRevenue> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return { mrr: 0, subscriptions: [], pendingBalance: 0, availableBalance: 0, hasStripe: false };

  const headers = {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/x-www-form-urlencoded",
  };

  try {
    const [subsRes, balRes] = await Promise.all([
      fetch("https://api.stripe.com/v1/subscriptions?status=active&limit=100&expand[]=data.customer", { headers }),
      fetch("https://api.stripe.com/v1/balance", { headers }),
    ]);

    const [subsData, balData] = await Promise.all([subsRes.json(), balRes.json()]) as [any, any];

    const subscriptions = (subsData.data ?? []).map((sub: any) => ({
      customer: sub.customer?.name ?? sub.customer?.email ?? sub.customer ?? "Unknown",
      amount: sub.items?.data?.[0]?.price?.unit_amount ?? 0,
      interval: sub.items?.data?.[0]?.price?.recurring?.interval ?? "month",
      status: sub.status,
    }));

    const mrr = subscriptions.reduce((sum: number, s: any) => {
      const monthly = s.interval === "year" ? Math.round(s.amount / 12) : s.amount;
      return sum + monthly;
    }, 0) / 100;

    const pending = ((balData.pending ?? []).find((b: any) => b.currency === "usd")?.amount ?? 0) / 100;
    const available = ((balData.available ?? []).find((b: any) => b.currency === "usd")?.amount ?? 0) / 100;

    return { mrr, subscriptions, pendingBalance: pending, availableBalance: available, hasStripe: true };
  } catch {
    return { mrr: 0, subscriptions: [], pendingBalance: 0, availableBalance: 0, hasStripe: false };
  }
}

// ── Legacy DB clients (for next actions / notes only) ─────────────────────────

async function getDbClients() {
  try {
    return await db.select().from(clients).where(eq(clients.status, "active"));
  } catch {
    return [];
  }
}

// ── Social content queue ──────────────────────────────────────────────────────

interface SocialQueueStatus {
  totalQueued: number;
  platforms: string[];
  slots: Array<{ slot: number; platform: string; file: string }>;
  pipelineRanToday: boolean;
}

function getSocialQueueStatus(): SocialQueueStatus {
  const today = new Date().toISOString().slice(0, 10);
  const queueDir = path.join(process.cwd(), "../vibetokens/content/posts/queue");
  const pipelineDir = path.join(process.cwd(), "../vt-content-pipeline");

  const slots: SocialQueueStatus["slots"] = [];
  const platforms = new Set<string>();

  if (fs.existsSync(queueDir)) {
    const files = fs.readdirSync(queueDir).filter(f => f.startsWith(today));
    for (const file of files) {
      const match = file.match(/slot(\d+)-(.+)\.md$/);
      if (match) {
        const slot = parseInt(match[1]);
        const platform = match[2];
        slots.push({ slot, platform, file });
        platforms.add(platform);
      }
    }
  }

  // Check if content pipeline ran today (look for recently modified files)
  let pipelineRanToday = false;
  if (fs.existsSync(pipelineDir)) {
    try {
      const logsDir = path.join(pipelineDir, "logs");
      if (fs.existsSync(logsDir)) {
        const logFiles = fs.readdirSync(logsDir);
        const todayLogs = logFiles.filter(f => f.includes(today));
        pipelineRanToday = todayLogs.length > 0;
      }
      // Also check if any .py output file was modified today
      if (!pipelineRanToday) {
        const stats = fs.statSync(pipelineDir);
        const modDate = stats.mtime.toISOString().slice(0, 10);
        pipelineRanToday = modDate === today;
      }
    } catch {
      pipelineRanToday = false;
    }
  }

  return {
    totalQueued: slots.length,
    platforms: Array.from(platforms),
    slots: slots.sort((a, b) => a.slot - b.slot),
    pipelineRanToday,
  };
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
  stripe: StripeRevenue;
  dbClients: typeof clients.$inferSelect[];
  content: { published: number[]; next: { num: number; title: string; slug: string } | null };
  inbox: VtInboxEntry[];
  socialQueue: SocialQueueStatus;
  toptalInbox: ToptalEmail[];
}) {
  const now = new Date().toLocaleString("en-US", {
    weekday: "long", month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true,
  });

  const isAM = new Date().getHours() < 12;
  const { callList, outreachStats: stats, stripe, dbClients, content, inbox, socialQueue, toptalInbox } = data;

  // ── Revenue section ──
  // Use DB clients as source of truth for MRR when Stripe shows 0 (subscriptions not yet in Stripe)
  const dbMrr = dbClients.reduce((sum, c) => sum + (c.mrr ?? 0), 0);
  const activeMrr = stripe.mrr > 0 ? stripe.mrr : dbMrr;
  const mrrGap = MRR_TARGET - activeMrr;
  const retainersNeeded = Math.ceil(mrrGap / 1000);
  const revenueHtml = `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
      <tr>
        ${stat("MRR", `$${activeMrr.toLocaleString()}`, activeMrr > 0 ? "#00FFB2" : "#FF6B35")}
        ${stat("Target", `$${MRR_TARGET.toLocaleString()}`)}
        ${stat("Gap", `$${mrrGap.toLocaleString()}`, "#FF6B35")}
        ${stat("Retainers needed", retainersNeeded, "#FFD700")}
        ${stat("Pending", `$${stripe.pendingBalance.toLocaleString()}`, "#8B8FA8")}
      </tr>
    </table>
    ${stripe.subscriptions.length > 0 ? `
    <table width="100%" cellpadding="0" cellspacing="0">
      ${stripe.subscriptions.map(s => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #0c0e13;">
          <p style="margin:0;font-family:Arial,sans-serif;font-size:13px;font-weight:700;color:#ffffff;">${s.customer}</p>
          <p style="margin:2px 0 0 0;font-family:Arial,sans-serif;font-size:11px;color:#52526b;">${s.status} · billed ${s.interval}ly</p>
          ${dbClients.find(c => c.name?.toLowerCase().includes(s.customer.toLowerCase()))?.nextAction
            ? `<p style="margin:4px 0 0 0;font-family:Arial,sans-serif;font-size:12px;color:#b9cbbe;">→ ${dbClients.find(c => c.name?.toLowerCase().includes(s.customer.toLowerCase()))?.nextAction}</p>`
            : ""}
        </td>
        <td style="text-align:right;padding:8px 0;border-bottom:1px solid #0c0e13;vertical-align:top;">
          <p style="margin:0;font-family:Arial,sans-serif;font-size:14px;font-weight:700;color:#00FFB2;">$${(s.amount / 100).toLocaleString()}/mo</p>
        </td>
      </tr>`).join("")}
    </table>` : `
    <table width="100%" cellpadding="0" cellspacing="0">
      ${dbClients.filter(c => c.mrr && c.mrr > 0).map(c => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #0c0e13;">
          <p style="margin:0;font-family:Arial,sans-serif;font-size:13px;font-weight:700;color:#ffffff;">${c.name}</p>
          <p style="margin:2px 0 0 0;font-family:Arial,sans-serif;font-size:11px;color:#52526b;">active · billed monthly</p>
          ${c.nextAction ? `<p style="margin:4px 0 0 0;font-family:Arial,sans-serif;font-size:12px;color:#b9cbbe;">→ ${c.nextAction}</p>` : ""}
        </td>
        <td style="text-align:right;padding:8px 0;border-bottom:1px solid #0c0e13;vertical-align:top;">
          <p style="margin:0;font-family:Arial,sans-serif;font-size:14px;font-weight:700;color:#00FFB2;">$${c.mrr!.toLocaleString()}/mo</p>
        </td>
      </tr>`).join("")}
    </table>
    ${stripe.pendingBalance > 0 ? `<p style="font-family:Arial,sans-serif;font-size:12px;color:#8B8FA8;margin:4px 0 0 0;">$${stripe.pendingBalance.toLocaleString()} pending in Stripe balance.</p>` : ""}
    `}
  `;

  // ── Toptal inbox section ──
  const toptalHtml = toptalInbox.length === 0
    ? `<p style="color:#52526b;font-size:13px;padding:8px 0;">✓ No Toptal emails in last 24 hours.</p>`
    : toptalInbox.map(email => {
        const color = email.urgent ? "#FF2D78" : "#8B8FA8";
        return `
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;background:#0c0e13;border-left:3px solid ${color};">
          <tr><td style="padding:10px 14px;">
            ${email.urgent ? `<span style="font-family:Arial,sans-serif;font-size:9px;font-weight:700;color:#FF2D78;text-transform:uppercase;letter-spacing:0.1em;">⚠ URGENT</span><br>` : ""}
            <p style="margin:0 0 2px 0;font-family:Arial,sans-serif;font-size:13px;font-weight:700;color:#ffffff;">${email.subject}</p>
            <p style="margin:0;font-family:Arial,sans-serif;font-size:11px;color:#52526b;">${email.from} · ${email.date}</p>
          </td></tr>
        </table>`;
      }).join("");

  // ── Social queue section ──
  const queueOk = socialQueue.totalQueued >= 5;
  const pipelineOk = socialQueue.pipelineRanToday;
  const socialQueueHtml = `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
      <tr>
        ${stat("Posts Queued", socialQueue.totalQueued, queueOk ? "#00FFB2" : "#FF6B35")}
        ${stat("Target", "5–6")}
        ${stat("Pipeline", pipelineOk ? "✓ RAN" : "⚠ CHECK", pipelineOk ? "#00FFB2" : "#FF6B35")}
        ${stat("Platforms", socialQueue.platforms.join(", ") || "—")}
      </tr>
    </table>
    ${!queueOk ? `<p style="font-family:Arial,sans-serif;font-size:12px;color:#FF6B35;margin:8px 0 0 0;">⚠ Only ${socialQueue.totalQueued} posts queued — run vt-content-pipeline to fill slots.</p>` : ""}
    ${!pipelineOk ? `<p style="font-family:Arial,sans-serif;font-size:12px;color:#FF6B35;margin:4px 0 0 0;">⚠ Content pipeline may not have run today — check C:/Users/jason/vt-content-pipeline/</p>` : ""}`;

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

  // ── VT Inbox section ──
  const CATEGORY_COLOR: Record<string, string> = {
    intake_reply:    "#FF2D78",
    workshop_inquiry: "#7c3aed",
    existing_client: "#00FFB2",
    general_question: "#FFD700",
    spam:            "#52526b",
  };

  const inboxHtml = inbox.length === 0
    ? `<p style="color:#52526b;font-size:13px;padding:8px 0;">No new emails in VT Inbox.</p>`
    : inbox.map(email => {
        const color = CATEGORY_COLOR[email.category] ?? "#8B8FA8";
        const needsReview = email.status === "needs_review";
        return `
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;background:#0c0e13;border-left:3px solid ${color};">
          <tr><td style="padding:10px 14px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
              <span style="font-family:Arial,sans-serif;font-size:9px;font-weight:700;color:${color};text-transform:uppercase;letter-spacing:0.1em;">${email.category.replace(/_/g, " ")}${needsReview ? " · ⚠ REVIEW" : ""}</span>
              ${email.receivedAt ? `<span style="font-family:Arial,sans-serif;font-size:9px;color:#52526b;">${new Date(email.receivedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</span>` : ""}
            </div>
            <p style="margin:0 0 2px 0;font-family:Arial,sans-serif;font-size:13px;font-weight:700;color:#ffffff;">${email.subject}</p>
            <p style="margin:0 0 4px 0;font-family:Arial,sans-serif;font-size:11px;color:#52526b;">${email.from}</p>
            ${email.bodyPreview ? `<p style="margin:0;font-family:Arial,sans-serif;font-size:12px;color:#8B8FA8;line-height:1.5;">${email.bodyPreview.slice(0, 200)}</p>` : ""}
          </td></tr>
        </table>`;
      }).join("");

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

      ${section(`Toptal Inbox — jason.murphy@toptal.com${toptalInbox.some(e => e.urgent) ? " · ⚠ URGENT" : toptalInbox.length > 0 ? ` · ${toptalInbox.length} new` : ""}`, "#FFD700", toptalHtml)}

      ${section(`VT Inbox — hello@vibetokens.io${inbox.some(e => e.status === "needs_review") ? " · ⚠ NEEDS REVIEW" : ""}`, "#FF2D78", inboxHtml)}

      ${section(`Social Queue — Today${queueOk && pipelineOk ? " · ✓ ALL CLEAR" : " · ⚠ ACTION NEEDED"}`, "#7c3aed", socialQueueHtml)}

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
  const [allLeads, stripeData, dbClients, inboxData, toptalInbox] = await Promise.all([
    db.select().from(leads),
    getStripeRevenue(),
    getDbClients(),
    getVtInbox(),
    getToptalInbox(),
  ]);

  const content = getContentStatus();
  const socialQueue = getSocialQueueStatus();

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

  const dbMrrTotal = dbClients.reduce((sum, c) => sum + (c.mrr ?? 0), 0);
  const activeMrr = stripeData.mrr > 0 ? stripeData.mrr : dbMrrTotal;

  const callsLabel = topCalls.length > 0
    ? `${topCalls.length} call${topCalls.length !== 1 ? "s" : ""} · $${activeMrr.toLocaleString()} MRR`
    : `Pipeline running · $${activeMrr.toLocaleString()} MRR`;

  const subject = `[VT] ${callsLabel} · ${new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}`;

  if (dryRun) {
    console.log("\n── VT Brief (dry run) ──");
    console.log(`Subject: ${subject}`);
    console.log(`\nRevenue: $${activeMrr.toLocaleString()} MRR (${stripeData.mrr > 0 ? "Stripe" : "DB clients"}) · gap: $${(MRR_TARGET - activeMrr).toLocaleString()}`);
    console.log(`  Pending: $${stripeData.pendingBalance.toLocaleString()} · Available: $${stripeData.availableBalance.toLocaleString()}`);
    stripeData.subscriptions.forEach(s => console.log(`  · ${s.customer} — $${(s.amount / 100).toLocaleString()}/mo`));
    console.log(`\nContent: Episode ${content.next ? `${content.next.num} "${content.next.title}" — DRAFT NEEDED` : "all published"}`);
    console.log(`Published: ${content.published.map(n => `Ep${n}`).join(", ")}`);
    console.log(`\nSocial Queue: ${socialQueue.totalQueued} posts queued today (target: 5-6) · Platforms: ${socialQueue.platforms.join(", ") || "none"} · Pipeline: ${socialQueue.pipelineRanToday ? "✓ ran today" : "⚠ not detected"}`);
    console.log(`\nToptal Inbox: ${toptalInbox.length} email${toptalInbox.length !== 1 ? "s" : ""} in last 24h · ${toptalInbox.filter(e => e.urgent).length} urgent`);
    console.log(`\nVT Inbox: ${inboxData.length} email${inboxData.length !== 1 ? "s" : ""} · ${inboxData.filter(e => e.status === "needs_review").length} need review`);
    inboxData.slice(0, 5).forEach(e => console.log(`  · [${e.category}] ${e.subject} — from: ${e.from}`));
    console.log(`\nOutreach: ${outreachStats.total} leads · ${outreachStats.active} in sequence · ${outreachStats.replied} replied · ${outreachStats.booked} booked · ${outreachStats.sentToday} sent today`);
    console.log(`\nCall list (${topCalls.length}):`);
    topCalls.forEach((item, i) => {
      console.log(`  ${i + 1}. [${item.priority.toUpperCase()}] ${item.lead.businessName} — ${item.lead.city} — ${item.lead.phone ?? "no phone"}`);
    });
    return;
  }

  const html = buildHtml({ callList: topCalls, outreachStats, stripe: stripeData, dbClients, content, inbox: inboxData, socialQueue, toptalInbox });

  const resend = new Resend(process.env.RESEND_API_KEY);

  await resend.emails.send({
    from: "Murph — VibeTokens OS <hello@vibetokens.io>",
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
