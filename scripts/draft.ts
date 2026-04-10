/**
 * scripts/draft.ts
 *
 * Drafts personalized comments for posts using Claude.
 * Processes all posts that don't yet have a comment in the queue.
 *
 * Usage:
 *   npx tsx scripts/draft.ts
 *   npx tsx scripts/draft.ts --limit 20
 */

import { config as dotenvConfig } from "dotenv";
dotenvConfig({ path: ".env.local", override: true });
import Anthropic from "@anthropic-ai/sdk";
import { withRetry } from "../lib/anthropic-retry";
import { db, schema } from "../lib/db";
import { eq, isNull, inArray } from "drizzle-orm";

const { posts, comments, socialProfiles, leads } = schema;

const PROMPT_VERSION = "v1";

// Niche-specific tone hints fed into the system prompt
const NICHE_HINTS: Record<string, string> = {
  plumber: "plumbing, water systems, emergency repairs, licensed contractors",
  hvac: "heating, cooling, air quality, seasonal maintenance, energy efficiency",
  cleaning: "cleaning, tidying, professional cleaning services, recurring schedules",
  lawyer: "legal services, attorney, consultation, legal advice, case outcomes",
  electrician: "electrical work, wiring, panel upgrades, code compliance, safety",
  landscaping: "landscaping, lawn care, outdoor spaces, curb appeal, seasonal work",
  default: "local services, customer experience, reliability, community trust",
};

function getNicheHint(niche: string): string {
  return NICHE_HINTS[niche.toLowerCase()] ?? NICHE_HINTS.default;
}

function buildSystemPrompt(niche: string, businessName: string): string {
  const hint = getNicheHint(niche);

  return `You are a knowledgeable peer in the ${niche} and small business space.
You are commenting on a social media post from ${businessName}, a local ${niche} business.

Your goal: write a genuine, helpful comment that adds real value to the conversation.
You are NOT writing a sales pitch. You are being a helpful, engaged community member.

At the end of the comment, naturally weave in that you work with local service businesses
on their online presence at vibetokens.io — only if it genuinely fits the post topic.
If the post is unrelated to growth, marketing, or web presence, skip the CTA entirely.

Tone: warm, peer-to-peer, conversational. Never use buzzwords or sound like a bot.
Relevant context: ${hint}

Rules:
- Maximum 3 sentences
- Do NOT use hashtags
- Do NOT use emojis unless the original post does
- Do NOT mention AI, Claude, or automation
- Sound like Jason: direct, confident, helpful`;
}

function buildUserPrompt(postText: string, platform: string): string {
  return `Here is the ${platform} post from the business:

"${postText}"

Write a helpful comment that adds value to this post.`;
}

function parseArgs(): { limit: number } {
  const args = process.argv.slice(2);
  const idx = args.indexOf("--limit");
  return { limit: idx !== -1 ? parseInt(args[idx + 1], 10) : 30 };
}

async function main() {
  const { limit } = parseArgs();
  const client = new Anthropic();

  // Find posts that don't have a comment yet
  const allComments = await db.select({ postId: comments.postId }).from(comments);
  const commentedPostIds = allComments.map((c) => c.postId);

  const unprocessedPosts = await db
    .select({
      post: posts,
      profile: socialProfiles,
      lead: leads,
    })
    .from(posts)
    .innerJoin(socialProfiles, eq(posts.socialProfileId, socialProfiles.id))
    .innerJoin(leads, eq(socialProfiles.leadId, leads.id))
    .limit(limit * 3); // over-fetch, filter in JS

  const toProcess = unprocessedPosts
    .filter(
      (row) =>
        !commentedPostIds.includes(row.post.id) &&
        row.post.postText &&
        row.post.postText.length > 30
    )
    .slice(0, limit);

  if (toProcess.length === 0) {
    console.log("No new posts to draft comments for.");
    return;
  }

  console.log(`\nDrafting comments for ${toProcess.length} posts...\n`);

  let drafted = 0;

  for (const row of toProcess) {
    const { post, profile, lead } = row;
    process.stdout.write(`[${post.id}] ${lead.businessName} (${profile.platform})... `);

    try {
      const message = await withRetry(() =>
        client.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 300,
          system: buildSystemPrompt(lead.niche, lead.businessName),
          messages: [
            {
              role: "user",
              content: buildUserPrompt(post.postText!, profile.platform),
            },
          ],
        }),
      );

      const draft =
        message.content[0].type === "text" ? message.content[0].text.trim() : "";

      if (!draft) {
        console.log("empty response, skipping");
        continue;
      }

      await db.insert(comments).values({
        postId: post.id,
        draft,
        status: "pending",
        promptVersion: PROMPT_VERSION,
      });

      // Advance lead status
      if (lead.status === "monitoring") {
        await db
          .update(leads)
          .set({ status: "draft_ready", updatedAt: new Date().toISOString() })
          .where(eq(leads.id, lead.id));
      }

      drafted++;
      console.log("done");
    } catch (err) {
      console.log(`error: ${(err as Error).message}`);
    }

    // Stay well within Claude rate limits
    await new Promise((r) => setTimeout(r, 400));
  }

  console.log(`\nDrafted ${drafted} comments. Ready for review at /queue.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
