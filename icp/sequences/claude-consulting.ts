import type { Lead } from "../../lib/db/schema";
import type { SequenceEmail } from "./types";
import { buildICPSequence } from "./build";

const LP = "https://vibetokens.io/claude-consulting";

const PITCH_RULES = `
Rules:
- Subject line first on its own line: Subject: <subject> — personal, not marketing
- 4 sentences max. Every word earns its place.
- No AI disclosure. No agency speak. No buzzwords.
- One CTA — a single link to ${LP} with natural anchor text.
- Paragraphs as <p style="margin:0 0 16px 0;"> tags. No <br> tags. No bullet lists.
- Links: <a href="${LP}" style="color:#7c3aed;text-decoration:none;">anchor text</a>
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

  // Day 5 — What it actually looks like
  {
    day: 5,
    theme: "ICP pitch 3 — concrete offer, close",
    buildPrompt: (lead: Lead) => `You are Jason Murphy, founder of Vibe Tokens.

Write a closing pitch to ${lead.businessName} in ${lead.city}.

The pitch: be concrete. A Claude consulting engagement means we map where they're the
bottleneck, identify the 2-3 highest-leverage workflows to automate, build and deploy
the implementation, and hand them a system that runs without them in it.

Not a monthly retainer for advice. Actual infrastructure. Real output.
If this is the right time, 3 minutes in the intake tells us everything we need to start.

${PITCH_RULES}`,
  },

];

export const claudeConsultingSequence = buildICPSequence(spike);
