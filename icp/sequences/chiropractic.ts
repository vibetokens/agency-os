/**
 * chiropractic.ts — 5-email plain text sequence
 * v3 2026-03-31: AI search angle baked into Day 1. Plain text. No buildICPSequence.
 * "Found you on Google" opener. Single reply CTA days 1-2, link days 3-5.
 */

import type { Lead } from "../../lib/db/schema";
import type { SequenceEmail } from "./types";

const LP = "https://vibetokens.io/chiropractic";

const RULES = `
Rules:
- Subject line first, on its own line: Subject: <subject>
- Subject line: 2-5 words. Title Case. Must name a problem or create curiosity — never declare good news.
  Good: "[N] Reviews, One Blind Spot" / "Patients Can't Find You" / "[City] Chiro Question" / "They Are Choosing Someone Else"
  Never: anything that sounds reassuring. Subject must pull with a problem or create curiosity.
- Body: 75-100 words total. Every sentence earns its place.
- Plain text only — no HTML tags, no markdown, no bullet points.
- Paragraphs separated by a single blank line.
- Do NOT open by complimenting the practice — lead with the problem.
- One specific outcome or proof point per email.
- CTA is specified per email — follow it exactly.
- Tone: direct, peer-to-peer. Chiro owners are hands-on — respect the craft, talk business.
- Sign off on its own line: — Murph
`;

export const chiropracticSequence: SequenceEmail[] = [

  {
    day: 1,
    theme: "Not showing up in AI search — reviews don't fix this",
    buildPrompt: (lead: Lead) => {
      const reviews = lead.reviewCount ? `${lead.reviewCount} reviews` : "strong reviews";
      const rating = lead.rating ? `${lead.rating}-star` : "";
      return `You are Murph, the voice of Vibe Tokens.

Write a cold email to the owner of ${lead.businessName} in ${lead.city} (${rating} ${reviews}).

Structure:
1. Open with ONE sentence explaining how you found them — e.g. "Found ${lead.businessName} on Google while looking at chiropractic practices in ${lead.city}."
2. Core pitch: patients are now asking ChatGPT and Claude things like "best chiropractor for lower back pain in ${lead.city}" or "sports chiropractor near me." The AI gives 3-5 names. Most practices are not in that answer — and unlike Google Ads, you cannot buy your way in. The practices that appear have sites built around conditions and neighborhoods, written the way AI reads them. Most chiro sites rank for the practice name only. Invite them to test it: go ask ChatGPT "best chiropractor in ${lead.city}" right now and see if they appear.
3. End with EXACTLY ONE reply question (one sentence, one question mark) followed by "Just hit reply." on its own line. Make the action completely obvious.

No link. Reply only.

${RULES}`;
    },
  },

  {
    day: 2,
    theme: "What ranking for conditions actually means",
    buildPrompt: (lead: Lead) => `You are Murph, the voice of Vibe Tokens.

Write a cold email to the owner of ${lead.businessName} in ${lead.city}.

The pitch: a page for "lower back pain chiropractor ${lead.city}" — written specifically for what that patient searches — ranks differently than a generic services page. Same for "sports injury chiro near [neighborhood]" and "sciatica treatment ${lead.city}." Practices with 30-40 of these pages see a shift in how new patients find them. The appointments come from people already searching for the condition, not from people who happened to see an ad.

CTA: reply question — "Is that the kind of new patient flow you are trying to build?" No link.

${RULES}`,
  },

  {
    day: 3,
    theme: "What we build — fast site, condition grid, content engine",
    buildPrompt: (lead: Lead) => `You are Murph, the voice of Vibe Tokens.

Write a pitch email to the owner of ${lead.businessName} in ${lead.city}.

Be specific: an AI-native site loading under 2 seconds — most WordPress chiro sites fail Google Core Web Vitals. A page for every condition and every neighborhood in ${lead.city}. Automated content — blog posts, FAQs, Google Business updates — published weekly without any staff time. 14-day build.

CTA: "See the full build: ${LP}" — include the URL naturally.

${RULES}`,
  },

  {
    day: 4,
    theme: "Objection — the clinical day takes everything",
    buildPrompt: (lead: Lead) => `You are Murph, the voice of Vibe Tokens.

Write a short email to the owner of ${lead.businessName} in ${lead.city}.

The pitch: most chiro owners are excellent clinicians who did not sign up to be marketers. But the practice grows or stalls based on visibility, not just outcomes. The problem is most chiro sites rank only for the practice name — not for the conditions treated or the area served. Patients searching "sciatica chiropractor ${lead.city}" at 9pm do not know the name. They go to whoever shows up.

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
