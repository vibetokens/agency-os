/**
 * scripts/ceo-drive.ts
 *
 * The CEO wakes up and drives toward $50k MRR.
 *
 * Runs every weekday morning. Pulls real data, reasons about the revenue gap,
 * assigns specific work, pushes the plan to Telegram, then fires the full team:
 *   - Content pipeline  (posts + blog + images)
 *   - LinkedIn engagement  (industry comments + replies)
 *   - Email outreach pipeline  (cold sequences)
 *   - Reply checker  (inbox scrub)
 *
 * Usage:
 *   npm run ceo                  — full run + fire team
 *   npm run ceo -- --dry-run     — print to console, no Telegram, no team spawn
 *   npm run ceo -- --no-team     — send CEO message but skip team spawn
 */

import { config as dotenvConfig } from "dotenv";
dotenvConfig({ path: ".env.local", override: true });
import Anthropic from "@anthropic-ai/sdk";
import { db, schema } from "../lib/db";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";

const { leads } = schema;

const MRR_TARGET = 50_000;
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

const dryRun = process.argv.includes("--dry-run");
const noTeam = process.argv.includes("--no-team");

const CONTENT_PIPELINE_DIR = path.resolve(process.cwd(), "../../vt-content-pipeline");
const OUTREACH_DIR = process.cwd();
const LOGS_DIR = path.join(OUTREACH_DIR, "logs");

// ── Data collectors ───────────────────────────────────────────────────────────

async function getStripeMrr(): Promise<number> {
  if (!STRIPE_KEY) return 0;
  try {
    const res = await fetch(
      "https://api.stripe.com/v1/subscriptions?status=active&limit=100",
      { headers: { Authorization: `Bearer ${STRIPE_KEY}` } }
    );
    const data = await res.json() as any;
    return (data.data ?? []).reduce((sum: number, sub: any) => {
      const amount = sub.items?.data?.[0]?.price?.unit_amount ?? 0;
      const interval = sub.items?.data?.[0]?.price?.recurring?.interval ?? "month";
      return sum + (interval === "year" ? Math.round(amount / 12) : amount);
    }, 0) / 100;
  } catch {
    return 0;
  }
}

async function getPipelineStats() {
  const allLeads = await db.select().from(leads);
  const today = new Date().toISOString().slice(0, 10);
  return {
    total: allLeads.length,
    inSequence: allLeads.filter(l => l.emailDay > 0 && l.emailDay < 14 && l.status !== "bounced").length,
    replied: allLeads.filter(l => l.repliedAt != null && l.callStatus === "not_called").length,
    booked: allLeads.filter(l => l.callStatus === "booked").length,
    sentToday: allLeads.filter(l => l.lastEmailedAt?.startsWith(today)).length,
    intakes: allLeads.filter(l => l.status === "intake").length,
  };
}

function getSocialQueueCount(): number {
  const today = new Date().toISOString().slice(0, 10);
  const queueDir = path.join(process.cwd(), "../vibetokens/content/posts/queue");
  if (!fs.existsSync(queueDir)) return 0;
  return fs.readdirSync(queueDir).filter(f => f.startsWith(today)).length;
}

// ── Telegram sender ───────────────────────────────────────────────────────────

async function sendTelegram(text: string) {
  if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT_ID) return;
  const MAX = 4000;
  const chunks = [];
  let remaining = text;
  while (remaining.length > 0) {
    chunks.push(remaining.slice(0, MAX));
    remaining = remaining.slice(MAX);
  }
  for (const chunk of chunks) {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: chunk }),
    });
  }
}

// ── CEO reasoning ─────────────────────────────────────────────────────────────

async function runCeoReasoning(data: {
  mrr: number;
  gap: number;
  pipeline: Awaited<ReturnType<typeof getPipelineStats>>;
  socialQueue: number;
  dayOfWeek: string;
}): Promise<string> {
  if (!ANTHROPIC_KEY) return "⚠ No Anthropic API key — CEO reasoning unavailable.";

  const client = new Anthropic({ apiKey: ANTHROPIC_KEY });

  const systemPrompt = `You are the CEO of Vibe Tokens, a Claude-native digital marketing agency.
Your only job right now is to close the gap to $50,000 MRR.
You are direct, decisive, and action-oriented. You don't write reports — you assign work.
Jason is your founder. You report to him. He trusts you to run the business.
Speak in first person as the CEO. Be concise. Lead with the gap, then the action.`;

  const userPrompt = `Today is ${data.dayOfWeek}.

REAL NUMBERS:
- MRR: $${data.mrr.toLocaleString()} / $${MRR_TARGET.toLocaleString()} target
- Gap: $${data.gap.toLocaleString()} (need ~${Math.ceil(data.gap / 1000)} retainers at $1k/mo)
- Pipeline: ${data.pipeline.total} total leads, ${data.pipeline.inSequence} in sequence
- Replied (uncalled): ${data.pipeline.replied} — these need calls TODAY
- Booked calls: ${data.pipeline.booked}
- Intake form submissions: ${data.pipeline.intakes}
- Emails sent today: ${data.pipeline.sentToday}
- Social posts queued today: ${data.socialQueue} / 5 target

Based on this data, give me:
1. ONE sentence on where we are (brutal honesty)
2. The #1 bottleneck to revenue right now
3. Exactly 3 actions to execute TODAY ranked by revenue impact
4. One thing I should personally do vs. what agents can handle

Format it for Telegram. No markdown headers. Keep it under 300 words. Make it feel like a real CEO talking, not a report.`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 500,
    messages: [{ role: "user", content: userPrompt }],
    system: systemPrompt,
  });

  return (message.content[0] as any).text;
}

// ── Team launcher ─────────────────────────────────────────────────────────────

interface TeamJob {
  name: string;
  cmd: string;
  args: string[];
  cwd: string;
  logFile: string;
}

function buildJobs(today: string): TeamJob[] {
  const logDate = today.replace(/-/g, "");
  return [
    // ── Content ───────────────────────────────────────────────────────────────
    {
      name: "LinkedIn (6 posts + blog)",
      cmd: "python",
      args: ["run_daily.py"],
      cwd: CONTENT_PIPELINE_DIR,
      logFile: path.join(LOGS_DIR, `${logDate}-content-linkedin.log`),
    },
    {
      // publish-post generates blog + stages Facebook + LinkedIn alt post.
      // post-facebook reads pending-facebook.txt and posts via Chrome CDP.
      // Chained so Facebook never races ahead of the generator.
      name: "Facebook",
      cmd: process.platform === "win32" ? "cmd" : "sh",
      args: process.platform === "win32"
        ? ["/c", "npx tsx --env-file=.env.local scripts/publish-post.ts && npx tsx --env-file=.env.local scripts/post-facebook.ts"]
        : ["-c", "npx tsx --env-file=.env.local scripts/publish-post.ts && npx tsx --env-file=.env.local scripts/post-facebook.ts"],
      cwd: OUTREACH_DIR,
      logFile: path.join(LOGS_DIR, `${logDate}-content-facebook.log`),
    },
    {
      // draft-content generates tweets + emails drafts + stages pending-twitter.txt.
      // post-twitter reads pending-twitter.txt and posts all 3 via Chrome CDP.
      // Chained so posting never races ahead of draft generation.
      name: "Twitter",
      cmd: process.platform === "win32" ? "cmd" : "sh",
      args: process.platform === "win32"
        ? ["/c", "npx tsx --env-file=.env.local scripts/draft-content.ts && npx tsx --env-file=.env.local scripts/post-twitter.ts"]
        : ["-c", "npx tsx --env-file=.env.local scripts/draft-content.ts && npx tsx --env-file=.env.local scripts/post-twitter.ts"],
      cwd: OUTREACH_DIR,
      logFile: path.join(LOGS_DIR, `${logDate}-content-twitter.log`),
    },
    // ── Engagement ────────────────────────────────────────────────────────────
    {
      name: "LinkedIn Engagement",
      cmd: "python",
      args: ["run_engagement.py"],
      cwd: CONTENT_PIPELINE_DIR,
      logFile: path.join(LOGS_DIR, `${logDate}-engagement.log`),
    },
    // ── Outreach ──────────────────────────────────────────────────────────────
    {
      name: "Email Pipeline",
      cmd: "npx",
      args: ["tsx", "--env-file=.env.local", "scripts/run-pipeline.ts"],
      cwd: OUTREACH_DIR,
      logFile: path.join(LOGS_DIR, `${logDate}-email-pipeline.log`),
    },
    {
      name: "Reply Checker",
      cmd: "npx",
      args: ["tsx", "--env-file=.env.local", "scripts/check-replies.ts"],
      cwd: OUTREACH_DIR,
      logFile: path.join(LOGS_DIR, `${logDate}-replies.log`),
    },
  ];
}

function fireTeam(jobs: TeamJob[]): string[] {
  fs.mkdirSync(LOGS_DIR, { recursive: true });

  const fired: string[] = [];
  const failed: string[] = [];

  for (const job of jobs) {
    if (!fs.existsSync(job.cwd)) {
      failed.push(`${job.name} (dir not found: ${job.cwd})`);
      continue;
    }

    try {
      const logStream = fs.openSync(job.logFile, "a");
      const proc = spawn(job.cmd, job.args, {
        cwd: job.cwd,
        detached: true,
        stdio: ["ignore", logStream, logStream],
        shell: process.platform === "win32",
      });
      proc.unref();
      fs.closeSync(logStream);
      fired.push(job.name);
    } catch (err) {
      failed.push(`${job.name} (${(err as Error).message})`);
    }
  }

  const lines: string[] = [];
  if (fired.length) lines.push(`✅ Deployed: ${fired.join(", ")}`);
  if (failed.length) lines.push(`⚠ Failed to start: ${failed.join(", ")}`);
  return lines;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const [mrr, pipeline] = await Promise.all([
    getStripeMrr(),
    getPipelineStats(),
  ]);

  const gap = MRR_TARGET - mrr;
  const socialQueue = getSocialQueueCount();
  const today = new Date().toISOString().slice(0, 10);
  const dayOfWeek = new Date().toLocaleDateString("en-US", { weekday: "long" });

  const data = { mrr, gap, pipeline, socialQueue, dayOfWeek };

  if (dryRun) {
    console.log("── CEO Drive (dry run) ──");
    console.log(`MRR: $${mrr.toLocaleString()} | Gap: $${gap.toLocaleString()}`);
    console.log(`Pipeline: ${pipeline.inSequence} in sequence | ${pipeline.replied} replied | ${pipeline.booked} booked`);
    console.log(`Social queue: ${socialQueue}/5`);
    console.log("\nRunning CEO reasoning...\n");
  }

  const ceoMessage = await runCeoReasoning(data);

  const header = `🧠 CEO DRIVE — ${dayOfWeek.toUpperCase()}\n$${mrr.toLocaleString()} MRR → $${MRR_TARGET.toLocaleString()} target | Gap: $${gap.toLocaleString()}\n\n`;
  const full = header + ceoMessage;

  if (dryRun) {
    console.log(full);
    console.log("\n── Team launch (dry run — skipped) ──");
    console.log("Would fire: LinkedIn (6 posts + blog), Facebook, Twitter (draft → post), LinkedIn Engagement, Email Pipeline, Reply Checker");
    return;
  }

  await sendTelegram(full);

  if (!noTeam) {
    const jobs = buildJobs(today);
    const statusLines = fireTeam(jobs);
    const teamMsg = `\n🚀 TEAM DEPLOYED\n${statusLines.join("\n")}\nLogs → vt-outreach/logs/${today.replace(/-/g, "")}*`;
    await sendTelegram(teamMsg);
    console.log("CEO drive + team deployment complete.");
  } else {
    console.log("CEO drive sent. Team spawn skipped (--no-team).");
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
