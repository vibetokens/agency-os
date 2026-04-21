/**
 * dental.ts — 5-email plain text sequence
 * v3 2026-03-31: AI search angle baked into Day 1. Plain text. No buildICPSequence.
 * "Found you on Google" opener. Single reply CTA days 1-2, link days 3-5.
 */

import type { Lead } from "../../lib/db/schema";
import type { SequenceEmail } from "./types";

const LP = "https://vibetokens.io/dental";

const RULES = `
Rules:
- Subject line first, on its own line: Subject: <subject>
- Subject line: 2-5 words. Title Case. Must name a problem or create curiosity — never declare good news.
  Good: "[N] Reviews, Zero AI Presence" / "New Patients Are Searching Wrong" / "Invisalign [City] Question" / "They Are Choosing Someone Else"
  Never: anything that sounds reassuring or like a compliment. Subject must pull with a problem.
- Body: 75-100 words total. Every sentence earns its place.
- Plain text only — no HTML tags, no markdown, no bullet points.
- Paragraphs separated by a single blank line.
- Do NOT open by complimenting their practice — lead with the problem.
- One specific outcome or proof point per email.
- CTA is specified per email — follow it exactly.
- Tone: data-first, peer-to-peer. Dentists are analytical — lead with specifics.
- Sign off on its own line: — Murph
`;

export const dentalSequence: SequenceEmail[] = [

  {
    day: 1,
    theme: "Not showing up in AI search — reviews don't fix this",
    buildPrompt: (lead: Lead) => {
      const reviews = lead.reviewCount ? `${lead.reviewCount} reviews` : "strong reviews";
      const rating = lead.rating ? `${lead.rating}-star` : "";
      return `You are Murph, the voice of Vibe Tokens.

Write a cold email to the owner of ${lead.businessName} in ${lead.city} (${rating} ${reviews}).

Structure:
1. Open with ONE sentence explaining how you found them — e.g. "Found ${lead.businessName} on Google while looking at dental practices in ${lead.city}."
2. Core pitch: patients are now asking ChatGPT and Claude things like "best dentist for Invisalign in ${lead.city}" or "who does dental implants near me." The AI gives 3-5 names. Most practices are not in that answer — and unlike Google Ads, you cannot buy your way in. The practices that appear have content-rich sites built around procedures and neighborhoods, written the way AI reads them. Most dental sites rank for the practice name and nothing else. Invite them to test it: go ask ChatGPT "best dentist in ${lead.city}" and see if they appear.
3. End with EXACTLY ONE reply question (one sentence, one question mark) followed by "Just hit reply." on its own line. Make the action completely obvious.

No link. Reply only.

${RULES}`;
    },
  },

  {
    day: 2,
    theme: "What ranking for procedures actually means",
    buildPrompt: (lead: Lead) => `You are Murph, the voice of Vibe Tokens.

Write a cold email to the owner of ${lead.businessName} in ${lead.city}.

The pitch: a page for "Invisalign ${lead.city}" — written specifically for what that patient searches — ranks differently than a generic services page. Same for "dental implants near [neighborhood]" and "emergency dentist ${lead.city}." Practices with 30-40 of these pages see a shift in how new patients find them. The appointments come from people already searching for the procedure, not from people who happened to see an ad.

CTA: reply question — "Is that the kind of new patient flow you are trying to build?" No link.

${RULES}`,
  },

  {
    day: 3,
    theme: "What we build — fast site, procedure grid, content engine",
    buildPrompt: (lead: Lead) => `You are Murph, the voice of Vibe Tokens.

Write a pitch email to the owner of ${lead.businessName} in ${lead.city}.

Be specific: an AI-native site loading under 2 seconds — most WordPress dental sites fail Google Core Web Vitals. A page for every procedure and every neighborhood in ${lead.city}. Automated content — blog posts, FAQs, Google Business updates — published weekly without effort from the practice. 14-day build.

CTA: "See the full build: ${LP}" — include the URL naturally.

${RULES}`,
  },

  {
    day: 4,
    theme: "Objection — we already have an SEO agency",
    buildPrompt: (lead: Lead) => `You are Murph, the voice of Vibe Tokens.

Write a short email to the owner of ${lead.businessName} in ${lead.city}.

The pitch: most dental practices already pay $1,500-3,000/month for SEO. The test: how many searches does ${lead.businessName} rank for beyond its own name? If the answer is unclear — that is the answer. Ranking for a practice name is not SEO. It is just being findable by patients who already know you exist. New patients do not know you exist.

CTA: ${LP} as a plain URL on the last line.

${RULES}`,
  },

  {
    day: 5,
    theme: "Last email — clean close",
    buildPrompt: (lead: Lead) => `You are Murph, the voice of Vibe Tokens.

Write the final email in a cold sequence to the owner of ${lead.businessName} in ${lead.city}.

2-3 sentences only. Last one. If the new patient discovery gap is real for them, three minutes at ${LP} is the whole ask. No follow-up after this.

CTA: ${LP} as a plain URL on its own line.

${RULES}`,
  },

];
