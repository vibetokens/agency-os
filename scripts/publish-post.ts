/**
 * scripts/publish-post.ts
 *
 * Autonomous content engine — research, write, publish, post to LinkedIn + Facebook.
 * Runs without Jason. Every post goes live on vibetokens.io + social same day.
 *
 * Content types:
 *   research  — Claude ecosystem, Claude Code, MCP, AI automation intelligence
 *   build     — behind-the-build posts about systems we've shipped
 *   work      — anonymized client philosophy / patterns (no names, no niches)
 *
 * Usage:
 *   npm run publish-post -- --type research --topic "Claude Code MCP servers"
 *   npm run publish-post -- --type build --topic "automated morning brief"
 *   npm run publish-post -- --type research   (uses rotating default topics)
 *   npm run publish-post -- --dry-run         (console only, no publish/post)
 */

import { config as dotenvConfig } from "dotenv";
dotenvConfig({ path: ".env.local", override: true });
import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const POSTS_DIR = path.resolve(process.cwd(), "../vibetokens/data/posts");
const VIBETOKENS_DIR = path.resolve(process.cwd(), "../vibetokens");
const LAYER_LP = "https://vibetokens.io/the-layer";

// ── Default research topics (rotated by day of week) ─────────────────────────

const RESEARCH_TOPICS = [
  "Claude Code: what's actually possible in 2026 and how builders are using it",
  "MCP servers and the Claude ecosystem — the extension layer that changes everything",
  "Claude as operating system: the architectural shift from tool to infrastructure",
  "How autonomous agents are changing the economics of digital agency work",
  "Attention residue and the hidden cost of app-switching in modern work",
  "Building with Claude Code: patterns that actually work in production",
  "The AI-native agency model: what it looks like when Claude runs the ops layer",
];

const BUILD_TOPICS = [
  "the automated CEO brief that runs at 6am every morning",
  "the lead pipeline that discovers and emails prospects at 2am without human input",
  "the content engine that drafts blog posts and LinkedIn content overnight",
  "the revenue tracker CLI that keeps MRR visible without opening a spreadsheet",
];

// ── Voice system prompt ───────────────────────────────────────────────────────

const VOICE = `You are Jason Murphy, founder of Vibe Tokens — a Claude-native digital agency.
You write with authority, specificity, and zero fluff. Your voice blends:
- Dan Koe: systems thinking, elevation, the philosophy beneath the tactic
- Tim Denning: raw honesty, real stakes, no corporate softening
- Tom Bilyeu: intensity, transformation, respects the reader's intelligence

RULES that are absolute:
- First-person, present tense where possible
- Zero ICP language — no niches, no client types, no "if you run a dental practice"
- Zero pricing
- Architecture-first: every problem is structural, every solution is designed
- Claude-forward: Claude is infrastructure, not a productivity hack
- Nerd references are welcome — cite Gloria Mark, research, technical specifics
- No headers in the body — flowing paragraphs only, like a letter
- 600–900 words
- End with a genuine question or sharp observation, not a CTA`;

// ── Draft blog post ───────────────────────────────────────────────────────────

async function draftResearchPost(client: Anthropic, topic: string): Promise<{ mdx: string; slug: string; title: string }> {
  const today = new Date().toISOString().slice(0, 10);

  const prompt = `${VOICE}

Write a blog post about: "${topic}"

This is a research-informed post — you've been tracking the Claude ecosystem closely and are synthesizing what you're seeing, building, and learning. Write with the authority of someone who has actually shipped with Claude Code, not someone summarizing a press release.

Weave in the architectural frame throughout: the shift isn't about using a new tool, it's about redesigning how intelligence flows through an operation.

Format: MDX with this exact frontmatter:
---
title: "[sharp, specific title — not clickbait, not generic]"
date: "${today}"
summary: "[one crisp sentence — what the reader will walk away understanding]"
tags: ["claude", "claude-code", "ai", "automation", "architecture"]
category: "research"
---

[body — paragraphs only, no headers, no bullets, no markdown formatting except italics for emphasis]

Write the full MDX now. Nothing before or after — just the MDX.`;

  const msg = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2500,
    messages: [{ role: "user", content: prompt }],
  });

  const mdx = (msg.content[0] as any).text.trim();

  // Extract title and generate slug
  const titleMatch = mdx.match(/^title:\s*["'](.+?)["']/m);
  const title = titleMatch?.[1] ?? topic;
  const slug = "research-" + title
    .toLowerCase()
    .replace(/'/g, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, "-")
    .slice(0, 60)
    .replace(/-+$/, "");

  return { mdx, slug, title };
}

async function draftBuildPost(client: Anthropic, topic: string): Promise<{ mdx: string; slug: string; title: string }> {
  const today = new Date().toISOString().slice(0, 10);

  const prompt = `${VOICE}

Write a "behind the build" blog post about: ${topic}

This is a technical transparency post — you built this thing, it's running in production, and you're documenting it publicly. Not a tutorial. Not a how-to. A builder's honest account of what problem existed, how you designed the solution, what it actually does, and what it changed.

The reader is a founder, developer, or operator who might want to build something similar. Give them enough architecture to understand the design, not enough to copy it line by line.

Technical specifics: the stack is Claude API (claude-sonnet-4-6), TypeScript, Node.js, SQLite. Don't oversell. If something is janky, say so.

Format: MDX with this exact frontmatter:
---
title: "[specific, honest title about what was built]"
date: "${today}"
summary: "[one sentence: what it does and why it matters]"
tags: ["claude-code", "automation", "build", "architecture", "ai"]
category: "build"
---

[body — paragraphs only, no headers]

Write the full MDX now. Nothing before or after.`;

  const msg = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2500,
    messages: [{ role: "user", content: prompt }],
  });

  const mdx = (msg.content[0] as any).text.trim();
  const titleMatch = mdx.match(/^title:\s*["'](.+?)["']/m);
  const title = titleMatch?.[1] ?? topic;
  const slug = "build-" + title
    .toLowerCase()
    .replace(/'/g, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, "-")
    .slice(0, 60)
    .replace(/-+$/, "");

  return { mdx, slug, title };
}

// ── Generate cover image ──────────────────────────────────────────────────────

const HOPPER_DIR = path.resolve("C:/Users/jason/vt-content-hopper");

function generateCoverImage(slug: string, title: string, type: string): string | null {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    console.warn("  ⚠ GEMINI_API_KEY not set — skipping image generation");
    return null;
  }

  const category = type === "build" ? "builder-moody" : "architecture-systems";
  const name = `${slug}-cover`;
  const outPath = path.join(HOPPER_DIR, category, `${name}.jpg`);

  const prompts: Record<string, string> = {
    "builder-moody": `Dark cinematic workspace. Single open laptop on concrete desk, terminal screen glowing neon mint green (#00FFB2) showing code fragments. Black background, dramatic chiaroscuro lighting. Editorial, moody. No humans. Post context: "${title}".`,
    "architecture-systems": `Abstract digital architecture visualization. Dark background with neon mint green (#00FFB2) glowing node network, hierarchical tree structure, geometric precision. Cinematic, editorial. No text overlays. Post context: "${title}".`,
  };

  const prompt = prompts[category] ?? prompts["architecture-systems"];

  console.log(`  → Generating cover image (${category})...`);
  try {
    execSync(
      `python "${path.join(HOPPER_DIR, "generate.py")}" "${prompt.replace(/"/g, "'")}" --category ${category} --name ${name}`,
      { stdio: "pipe", env: { ...process.env, GEMINI_API_KEY: geminiKey } }
    );
    if (fs.existsSync(outPath)) {
      console.log(`  ✓ Cover image: ${outPath}`);
      return outPath;
    }
  } catch (err: any) {
    console.error("  ✗ Image generation failed:", err.message ?? err);
  }
  return null;
}

// ── Draft LinkedIn post ───────────────────────────────────────────────────────

async function draftLinkedIn(client: Anthropic, title: string, blogMdx: string): Promise<string> {
  // Strip frontmatter, take first 600 chars of body as context
  const body = blogMdx.replace(/---[\s\S]*?---/, "").trim().slice(0, 600);

  const prompt = `${VOICE}

Write a LinkedIn post adapting this blog post for LinkedIn.

Blog title: "${title}"
Blog opening: ${body}

Rules:
- 200–300 words
- Lead with the structural insight or most provocative line from the post
- Do NOT summarize — pick one angle and go deep on it
- Weave in Gloria Mark / 23-minute attention residue if it fits naturally; skip if it doesn't
- End with a genuine question that invites the Claude developer community to respond
- Link to https://vibetokens.io/blog at the end, naturally
- ZERO ICP language. ZERO niche callouts. Builder talking to builders.

Write the LinkedIn post only. Nothing else.`;

  const msg = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 600,
    messages: [{ role: "user", content: prompt }],
  });

  return (msg.content[0] as any).text.trim();
}

// ── Draft Facebook post ───────────────────────────────────────────────────────

async function draftFacebook(client: Anthropic, title: string, blogMdx: string): Promise<string> {
  const body = blogMdx.replace(/---[\s\S]*?---/, "").trim().slice(0, 600);

  const prompt = `${VOICE}

Write a Facebook post adapting this blog post. Facebook has a slightly warmer, more direct tone than LinkedIn — same intellectual depth, less corporate. Still no fluff.

Blog title: "${title}"
Blog opening: ${body}

Rules:
- 150–250 words
- Open with the sharpest insight or most provocative line
- Warmer than LinkedIn but same zero-ICP, architecture-first voice
- Link to https://vibetokens.io/blog naturally at the end
- End with a question that invites comments
- No hashtags

Write the Facebook post only. Nothing else.`;

  const msg = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 500,
    messages: [{ role: "user", content: prompt }],
  });

  return (msg.content[0] as any).text.trim();
}

// ── Publish to blog ───────────────────────────────────────────────────────────

function publishToBlog(slug: string, mdx: string): void {
  const filePath = path.join(POSTS_DIR, `${slug}.mdx`);
  fs.writeFileSync(filePath, mdx, "utf8");
  console.log(`  ✓ Written: data/posts/${slug}.mdx`);

  // Git add, commit, push
  execSync(`git -C "${VIBETOKENS_DIR}" add data/posts/${slug}.mdx`, { stdio: "pipe" });
  execSync(
    `git -C "${VIBETOKENS_DIR}" commit -m "Publish: ${slug}"`,
    { stdio: "pipe" }
  );
  execSync(`git -C "${VIBETOKENS_DIR}" push origin main`, { stdio: "pipe" });
  console.log(`  ✓ Pushed to GitHub → Vercel deploying`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const typeArg = args.indexOf("--type") !== -1 ? args[args.indexOf("--type") + 1] : "research";
  const topicArg = args.indexOf("--topic") !== -1 ? args[args.indexOf("--topic") + 1] : null;

  const type = typeArg as "research" | "build" | "work";
  const topic = topicArg ?? (
    type === "build"
      ? BUILD_TOPICS[new Date().getDay() % BUILD_TOPICS.length]
      : RESEARCH_TOPICS[new Date().getDay() % RESEARCH_TOPICS.length]
  );

  console.log(`\n[publish-post] Type: ${type} | Topic: ${topic}`);

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  let result: { mdx: string; slug: string; title: string };

  if (type === "build") {
    console.log("  → Drafting build post...");
    result = await draftBuildPost(anthropic, topic);
  } else {
    console.log("  → Drafting research post...");
    result = await draftResearchPost(anthropic, topic);
  }

  console.log("  → Drafting LinkedIn + Facebook posts...");
  const [linkedin, facebook] = await Promise.all([
    draftLinkedIn(anthropic, result.title, result.mdx),
    draftFacebook(anthropic, result.title, result.mdx),
  ]);

  if (dryRun) {
    console.log("\n══ BLOG MDX ══\n");
    console.log(result.mdx);
    console.log("\n══ LINKEDIN ══\n");
    console.log(linkedin);
    console.log("\n══ FACEBOOK ══\n");
    console.log(facebook);
    console.log(`\nSlug would be: ${result.slug}`);
    return;
  }

  // Generate cover image
  const imagePath = generateCoverImage(result.slug, result.title, type);

  // Publish blog
  console.log("\n  Publishing to blog...");
  publishToBlog(result.slug, result.mdx);

  // Stage LinkedIn post
  const liFile = path.join(process.cwd(), "pending-linkedin.txt");
  fs.writeFileSync(liFile, JSON.stringify({ title: result.title, post: linkedin, slug: result.slug, imagePath }), "utf8");
  console.log(`  ✓ LinkedIn post staged → run: npm run post-linkedin`);

  // Stage Facebook post
  const fbFile = path.join(process.cwd(), "pending-facebook.txt");
  fs.writeFileSync(fbFile, JSON.stringify({ title: result.title, post: facebook, slug: result.slug, imagePath }), "utf8");
  console.log(`  ✓ Facebook post staged → run: npm run post-facebook`);

  console.log(`\n✓ Published: https://vibetokens.io/blog/${result.slug}`);
  console.log(`  Title: "${result.title}"`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
