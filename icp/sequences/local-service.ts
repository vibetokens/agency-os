import type { Lead } from "../../lib/db/schema";
import type { SequenceEmail } from "./types";
import { buildICPSequence } from "./build";

const LP = "https://vibetokens.io/local-service";

const PITCH_RULES = `
Rules:
- Subject line first on its own line: Subject: <subject> — personal, not marketing
- 4 sentences max. Every word earns its place.
- No AI disclosure. No agency speak. No buzzwords.
- One CTA — a single link to ${LP} with natural anchor text.
- Paragraphs as <p style="margin:0 0 16px 0;"> tags. No <br> tags. No bullet lists.
- Links: <a href="${LP}" style="color:#7c3aed;text-decoration:none;">anchor text</a>
- Tone: direct, peer-to-peer. One operator talking to another. Zero fluff.
- Sign off inside the final <p>: — Jason
`;

const spike: [SequenceEmail, SequenceEmail, SequenceEmail] = [

  // Day 3 — The lead platform problem
  {
    day: 3,
    theme: "ICP pitch 1 — stop paying for leads you don't own",
    buildPrompt: (lead: Lead) => {
      const rating = lead.rating ? `${lead.rating} stars` : "strong reviews";
      const reviews = lead.reviewCount ? `${lead.reviewCount} reviews` : "reviews";
      return `You are Jason Murphy, founder of Vibe Tokens.

Write a direct pitch email to ${lead.businessName} in ${lead.city} (${rating}, ${reviews}).

The pitch: they've built a real business with real reviews — but they're probably paying
Angi or HomeAdvisor $40-100 per lead and racing three competitors to the phone every time.
The businesses that stopped paying for leads built location pages that rank on Google.
We build that for local service companies — and Ilya's Tree Service in Cleveland is proof it works.

Reference their reviews briefly (they've earned them), then make the point direct.
This is a trades/service owner — no fluff, no agency speak, just the business problem.

${PITCH_RULES}`;
    },
  },

  // Day 4 — The invisible website
  {
    day: 4,
    theme: "ICP pitch 2 — the website ranks for nothing",
    buildPrompt: (lead: Lead) => `You are Jason Murphy, founder of Vibe Tokens.

Write a direct pitch email to ${lead.businessName} in ${lead.city}.

The pitch: most local service websites rank for exactly one thing — the business name.
That means they're invisible to the homeowner in ${lead.city} who types "tree removal near me"
or "emergency HVAC [city]" and has no idea ${lead.businessName} exists.
We build the location and service pages that show up for those searches — 100 pages, built fast.

Keep it short and punchy. This owner is on a job site reading their phone.

${PITCH_RULES}`,
  },

  // Day 5 — The close
  {
    day: 5,
    theme: "ICP pitch 3 — what we actually build, the close",
    buildPrompt: (lead: Lead) => `You are Jason Murphy, founder of Vibe Tokens.

Write a direct closing pitch to ${lead.businessName} in ${lead.city}.

The pitch: be specific about what the engagement actually delivers —
100 location + service pages (one for every neighborhood they serve × every service they offer),
technical SEO foundation built in from day one, monthly content additions without them touching anything,
and fixes deployed in minutes not days.
One monthly rate. No WordPress admin. No project creep.

The frame: they can keep running Angi, or they can spend 3 minutes telling us what they do
and get a site that earns leads without a subscription.

Make this feel earned — they've heard the logic, now give them the offer.

${PITCH_RULES}`,
  },

];

export const localServiceSequence = buildICPSequence(spike);
