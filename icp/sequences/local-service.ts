/**
 * local-service.ts — 5-email plain text sequence
 * v3 2026-03-31: Ilya proof baked into Day 1 with specifics. Tighter subject guidance.
 * Plain text, 75-100 words, reply CTAs days 1-2, link days 3-5.
 */

import type { Lead } from "../../lib/db/schema";
import type { SequenceEmail } from "./types";

const LP = "https://vibetokens.io/local-service";

const RULES = `
Rules:
- Subject line first, on its own line: Subject: <subject>
- Subject line: 2-5 words. Title Case. Must name a specific problem or create curiosity.
  Good: "[N] Reviews, Zero Rankings" / "Free Leads In [City]" / "[City] Tree Companies" / "Paying Angi For This?"
  Never: anything that sounds like good news, generic ("Quick Question"), or unrelated to their trade.
- Body: 75-100 words total. No filler.
- Plain text only — no HTML tags, no markdown, no bullet points.
- Paragraphs separated by a single blank line.
- One specific outcome or real client example per email.
- CTA is specified per email — follow it exactly.
- Tone: direct. They are on a job site reading their phone. Get to the point fast.
- Sign off on its own line: — Jason
`;

export const localServiceSequence: SequenceEmail[] = [

  {
    day: 1,
    theme: "Angi per-lead trap — Ilya proof baked in",
    buildPrompt: (lead: Lead) => {
      const reviews = lead.reviewCount ? `${lead.reviewCount}` : "hundreds of";
      return `You are Jason Murphy, founder of Vibe Tokens.

Write a cold email to the owner of ${lead.businessName} in ${lead.city}.

Structure:
1. Open with ONE sentence explaining how you found them — e.g. "Found ${lead.businessName} on Google while looking at tree service companies in ${lead.city}."
2. Core pitch: homeowners are now asking ChatGPT and Claude things like "best tree service in ${lead.city}" or "who should I call for emergency tree removal near me." The AI gives 3-5 names. Most local service companies are not in that list — and you cannot pay to be. The ones that show up have structured, content-rich sites that AI can actually read and recommend. Most local service websites are invisible to AI. Drop the Ilya proof point: Ilya Tree Service in Cleveland had the same problem. We rebuilt their site and built 100+ location pages — every service, every neighborhood. They now show up in AI recommendations across 16 Cleveland neighborhoods. No more Angi.
3. Connect to this lead: ${lead.businessName} has ${reviews} Google reviews. That trust is already earned. The site just is not built for how people search now.
4. End with EXACTLY ONE reply question (one sentence, one question mark) followed by "Just hit reply." on its own line. Do not add a second question.

No link. Reply only.

${RULES}`;
    },
  },

  {
    day: 2,
    theme: "Zoom in on Ilya results — specific neighborhoods",
    buildPrompt: (lead: Lead) => `You are Jason Murphy, founder of Vibe Tokens.

Write a cold email to the owner of ${lead.businessName} in ${lead.city}.

The pitch: Ilya Tree Service in Cleveland has a page for "tree removal Lakewood," "stump grinding Rocky River," "emergency tree service Westlake" — and 13 more neighborhoods. Each one ranks because it was written for exactly what homeowners in that area search. They stopped paying Angi entirely. The same structure works for any local service company with an established area and real reviews.

CTA: reply question — "Is that kind of lead flow worth a conversation?" No link.

${RULES}`,
  },

  {
    day: 3,
    theme: "What we build — one page per service/area combo",
    buildPrompt: (lead: Lead) => `You are Jason Murphy, founder of Vibe Tokens.

Write a pitch email to the owner of ${lead.businessName} in ${lead.city}.

Be concrete: one page for every combination of service and service area. Tree removal in ${lead.city}. Stump grinding in a nearby town. Emergency service in an adjacent neighborhood. 100 pages built in a week, each targeting exactly what homeowners in that area search for. Monthly additions. One flat rate — no per-lead, no per-click.

CTA: include the URL naturally — "See how it is structured: ${LP}"

${RULES}`,
  },

  {
    day: 4,
    theme: "Objection — our current site is fine",
    buildPrompt: (lead: Lead) => `You are Jason Murphy, founder of Vibe Tokens.

Write a short email to the owner of ${lead.businessName} in ${lead.city}.

The pitch: "our site is fine" usually means it ranks for the business name and nothing else. The homeowner typing "emergency tree removal ${lead.city}" at 9pm does not know the name. Fine does not earn that call. There is a direct line between how many service-area pages a local company has and how many inbound calls they get. Most sites have zero.

CTA: ${LP} as a plain URL on the last line.

${RULES}`,
  },

  {
    day: 5,
    theme: "Last email — clean close",
    buildPrompt: (lead: Lead) => `You are Jason Murphy, founder of Vibe Tokens.

Write the final email in a cold sequence to the owner of ${lead.businessName} in ${lead.city}.

2-3 sentences only. Last one. If the per-lead cost is real for them, three minutes at ${LP} is the whole ask. No follow-up after this.

CTA: ${LP} as a plain URL on its own line.

${RULES}`,
  },

];
