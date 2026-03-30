import type { Lead } from "../../lib/db/schema";
import type { SequenceEmail } from "./types";
import { buildICPSequence } from "./build";

const LP = "https://vibetokens.io/consulting";
const LP_GUIDE = "https://vibetokens.io/80-to-claude";

const PITCH_RULES = `
Rules:
- Subject line first on its own line: Subject: <subject>
- Subject line: Title Case. Never all lowercase. Personal, not marketing copy.
- 4 sentences max. Every word earns its place.
- No AI disclosure. No agency speak. No buzzwords.
- One CTA — a single link to ${LP} with natural anchor text.
- Paragraphs as <p style="margin:0 0 16px 0;font-family:Georgia,serif;font-size:16px;line-height:1.7;color:#1a1a1a;"> tags. No <br> tags. No bullet lists.
- Links: <a href="${LP}" style="color:#1a1a1a;font-weight:700;text-decoration:underline;">anchor text</a>
- Tone: peer-to-peer. One operator talking to another. Data-first. Never salesy.
- Sign off inside the final <p>: — Jason
`;

const spike: [SequenceEmail, SequenceEmail, SequenceEmail] = [

  // Day 3 — The gap
  {
    day: 3,
    theme: "ICP pitch 1 — the AI gap is the business risk",
    buildPrompt: (lead: Lead) => `You are Jason Murphy, founder of Vibe Tokens.

Write a direct pitch email to ${lead.businessName} in ${lead.city}.

The pitch: the gap between what AI-native businesses can do and what everyone else
is doing isn't closing — it's growing. Every month a business spends in the old workflow,
someone else is already live, ranking, and running automated. That's the actual business risk.

Frame it as an observation, not a warning. This owner has probably thought about AI.
They just haven't been shown where it actually moves the needle for a business like theirs.
That's the offer: a concrete Claude implementation plan built around their operation.

If they're not ready for a full consulting engagement, mention that we also run live
workshops — starting at $97 — where they can build the first layer themselves with
guidance. One sentence. Link: https://vibetokens.io/workshops formatted as:
<a href='https://vibetokens.io/workshops' style='color:#1a1a1a;font-weight:700;text-decoration:underline;'>workshops</a>

${PITCH_RULES}`,
  },

  // Day 4 — What clients are about to ask
  {
    day: 4,
    theme: "ICP pitch 2 — your clients are about to ask",
    buildPrompt: (lead: Lead) => `You are Jason Murphy, founder of Vibe Tokens.

Write a direct pitch email to ${lead.businessName} in ${lead.city}.

The pitch: their clients — and their clients' clients — are about to start asking what the
AI strategy is. Businesses that can answer that question confidently are going to stand out.
Businesses that can't are going to sound like they're behind, because they are.

We help operators in ${lead.city} build that answer — not a deck, not a strategy session,
an actual working implementation. Claude handling the workflow that's eating their best hours.

${PITCH_RULES}`,
  },

  // Day 5 — Two doors: full engagement or self-serve guide
  {
    day: 5,
    theme: "ICP pitch 3 — concrete offer, two entry points, close",
    buildPrompt: (lead: Lead) => `You are Jason Murphy, founder of Vibe Tokens.

Write a closing pitch to ${lead.businessName} in ${lead.city}.

The pitch: give them two ways in.

Door 1 — Full consulting engagement: we map where they're the bottleneck, identify
the 2-3 highest-leverage workflows to automate, build and deploy the implementation,
hand them a system that runs without them in it. Not advice. Actual infrastructure.

Door 2 — Self-serve: the 80 to Claude Guide is $79 and covers the exact system for
handing 80% of your daily business work to Claude in a weekend. No call, instant access.
Link: ${LP_GUIDE}

If they're ready to build the full system, 3 minutes at the consulting page starts that:
Link: ${LP}

Tone: give them credit for being able to decide which one is right for them. Not pushy.
One of these fits — they'll know which.

Rules:
- Subject line first on its own line: Subject: <subject>
- Subject line: Title Case. Never all lowercase.
- 4-5 sentences max. Both doors mentioned naturally, not as a list.
- No AI disclosure. No agency speak. No buzzwords.
- Two links, formatted as: <a href="URL" style="color:#1a1a1a;font-weight:700;text-decoration:underline;">anchor text</a>
- Paragraphs as <p style="margin:0 0 16px 0;font-family:Georgia,serif;font-size:16px;line-height:1.7;color:#1a1a1a;"> tags.
- Sign off inside the final <p>: — Jason`,
  },

];

export const claudeConsultingSequence = buildICPSequence(spike);
