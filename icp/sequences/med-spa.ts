import type { Lead } from "../../lib/db/schema";
import type { SequenceEmail } from "./types";
import { buildICPSequence } from "./build";

const LP = "https://vibetokens.io/med-spa";

const PITCH_RULES = `
Rules:
- Subject line first on its own line: Subject: <subject> — personal, not marketing
- 4 sentences max. Every word earns its place.
- No AI disclosure. No agency speak. No buzzwords.
- One CTA — a single link to ${LP} with natural anchor text.
- Paragraphs as <p style="margin:0 0 16px 0;"> tags. No <br> tags. No bullet lists.
- Links: <a href="${LP}" style="color:#7c3aed;text-decoration:none;">anchor text</a>
- Tone: direct, peer-to-peer. One operator who figured something out talking to another.
- Sign off inside the final <p>: — Jason
`;

const spike: [SequenceEmail, SequenceEmail, SequenceEmail] = [

  // Day 3 — The website problem
  {
    day: 3,
    theme: "ICP pitch 1 — the site is costing you clients",
    buildPrompt: (lead: Lead) => {
      const rating = lead.rating ? `${lead.rating} stars` : "strong reviews";
      const reviews = lead.reviewCount ? `${lead.reviewCount} reviews` : "reviews";
      return `You are Jason Murphy, founder of Vibe Tokens.

Write a direct pitch email to ${lead.businessName} in ${lead.city} (${rating}, ${reviews}).

The pitch: their reputation is doing its job — the website probably isn't.
Most med spa sites are slow, can't be found for anything except the business name,
and lose the client before they ever see the work. We rebuild them in 14 days on
a stack that loads fast, ranks higher, and keeps working after launch.

This is the direct pivot after 2 elevated emails — stay warm but make the ask.
Reference their reviews briefly (they've earned them), then get to the point.

${PITCH_RULES}`;
    },
  },

  // Day 4 — Content without the effort
  {
    day: 4,
    theme: "ICP pitch 2 — content engine",
    buildPrompt: (lead: Lead) => `You are Jason Murphy, founder of Vibe Tokens.

Write a direct pitch email to ${lead.businessName} in ${lead.city}.

The pitch: a med spa that publishes consistently pulls ahead of one that doesn't —
not next year, right now. Most owners know this and don't have time to do anything
about it. We build the content system so it runs without them touching it.
Daily posts, blog content, Google-ready copy — AI-generated, brand-aligned, requires nothing from them.

Make the case specifically for a practice in ${lead.city} where local visibility is the whole game.

${PITCH_RULES}`,
  },

  // Day 5 — The close
  {
    day: 5,
    theme: "ICP pitch 3 — what we actually build, the close",
    buildPrompt: (lead: Lead) => `You are Jason Murphy, founder of Vibe Tokens.

Write a direct closing pitch to ${lead.businessName} in ${lead.city}.

The pitch: be specific about what a Vibe Tokens engagement actually delivers —
AI-native website (not WordPress, loads under 2 seconds, ranks for services not just the name),
content engine (daily output, no effort required), automated lead follow-up (no more cold leads).
All of it in 14 days.

The frame: they can keep patching the current setup, or they can spend 3 minutes
telling us what's broken and get an actual plan back.

Make this feel earned — they've heard the thinking, now they know the offer.

${PITCH_RULES}`,
  },

];

export const medSpaSequence = buildICPSequence(spike);
