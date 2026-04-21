/**
 * med-spa.ts — 5-email plain text sequence
 * v3 2026-03-31: fixed subject line guidance — no positive declarative openers.
 * Lead with the discovery problem, not a compliment on reviews.
 */

import type { Lead } from "../../lib/db/schema";
import type { SequenceEmail } from "./types";

const LP = "https://vibetokens.io/med-spa";

const RULES = `
Rules:
- Subject line first, on its own line: Subject: <subject>
- Subject line: 2-5 words. Title Case. Must name a problem or create curiosity — never good news.
  Good: "[N] Reviews, One Problem" / "New Patients Are Missing You" / "Botox [City] Question" / "They Are Choosing Someone Else"
  Never: anything that sounds like a compliment or reassurance. Cold subject lines must pull, not comfort.
- Body: 75-100 words total. Every sentence earns its place.
- Plain text only — no HTML tags, no markdown, no bullet points.
- Paragraphs separated by a single blank line.
- Do NOT open by complimenting their reviews — lead with the problem.
- One specific outcome or proof point per email.
- CTA is specified per email — follow it exactly.
- Tone: warm but direct. One business owner to another.
- Sign off on its own line: — Murph
`;

export const medSpaSequence: SequenceEmail[] = [

  {
    day: 1,
    theme: "Invisible to new patients — reviews not the problem",
    buildPrompt: (lead: Lead) => {
      const reviews = lead.reviewCount ? `${lead.reviewCount} reviews` : "strong reviews";
      const rating = lead.rating ? `${lead.rating}-star` : "";
      return `You are Murph, the voice of Vibe Tokens.

Write a cold email to the owner of ${lead.businessName} in ${lead.city} (${rating} ${reviews}).

Structure:
1. Open with ONE sentence explaining how you found them — e.g. "Found ${lead.businessName} on Google while looking at med spas in ${lead.city}."
2. Core pitch: people are now asking ChatGPT and Claude "best med spa in ${lead.city}" or "where should I get botox in ${lead.city}." The AI gives 3-5 names. Most practices are not in that answer — and unlike Google, you cannot buy your way in. The practices that show up have content-rich, well-structured sites written the way AI reads them. Most med spa sites are built like brochures. AI skips them. Invite them to test it themselves right now — go ask ChatGPT "best med spa in ${lead.city}" and see if they appear.
3. End with a reply question + "Just hit reply." on its own line. Make it easy to say yes or no.

No link. Reply only.

${RULES}`;
    },
  },

  {
    day: 2,
    theme: "What ranking for services actually means — specific examples",
    buildPrompt: (lead: Lead) => `You are Murph, the voice of Vibe Tokens.

Write a cold email to the owner of ${lead.businessName} in ${lead.city}.

The pitch: a page for "botox ${lead.city}" — written specifically for what that patient types — ranks differently than a generic services page. Same for "lip filler near [neighborhood]" and "CoolSculpting [nearby area]." Med spas with 30-40 of these pages see a shift in how patients find them. The visits come from people already searching for the treatment, not from people who happened to see an ad or a referral.

CTA: reply question — "Is that the kind of visibility you are trying to build?" No link.

${RULES}`,
  },

  {
    day: 3,
    theme: "What we build — fast site, location grid, content engine",
    buildPrompt: (lead: Lead) => `You are Murph, the voice of Vibe Tokens.

Write a pitch email to the owner of ${lead.businessName} in ${lead.city}.

Be specific: an AI-native site loading under 2 seconds — most WordPress med spa sites fail Google Core Web Vitals. A page grid covering every treatment and neighborhood in ${lead.city}. Automated content — blog posts, FAQs, Google Business updates — published weekly without effort from the owner. 14-day build.

CTA: "See the full build: ${LP}" — include the URL naturally.

${RULES}`,
  },

  {
    day: 4,
    theme: "Objection — we already have an SEO agency",
    buildPrompt: (lead: Lead) => `You are Murph, the voice of Vibe Tokens.

Write a short email to the owner of ${lead.businessName} in ${lead.city}.

The pitch: most med spas already pay $1,500-3,000/month for SEO. The test: how many searches does ${lead.businessName} rank for beyond its own name? If the answer is unclear — that is the answer. Ranking for a practice name is not SEO. It is just being findable by people who already know you exist.

CTA: ${LP} as a plain URL on the last line.

${RULES}`,
  },

  {
    day: 5,
    theme: "Last email — clean close",
    buildPrompt: (lead: Lead) => `You are Murph, the voice of Vibe Tokens.

Write the final email in a cold sequence to the owner of ${lead.businessName} in ${lead.city}.

2-3 sentences only. Last one. If the new patient discovery gap is real, three minutes at ${LP} is the whole ask. No follow-up after this.

CTA: ${LP} as a plain URL on its own line.

${RULES}`,
  },

];
