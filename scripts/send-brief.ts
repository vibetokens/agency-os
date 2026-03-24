/**
 * scripts/send-brief.ts
 *
 * Sends Jason a ranked call list twice a day (6am + 2pm).
 * Pulls hot leads from the DB, scores them by call priority,
 * and fires an HTML email to jasonmatthewmurphy@gmail.com.
 *
 * Usage:
 *   npm run brief               — send the brief
 *   npm run brief -- --dry-run  — print to console, no email
 */

import "dotenv/config";
import { db, schema } from "../lib/db";
import nodemailer from "nodemailer";

const { leads } = schema;

const TO = "jasonmatthewmurphy@gmail.com";

// ── Scoring ───────────────────────────────────────────────────────────────────

type Priority = "intake" | "replied" | "hot" | "warm" | "follow";

function score(lead: typeof leads.$inferSelect): { priority: Priority; reason: string } | null {
  const cs = lead.callStatus ?? "not_called";

  // Skip leads already handled
  if (cs === "booked" || cs === "not_interested" || cs === "dnc") return null;
  // Skip if already called today
  if (lead.calledAt) {
    const calledToday = lead.calledAt.startsWith(new Date().toISOString().slice(0, 10));
    if (calledToday) return null;
  }

  // Intake submissions — top priority, always call same day
  if (lead.status === "intake") {
    return { priority: "intake", reason: "Submitted intake form on vibetokens.io" };
  }

  // Replied to an email — call immediately, they're warm
  if (lead.repliedAt && cs === "not_called") {
    const snippet = lead.replySnippet ? ` · "${lead.replySnippet.slice(0, 80)}"` : "";
    return { priority: "replied", reason: `Replied to email sequence${snippet}` };
  }

  // No phone = can't call
  if (!lead.phone) return null;

  // Hot: day 7–14, reputable business
  if (lead.emailDay >= 7 && (lead.rating ?? 0) >= 4.0 && (lead.reviewCount ?? 0) >= 20) {
    return {
      priority: "hot",
      reason: `Day ${lead.emailDay} of sequence · ${lead.rating}★ · ${lead.reviewCount} reviews`,
    };
  }

  // Warm: day 4–6, has phone
  if (lead.emailDay >= 4 && lead.emailDay <= 6) {
    return {
      priority: "warm",
      reason: `Day ${lead.emailDay} of sequence — mid-sequence call window`,
    };
  }

  // Sequence complete: day 14, never replied
  if (lead.emailDay >= 14 && cs === "not_called") {
    return { priority: "follow", reason: "Completed full 14-day sequence — last shot" };
  }

  return null;
}

// ── HTML email ────────────────────────────────────────────────────────────────

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

function buildHtml(callList: Array<{ lead: typeof leads.$inferSelect; priority: Priority; reason: string }>, stats: { total: number; active: number; booked: number; replied: number; sentToday: number }) {
  const now = new Date().toLocaleString("en-US", {
    weekday: "long", month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true,
  });

  const rows = callList.length === 0
    ? `<p style="color:#52526b;font-size:14px;padding:20px 0;">No calls queued for this run. Pipeline is running clean.</p>`
    : callList.map((item, i) => {
        const { lead, priority, reason } = item;
        const color = PRIORITY_COLOR[priority];
        const label = PRIORITY_LABEL[priority];
        return `
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;border-top:2px solid ${color};background:#0c0e13;">
          <tr>
            <td style="padding:16px 20px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="display:inline-block;background:${color};color:#003824;font-family:Arial,sans-serif;font-size:9px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;padding:3px 8px;margin-bottom:8px;">${label}</span>
                    <p style="margin:0 0 4px 0;font-family:Arial,sans-serif;font-size:17px;font-weight:700;color:#ffffff;">${i + 1}. ${lead.businessName}</p>
                    <p style="margin:0 0 8px 0;font-family:Arial,sans-serif;font-size:12px;color:#8B8FA8;text-transform:uppercase;letter-spacing:0.1em;">${lead.city} · ${lead.niche}</p>
                    <p style="margin:0 0 12px 0;font-family:Arial,sans-serif;font-size:13px;color:#b9cbbe;">${reason}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top:4px;border-top:1px solid #1e2028;">
                    ${lead.phone ? `<a href="tel:${lead.phone}" style="display:inline-block;font-family:Arial,sans-serif;font-size:20px;font-weight:700;color:${color};text-decoration:none;letter-spacing:0.05em;padding:8px 0;">${lead.phone}</a>` : `<span style="font-family:Arial,sans-serif;font-size:13px;color:#52526b;">No phone — email only: ${lead.emailAddress ?? "unknown"}</span>`}
                    ${lead.website ? `<span style="font-family:Arial,sans-serif;font-size:11px;color:#52526b;margin-left:16px;">${lead.website.replace(/^https?:\/\/(www\.)?/, "")}</span>` : ""}
                  </td>
                </tr>
                ${lead.callStatus !== "not_called" ? `<tr><td style="padding-top:8px;font-family:Arial,sans-serif;font-size:11px;color:#52526b;text-transform:uppercase;letter-spacing:0.1em;">Last status: ${lead.callStatus}</td></tr>` : ""}
              </table>
            </td>
          </tr>
        </table>`;
      }).join("");

  return `<!DOCTYPE html>
<html>
<head><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#080A0F;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#080A0F;">
  <tr><td align="center" style="padding:24px 16px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

      <!-- Header -->
      <tr><td style="border-bottom:1px solid #1e2028;padding-bottom:16px;margin-bottom:24px;">
        <p style="margin:0 0 4px 0;font-family:Arial,sans-serif;font-size:9px;font-weight:700;letter-spacing:0.2em;color:#00FFB2;text-transform:uppercase;">VibeTokens · Daily Brief</p>
        <p style="margin:0;font-family:Arial,sans-serif;font-size:22px;font-weight:700;color:#ffffff;">${callList.length} call${callList.length !== 1 ? "s" : ""} today</p>
        <p style="margin:4px 0 0 0;font-family:Arial,sans-serif;font-size:12px;color:#52526b;">${now}</p>
      </td></tr>

      <!-- Stats bar -->
      <tr><td style="padding:16px 0 24px 0;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            ${[
              ["Total Leads", stats.total],
              ["In Sequence", stats.active],
              ["Replied", stats.replied],
              ["Booked", stats.booked],
              ["Sent Today", stats.sentToday],
            ].map(([label, val]) => `
            <td style="text-align:center;padding:0 8px;border-right:1px solid #1e2028;">
              <p style="margin:0;font-family:Arial,sans-serif;font-size:22px;font-weight:700;color:#ffffff;">${val}</p>
              <p style="margin:4px 0 0 0;font-family:Arial,sans-serif;font-size:9px;color:#52526b;text-transform:uppercase;letter-spacing:0.1em;">${label}</p>
            </td>`).join("")}
          </tr>
        </table>
      </td></tr>

      <!-- Call list -->
      <tr><td>
        <p style="margin:0 0 16px 0;font-family:Arial,sans-serif;font-size:9px;font-weight:700;letter-spacing:0.2em;color:#52526b;text-transform:uppercase;">Call list · ranked by priority</p>
        ${rows}
      </td></tr>

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
        <p style="margin:16px 0 0 0;font-family:Arial,sans-serif;font-size:10px;color:#52526b;">Lead IDs are in the DB. Next brief: ${new Date().getHours() < 14 ? "2:00 PM" : "6:00 AM tomorrow"}.</p>
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

  const allLeads = await db.select().from(leads);

  // Score each lead
  const callList: Array<{ lead: typeof leads.$inferSelect; priority: Priority; reason: string }> = [];
  for (const lead of allLeads) {
    const result = score(lead);
    if (result) callList.push({ lead, priority: result.priority, reason: result.reason });
  }

  // Sort: intake > hot > warm > follow
  const ORDER: Priority[] = ["intake", "replied", "hot", "warm", "follow"];
  callList.sort((a, b) => ORDER.indexOf(a.priority) - ORDER.indexOf(b.priority));

  // Cap at 10 per brief — more than that is noise
  const topCalls = callList.slice(0, 10);

  // Stats
  const today = new Date().toISOString().slice(0, 10);
  const stats = {
    total: allLeads.length,
    active: allLeads.filter((l) => l.emailDay > 0 && l.emailDay < 14).length,
    booked: allLeads.filter((l) => l.callStatus === "booked").length,
    replied: allLeads.filter((l) => l.repliedAt != null).length,
    sentToday: allLeads.filter((l) => l.lastEmailedAt?.startsWith(today)).length,
  };

  const html = buildHtml(topCalls, stats);
  const subject = topCalls.length > 0
    ? `[VT Brief] ${topCalls.length} call${topCalls.length !== 1 ? "s" : ""} today — ${topCalls[0].lead.businessName} is first`
    : `[VT Brief] Pipeline running — no calls queued`;

  if (dryRun) {
    console.log("\n── VT Brief (dry run) ──");
    console.log(`Subject: ${subject}`);
    console.log(`Call list (${topCalls.length}):`);
    topCalls.forEach((item, i) => {
      console.log(`  ${i + 1}. [${item.priority.toUpperCase()}] ${item.lead.businessName} — ${item.lead.city} — ${item.lead.phone ?? "no phone"}`);
      console.log(`     ${item.reason}`);
    });
    console.log(`\nStats: ${stats.total} total · ${stats.active} in sequence · ${stats.booked} booked · ${stats.sentToday} sent today`);
    return;
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
  });

  await transporter.sendMail({
    from: `VibeTokens Pipeline <${process.env.GMAIL_USER}>`,
    to: TO,
    subject,
    html,
  });

  console.log(`Brief sent to ${TO} — ${topCalls.length} leads, subject: "${subject}"`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
