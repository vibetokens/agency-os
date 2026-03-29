import type { Lead } from "../../lib/db/schema";
import type { SequenceEmail } from "./types";

const LP = "https://vibetokens.io/local-service";

const RULES = `
Rules:
- Subject line first on its own line: Subject: <subject>
- Subject line: Title Case. Never all lowercase. Personal, not marketing copy.
- 4 sentences max. Every word earns its place.
- No AI disclosure. No agency speak. No buzzwords.
- One CTA — a single link to ${LP} with natural anchor text.
- Paragraphs as <p style="margin:0 0 16px 0;font-family:Georgia,serif;font-size:16px;line-height:1.7;color:#1a1a1a;"> tags.
- Links: <a href="${LP}" style="color:#1a1a1a;font-weight:700;text-decoration:underline;">anchor text</a> — bold underline, no color
- Formatting: use <strong> to bold key phrases (1-2 per email). Use <em> for italics on a single sharp idea. Use <u> once max, only for the most important line.
- Write like Bilyeau — short punchy sentences. One idea per line. Whitespace is emphasis.
- Sign off inside the final <p>: — Jason
`;

export const localServiceSequence: SequenceEmail[] = [

  // Day 1 — The lead platform problem
  {
    day: 1,
    theme: "Lead platforms are selling your lead to three competitors",
    buildPrompt: (lead: Lead) => {
      const rating = lead.rating ? `${lead.rating} stars` : "strong reviews";
      const reviews = lead.reviewCount ? `${lead.reviewCount} reviews` : "good reviews";
      return `You are Jason Murphy, founder of Vibe Tokens.

Write a cold email to the owner of ${lead.businessName} in ${lead.city} (${rating}, ${reviews}).

The pitch: Angi and HomeAdvisor sell the same lead to 3 companies. You pay $50-100, race to the phone,
and cut your margin to win. The businesses that stopped doing that built location pages on Google —
one page for "tree removal in [neighborhood]" earns those calls for free, permanently.
That's what we build for local service companies.

Get to the point in sentence one. Reference their reviews (they've earned them) but don't dwell.
This owner is probably on a job site reading their phone between calls.

${RULES}`;
    },
  },

  // Day 2 — The invisible website
  {
    day: 2,
    theme: "Your website ranks for your name and nothing else",
    buildPrompt: (lead: Lead) => `You are Jason Murphy, founder of Vibe Tokens.

Write a cold email to the owner of ${lead.businessName} in ${lead.city}.

The pitch: most local service websites rank for exactly one thing — the business name.
That means they're invisible to anyone who hasn't already heard of them.
The homeowner in ${lead.city} who types "tree removal near me" has no idea ${lead.businessName} exists.
We build 100 location and service pages so you show up for those searches.

Short, direct, no fluff. This owner doesn't need a lecture — they need one clear idea.

${RULES}`,
  },

  // Day 3 — What we actually build
  {
    day: 3,
    theme: "What the engagement actually looks like",
    buildPrompt: (lead: Lead) => `You are Jason Murphy, founder of Vibe Tokens.

Write a direct pitch email to ${lead.businessName} in ${lead.city}.

The pitch: be specific — we build one page for every combination of their services and service areas.
Tree removal in Lakewood. Stump grinding in Rocky River. Emergency service in Westlake.
100 pages in a few days, each one targeting exactly what homeowners in that town are searching.
Monthly additions, instant deploys, one flat rate.

This is the specificity email — make it concrete and real.

${RULES}`,
  },

  // Day 4 — Proof point
  {
    day: 4,
    theme: "Ilya's Tree Service proof point",
    buildPrompt: (lead: Lead) => `You are Jason Murphy, founder of Vibe Tokens.

Write a short proof email to ${lead.businessName} in ${lead.city}.

The pitch: name-drop Ilya's Tree Service in Cleveland as a real example —
we built 100+ location and service pages across 16 Cleveland neighborhoods.
Now it ranks for tree removal, stump grinding, and emergency service in every one of them.
That's what we do for service companies. Same thing for ${lead.businessName} in ${lead.city}.

Keep it short — one real example is worth more than a paragraph of claims.

${RULES}`,
  },

  // Day 5 — The close
  {
    day: 5,
    theme: "Three minutes to find out if it makes sense",
    buildPrompt: (lead: Lead) => `You are Jason Murphy, founder of Vibe Tokens.

Write a short closing email to ${lead.businessName} in ${lead.city}.

The pitch: they've heard the idea — stop paying per lead, build pages that rank and earn calls permanently.
Takes 3 minutes to tell us what they do and where they work.
We come back with a real plan, not a proposal.
If it's not a fit, they'll know that too.

Low-pressure close. Make it feel easy to take the next step.

${RULES}`,
  },

];
