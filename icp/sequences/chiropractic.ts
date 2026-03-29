import type { Lead } from "../../lib/db/schema";
import type { SequenceEmail } from "./types";
import { buildICPSequence } from "./build";

const LP = "https://vibetokens.io/chiropractic";

const PITCH_RULES = `
Rules:
- Subject line first on its own line: Subject: <subject>
- Subject line: Title Case. Never all lowercase. Personal, not marketing copy.
- 4 sentences max. Every word earns its place.
- No AI disclosure. No agency speak. No buzzwords.
- One CTA — a single link to ${LP} with natural anchor text.
- Paragraphs as <p style="margin:0 0 16px 0;font-family:Georgia,serif;font-size:16px;line-height:1.7;color:#1a1a1a;"> tags. No <br> tags. No bullet lists.
- Links: <a href="${LP}" style="color:#1a1a1a;font-weight:700;text-decoration:underline;">anchor text</a>
- Tone: direct, peer-to-peer. Chiro owners are hands-on — respect the craft, talk business.
- Sign off inside the final <p>: — Jason
`;

const spike: [SequenceEmail, SequenceEmail, SequenceEmail] = [

  // Day 3 — The visibility gap
  {
    day: 3,
    theme: "ICP pitch 1 — the clinical day ends clean, the business day doesn't",
    buildPrompt: (lead: Lead) => {
      const rating = lead.rating ? `${lead.rating} stars` : "strong reviews";
      const reviews = lead.reviewCount ? `${lead.reviewCount} reviews` : "reviews";
      return `You are Jason Murphy, founder of Vibe Tokens.

Write a direct pitch email to ${lead.businessName} in ${lead.city} (${rating}, ${reviews}).

The pitch: the clinical day ends clean. The business day doesn't.
The inbox doesn't know they just finished six hours of focused patient work.
Most chiro practices have a visibility problem they haven't had time to solve —
the site ranks for the practice name, not for the conditions they treat or the
area they serve.

We fix that specifically for chiropractic practices. AI-native site, built for
local search and condition-level keywords. 14 days to live.

${PITCH_RULES}`;
    },
  },

  // Day 4 — Removing the practice owner from marketing
  {
    day: 4,
    theme: "ICP pitch 2 — marketing that runs without the owner in it",
    buildPrompt: (lead: Lead) => `You are Jason Murphy, founder of Vibe Tokens.

Write a direct pitch email to ${lead.businessName} in ${lead.city}.

The pitch: most chiro owners are excellent clinicians who didn't sign up to be marketers.
But the practice grows or stalls based on marketing, not just outcomes.

We build the system that handles it — content going out daily, leads followed up automatically,
the practice showing up where people are actually searching. None of it requires the owner's time.
They focus on patients. The system handles the rest.

${PITCH_RULES}`,
  },

  // Day 5 — The close
  {
    day: 5,
    theme: "ICP pitch 3 — the offer, the close",
    buildPrompt: (lead: Lead) => `You are Jason Murphy, founder of Vibe Tokens.

Write a closing pitch to ${lead.businessName} in ${lead.city}.

The pitch: three specific things — a site that loads fast and ranks for what people
actually search for, a content engine producing local SEO content without staff time,
and automated follow-up that converts the leads that used to go cold.

14 days. No WordPress. No monthly retainer for advice.
If ${lead.businessName} is the kind of practice that takes its growth seriously,
3 minutes in the intake tells us if it's a fit.

${PITCH_RULES}`,
  },

];

export const chiropracticSequence = buildICPSequence(spike);
