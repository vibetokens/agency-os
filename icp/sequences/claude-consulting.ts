/**
 * icp/sequences/claude-consulting.ts
 *
 * 14-day email sequence for business owners, consultants, and agency owners
 * who are AI-curious but haven't built real systems yet.
 *
 * Angle: peer-to-peer from someone who runs a business on Claude.
 * No tutorials. No "have you heard of AI?" No fluff.
 * CTA: vibetokens.io/services/claude-consulting
 */

import type { Lead } from "../../lib/db/schema";
import type { Sequence } from "./types";

const LANDING = "https://vibetokens.io/services/claude-consulting";

const BASE = `
Rules:
- Max 4 sentences in the body. One point. One CTA.
- Sound like a peer, not a vendor. Write in plain English.
- No subject line emojis. No "I hope this finds you well."
- No disclosure that this was written by AI.
- Body uses <p style="margin:0 0 16px 0;"> tags for each paragraph.
- End with: Jason · VibeTokens · ${LANDING}
- First line: Subject: [subject line]
`;

export const claudeConsultingSequence: Sequence = [
  {
    day: 1,
    buildPrompt: (lead: Lead) => `
Write a cold email to the owner of ${lead.businessName} in ${lead.city}.

Angle: I saw they run a consulting/service business and wanted to share something that's been working for us. We run almost our entire business on Claude now — outreach, content, client ops, reporting. Curious if they've gotten to that point yet or if it's still on the list.

CTA: One link to see what we've built → ${LANDING}
${BASE}`,
  },
  {
    day: 2,
    buildPrompt: (lead: Lead) => `
Write a follow-up cold email to ${lead.businessName} in ${lead.city}. They haven't replied.

Angle: The specific thing most businesses miss with Claude isn't the prompts — it's the context files. Once that's set up, Claude sounds like you and the output quality jumps. It took us a day to build ours and we've never looked back.

CTA: ${LANDING}
${BASE}`,
  },
  {
    day: 3,
    buildPrompt: (lead: Lead) => `
Write a short cold email to ${lead.businessName} in ${lead.city}. They haven't replied.

Angle: Quick data point — we ran a full 30-lead ICP outreach campaign last week. Discovery, email drafting, sending, tracking. Total cost: $0.07. That's what a well-built Claude pipeline looks like. Most businesses are still copy-pasting into chat.

CTA: ${LANDING}
${BASE}`,
  },
  {
    day: 5,
    buildPrompt: (lead: Lead) => `
Write a cold email to ${lead.businessName} in ${lead.city}.

Angle: Be direct. A lot of businesses we talk to have tried Claude, got decent results, rewrote most of it anyway, and moved on. The issue isn't Claude — it's the setup. No context, no workflow, no system. We build that part.

CTA: ${LANDING}
${BASE}`,
  },
  {
    day: 7,
    buildPrompt: (lead: Lead) => `
Write a cold email to ${lead.businessName} in ${lead.city}.

Angle: The businesses getting real ROI from AI in 2026 aren't the ones with the best prompts. They're the ones who built the infrastructure once and let it run. We've built that for ourselves and now we build it for others.

Ask: What's the one thing in ${lead.businessName} that still requires ${lead.businessName.split(" ")[0]} personally every time?

CTA: ${LANDING}
${BASE}`,
  },
  {
    day: 9,
    buildPrompt: (lead: Lead) => `
Write a cold email to ${lead.businessName} in ${lead.city}.

Angle: Reference the 80-to-claude guide we sell for $79. It's the exact system and context files that let Claude handle 80% of our client work. Most people who read it build their system in a weekend. But if they'd rather have someone build it for them, that's what we do.

Mention the guide ($79) and link to the consulting page.
CTA: ${LANDING}
${BASE}`,
  },
  {
    day: 11,
    buildPrompt: (lead: Lead) => `
Write a cold email to ${lead.businessName} in ${lead.city}.

Angle: Social proof angle. The businesses we've set up Claude systems for share one thing: they can't believe they were doing it manually before. Not because the work was hard — because Claude handles it better and faster once it knows the business.

CTA: ${LANDING}
${BASE}`,
  },
  {
    day: 14,
    buildPrompt: (lead: Lead) => `
Write a final cold email to ${lead.businessName} in ${lead.city}. Last email in the sequence.

Angle: Last one. We're not going to keep nudging. If this isn't the right time, that's fine. But if the idea of handing 80% of your ops to Claude is genuinely interesting, this is how we'd build it for ${lead.businessName}.

CTA: ${LANDING}
${BASE}`,
  },
];
