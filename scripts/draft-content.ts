/**
 * scripts/draft-content.ts
 *
 * Overnight content engine for The Layer series.
 * Detects the next unpublished episode, drafts it as:
 *   - Blog post (MDX for vibetokens data/posts/)
 *   - LinkedIn post (~300 words, architecture-first)
 *   - 3 standalone tweets
 *
 * Emails Jason the drafts. Runs at 5am via Task Scheduler.
 * Brief at 5:45am will include a content snapshot.
 *
 * Usage:
 *   npm run draft-content               — draft next episode, email Jason
 *   npm run draft-content -- --dry-run  — print to console, no email
 *   npm run draft-content -- --ep 3     — force a specific episode number
 */

import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";

const TO = "jasonmatthewmurphy@gmail.com";
const POSTS_DIR = path.join(process.cwd(), "../vibetokens/data/posts");
const LAYER_LP = "https://vibetokens.io/the-layer";

// ── Series arc (source of truth) ──────────────────────────────────────────────

const EPISODES: Record<number, { title: string; slug: string; theme: string; keyLine: string; nextEp: string }> = {
  0: {
    title: "The Layer",
    slug: "the-layer",
    theme: "The thesis. Attention residue explained. App-switching as an architecture problem.",
    keyLine: "Not laziness. Architecture.",
    nextEp: "Email Is a Trap I No Longer Spring",
  },
  1: {
    title: "Email Is a Trap I No Longer Spring",
    slug: "the-layer-email",
    theme: "Email as the original attention residue machine. How Claude replaced inbox management.",
    keyLine: "Every subject line is a potential 23-minute detour.",
    nextEp: "I Stopped Owning My Calendar",
  },
  2: {
    title: "I Stopped Owning My Calendar",
    slug: "the-layer-calendar",
    theme: "Reactive calendars as scheduled attention residue. Handing scheduling logic to Claude.",
    keyLine: "Most calendars aren't a plan. They're a record of what other people wanted from you.",
    nextEp: "Social Without the Scroll",
  },
  3: {
    title: "Social Without the Scroll",
    slug: "the-layer-social",
    theme: "Using Claude to monitor what matters in your industry without ever opening the feeds. The attention residue math on a single social session. Still present on social — just not IN it.",
    keyLine: "I'm still on social. I'm just not in it.",
    nextEp: "What I Eat Shouldn't Cost Me 45 Minutes of Focus",
  },
  4: {
    title: "What I Eat Shouldn't Cost Me 45 Minutes of Focus",
    slug: "the-layer-meals",
    theme: "Meal planning as unexpected leverage. Domestic decision fatigue as residue most people never account for. Describing preferences to Claude and getting a full week back.",
    keyLine: "No Pinterest rabbit holes. No recipe sites with life stories before the ingredients.",
    nextEp: "The Body Next",
  },
  5: {
    title: "The Body Next",
    slug: "the-layer-body",
    theme: "Health as a system. Fitness app overload as residue in disguise. Having AI as a protocol builder that doesn't require visiting another app.",
    keyLine: "Four apps to track one run. That's not optimization. That's fragmentation with a subscription.",
    nextEp: "The Professor Model",
  },
  6: {
    title: "The Professor Model",
    slug: "the-layer-professor",
    theme: "Why experience without distribution is invisible. Professors as OG content marketers. How AI removed the production barrier. Who wins in the knowledge economy.",
    keyLine: "It's not what you know. It's whether anybody wants to learn it from you.",
    nextEp: "The 6am Brief",
  },
  7: {
    title: "The 6am Brief",
    slug: "the-layer-brief",
    theme: "I built an AI that emails me a CEO dashboard every morning at 6am. Revenue gap, client next actions, pipeline status, call list. The whole operation visible in 90 seconds — without opening a single app. This is what the layer looks like when it runs your business, not just your inbox.",
    keyLine: "I haven't opened a dashboard in two weeks. I don't need to.",
    nextEp: "The Pipeline That Runs at 2am",
  },
  8: {
    title: "The Pipeline That Runs at 2am",
    slug: "the-layer-pipeline",
    theme: "Every night at 2am, an automated system discovers new leads, scores them, and sends the next email in a 14-day sequence — without me touching anything. By the time I wake up, the machine has already worked. This is what it looks like to separate income generation from your time.",
    keyLine: "The pipeline doesn't care that I'm asleep.",
    nextEp: "I Automated My Revenue Tracker",
  },
  9: {
    title: "I Automated My Revenue Tracker",
    slug: "the-layer-revenue",
    theme: "I built a CLI that tracks every client, every deal, every MRR dollar, and the exact gap to my target — logged in one command, visible from anywhere. No spreadsheet. No CRM subscription. Just a database, a script, and the discipline to know your number at all times.",
    keyLine: "You can't close the gap if you don't know the number.",
    nextEp: "The Content Engine That Writes Itself",
  },
  10: {
    title: "The Content Engine That Writes Itself",
    slug: "the-layer-content-engine",
    theme: "At 5am, an automated script checks which blog episode hasn't been published yet, drafts the full post plus a LinkedIn post plus three tweets using Claude, and emails me the drafts before I wake up. The content machine runs while I sleep. This is how you publish consistently without it consuming your attention.",
    keyLine: "The draft is waiting in my inbox before I've had coffee.",
    nextEp: "Building in Public",
  },
  11: {
    title: "Building in Public",
    slug: "the-layer-open",
    theme: "The whole system — the brief, the pipeline, the revenue tracker, the content engine — is public now. The GitHub repo is live. Every script, every prompt, every bat file. Not as a product. As proof. The content moat isn't information. It's documented, working systems that other people can see, fork, and learn from.",
    keyLine: "Experience without distribution is invisible. I stopped being invisible.",
    nextEp: "The Spiritual Architecture",
  },
};

// ── Detect next episode ───────────────────────────────────────────────────────

function getNextEpisode(forceEp?: number): { epNum: number; ep: typeof EPISODES[0] } | null {
  if (forceEp !== undefined) {
    const ep = EPISODES[forceEp];
    if (!ep) return null;
    return { epNum: forceEp, ep };
  }

  // Walk episodes in order, find first whose slug is not in POSTS_DIR
  for (let i = 3; i <= 11; i++) {
    const ep = EPISODES[i];
    if (!ep) continue;
    const mdxPath = path.join(POSTS_DIR, `${ep.slug}.mdx`);
    if (!fs.existsSync(mdxPath)) {
      return { epNum: i, ep };
    }
  }
  return null; // All episodes published
}

// ── Draft blog post ───────────────────────────────────────────────────────────

async function draftBlog(client: Anthropic, ep: typeof EPISODES[0], epNum: number): Promise<string> {
  const prevEp = EPISODES[epNum - 1];

  const prompt = `You are Jason Murphy, founder of Vibe Tokens. You write "The Layer" — a personal series about replacing app fragmentation with a Claude AI layer. Voice: first-person, honest, no fluff. Architecture framing: every problem has a structural solution, not a willpower solution.

Write Episode ${epNum}: "${ep.title}"

Theme: ${ep.theme}

Gloria Mark / UC Irvine research: it takes 23 minutes to fully recover cognitive focus after an interruption. Weave this in naturally — don't force it, but don't skip it. This is the villain of the whole series.

Voice rules:
- Personal, first-person, Jason's voice
- "Not laziness. Architecture." is the thesis of the series
- Attention residue appears naturally
- No pricing. No agency pitches. One CTA at the end: ${LAYER_LP}
- 600–800 words
- End with a tease for Episode ${epNum + 1}: "${ep.nextEp}"

Format: MDX with frontmatter at top. Use this exact format:
---
title: "${ep.title}"
date: "${new Date().toISOString().slice(0, 10)}"
summary: "[one sentence summary]"
tags: ["the-layer", "attention", "productivity", "ai"]
---

[body here — paragraphs only, no headers, conversational]

[End: natural CTA sentence linking to ${LAYER_LP} with anchor text like "building your own layer" — not a sales pitch, just an invitation]

[Tease: one sentence about Episode ${epNum + 1}]

Write the full MDX now. No explanatory text before or after — just the MDX.`;

  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2000,
    messages: [{ role: "user", content: prompt }],
  });

  return (msg.content[0] as any).text.trim();
}

// ── Draft LinkedIn post ───────────────────────────────────────────────────────

async function draftLinkedIn(client: Anthropic, ep: typeof EPISODES[0], epNum: number): Promise<string> {
  const prompt = `You are Jason Murphy, founder of Vibe Tokens. Write a LinkedIn post for Episode ${epNum} of "The Layer" series.

Episode title: "${ep.title}"
Theme: ${ep.theme}

Rules:
- 200–350 words
- Architecture-first (lead with the structural insight, not the complaint)
- Weave in Gloria Mark / UC Irvine 23-minute attention residue stat naturally — cite it specifically, don't just gesture at it
- Personal voice, no buzzwords, no "I'm thrilled to share"
- End with a question or invitation that drives to: ${LAYER_LP}
- ZERO ICP language — no mention of specific niches, industries, client types, or business categories
- Audience is developers, builders, Claude Code users — talk about what's technically possible and what you're building
- Nerd references are welcome and encouraged (research citations, technical specifics, architecture concepts)
- Write like a builder documenting their process publicly, not a consultant pitching services

Write the LinkedIn post only. No explanatory text.`;

  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 800,
    messages: [{ role: "user", content: prompt }],
  });

  return (msg.content[0] as any).text.trim();
}

// ── Draft tweets ──────────────────────────────────────────────────────────────

async function draftTweets(client: Anthropic, ep: typeof EPISODES[0], epNum: number): Promise<string[]> {
  const prompt = `You are Jason Murphy, founder of Vibe Tokens. Write 3 standalone tweets for Episode ${epNum} of "The Layer" series.

Episode title: "${ep.title}"
Theme: ${ep.theme}
Key line: "${ep.keyLine}"

Rules:
- Under 280 characters each
- Each tweet stands alone — no "thread" language
- Punchy, retweet-worthy
- At least one should reference Gloria Mark / 23 minutes / attention residue
- One should end with a question
- No hashtag spam (1 hashtag max per tweet, or none)
- Voice: direct, slightly dry, respects the reader's intelligence

Return exactly 3 tweets, numbered 1. 2. 3. Nothing else.`;

  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 500,
    messages: [{ role: "user", content: prompt }],
  });

  const raw = (msg.content[0] as any).text.trim();
  return raw
    .split(/\n\d+\.\s+/)
    .filter(Boolean)
    .map((t: string) => t.trim())
    .slice(0, 3);
}

// ── Build email HTML ──────────────────────────────────────────────────────────

function buildEmail(epNum: number, title: string, slug: string, blog: string, linkedin: string, tweets: string[]): string {
  const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const blogPreview = blog.slice(0, 500).replace(/---[\s\S]*?---/, "").trim();

  return `<!DOCTYPE html>
<html>
<head><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#080A0F;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#080A0F;">
  <tr><td align="center" style="padding:24px 16px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">

      <tr><td style="border-bottom:1px solid #1e2028;padding-bottom:16px;margin-bottom:24px;">
        <p style="margin:0 0 4px 0;font-size:9px;font-weight:700;letter-spacing:0.2em;color:#00FFB2;text-transform:uppercase;">VibeTokens · Content Draft</p>
        <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;">Episode ${epNum}: "${title}"</p>
        <p style="margin:4px 0 0 0;font-size:12px;color:#52526b;">Drafted ${new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })} · Slug: ${slug}</p>
      </td></tr>

      <tr><td style="padding:20px 0 0 0;">
        <p style="margin:0 0 8px 0;font-size:9px;font-weight:700;letter-spacing:0.2em;color:#52526b;text-transform:uppercase;">Instructions</p>
        <p style="margin:0;font-size:13px;color:#8B8FA8;line-height:1.6;">
          Review the drafts below. Reply with any edits or say <strong style="color:#00FFB2;">PUBLISH [slug]</strong> to drop it into vibetokens data/posts/ and push.
          Reply <strong style="color:#FF6B35;">REWRITE</strong> to regenerate. Reply <strong style="color:#52526b;">HOLD</strong> to skip this week.
        </p>
      </td></tr>

      <!-- Blog -->
      <tr><td style="padding:24px 0 0 0;">
        <p style="margin:0 0 12px 0;font-size:9px;font-weight:700;letter-spacing:0.2em;color:#00FFB2;text-transform:uppercase;">Blog Post (MDX)</p>
        <div style="background:#0c0e13;border-left:3px solid #00FFB2;padding:16px 20px;">
          <pre style="margin:0;font-size:11px;color:#b9cbbe;white-space:pre-wrap;word-break:break-word;line-height:1.6;">${escape(blog)}</pre>
        </div>
      </td></tr>

      <!-- LinkedIn -->
      <tr><td style="padding:24px 0 0 0;">
        <p style="margin:0 0 12px 0;font-size:9px;font-weight:700;letter-spacing:0.2em;color:#7c3aed;text-transform:uppercase;">LinkedIn Post</p>
        <div style="background:#0c0e13;border-left:3px solid #7c3aed;padding:16px 20px;">
          <pre style="margin:0;font-size:12px;color:#b9cbbe;white-space:pre-wrap;word-break:break-word;line-height:1.6;">${escape(linkedin)}</pre>
        </div>
      </td></tr>

      <!-- Tweets -->
      <tr><td style="padding:24px 0 0 0;">
        <p style="margin:0 0 12px 0;font-size:9px;font-weight:700;letter-spacing:0.2em;color:#1d9bf0;text-transform:uppercase;">Tweets (standalone)</p>
        ${tweets.map((t, i) => `
        <div style="background:#0c0e13;border-left:3px solid #1d9bf0;padding:12px 16px;margin-bottom:8px;">
          <p style="margin:0 0 4px 0;font-size:9px;color:#52526b;text-transform:uppercase;">Tweet ${i + 1}</p>
          <p style="margin:0;font-size:13px;color:#ffffff;line-height:1.5;">${escape(t)}</p>
        </div>`).join("")}
      </td></tr>

      <tr><td style="border-top:1px solid #1e2028;padding-top:16px;margin-top:24px;">
        <p style="margin:0;font-size:10px;color:#52526b;">File path: vibetokens/data/posts/${slug}.mdx · Next up: Episode ${epNum + 1}</p>
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
  const forceEpArg = process.argv.indexOf("--ep");
  const forceEp = forceEpArg !== -1 ? parseInt(process.argv[forceEpArg + 1], 10) : undefined;

  const next = getNextEpisode(forceEp);
  if (!next) {
    console.log("All Layer episodes are published. No draft needed.");
    return;
  }

  const { epNum, ep } = next;
  console.log(`\nDrafting Episode ${epNum}: "${ep.title}"...`);

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  console.log("  → Blog post...");
  const blog = await draftBlog(anthropic, ep, epNum);

  console.log("  → LinkedIn post...");
  const linkedin = await draftLinkedIn(anthropic, ep, epNum);

  console.log("  → Tweets...");
  const tweets = await draftTweets(anthropic, ep, epNum);

  if (dryRun) {
    console.log("\n══ BLOG ══\n");
    console.log(blog);
    console.log("\n══ LINKEDIN ══\n");
    console.log(linkedin);
    console.log("\n══ TWEETS ══\n");
    tweets.forEach((t, i) => console.log(`${i + 1}. ${t}\n`));
    return;
  }

  const html = buildEmail(epNum, ep.title, ep.slug, blog, linkedin, tweets);
  const subject = `[VT Content] Episode ${epNum} draft ready — "${ep.title}"`;

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
  });

  await transporter.sendMail({
    from: `VibeTokens Content <${process.env.GMAIL_USER}>`,
    to: TO,
    subject,
    html,
  });

  console.log(`\n✓ Draft emailed to ${TO}`);
  console.log(`  Subject: ${subject}`);
  console.log(`  Episode: ${epNum} — "${ep.title}" (${ep.slug})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
