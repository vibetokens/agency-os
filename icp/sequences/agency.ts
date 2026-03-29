import type { Lead } from "../../lib/db/schema";
import type { SequenceEmail } from "./types";
import { buildICPSequence } from "./build";

const LP = "https://vibetokens.io/agency";

const PITCH_RULES = `
Rules:
- Subject line first on its own line: Subject: <subject>
- Subject line: Title Case. Never all lowercase. Personal, not marketing copy.
- 4 sentences max. Every word earns its place.
- No AI disclosure. No agency speak. No buzzwords.
- One CTA — a single link to ${LP} with natural anchor text.
- Paragraphs as <p style="margin:0 0 16px 0;font-family:Georgia,serif;font-size:16px;line-height:1.7;color:#1a1a1a;"> tags. No <br> tags. No bullet lists.
- Links: <a href="${LP}" style="color:#1a1a1a;font-weight:700;text-decoration:underline;">anchor text</a>
- Tone: one agency operator to another. Direct. Slightly dry. Respects their intelligence.
- Sign off inside the final <p>: — Jason
`;

const spike: [SequenceEmail, SequenceEmail, SequenceEmail] = [

  // Day 3 — The owner-as-bottleneck problem
  {
    day: 3,
    theme: "ICP pitch 1 — the owner is the ceiling",
    buildPrompt: (lead: Lead) => `You are Jason Murphy, founder of Vibe Tokens.

Write a direct pitch email to ${lead.businessName} in ${lead.city}.

The pitch: in most agencies, the owner is the bottleneck. Every deliverable that requires
judgment, every client question that needs a real answer, every proposal that needs a brain
behind it — it routes through them. That's a ceiling, not a business.

AI doesn't replace the judgment. It removes them from every layer that doesn't require it.
The output stays the same. The owner gets their hours back.

We build the AI operating layer for boutique agencies — the infrastructure that lets
the work ship without everything running through one person.

${PITCH_RULES}`,
  },

  // Day 4 — What clients are about to ask
  {
    day: 4,
    theme: "ICP pitch 2 — your clients are about to ask what your AI strategy is",
    buildPrompt: (lead: Lead) => `You are Jason Murphy, founder of Vibe Tokens.

Write a direct pitch email to ${lead.businessName} in ${lead.city}.

The pitch: their clients are about to start asking what the AI strategy is.
Agencies that can answer that question confidently — and show the work — are going to
differentiate. Agencies that can't are going to look like they're catching up.

We help agencies in ${lead.city} build that answer from the inside: an AI workflow
that runs their operation, plus the positioning to make it a competitive advantage
instead of a question they're dreading.

${PITCH_RULES}`,
  },

  // Day 5 — The close
  {
    day: 5,
    theme: "ICP pitch 3 — what we build, the close",
    buildPrompt: (lead: Lead) => `You are Jason Murphy, founder of Vibe Tokens.

Write a closing pitch to ${lead.businessName} in ${lead.city}.

The pitch: be concrete. An AI architecture audit to find where the bottlenecks are.
A workflow layer built on Claude that removes the owner from repetitive output.
Client-facing AI positioning they can actually use. All of it built and deployed —
not a strategy deck, not a monthly call, actual infrastructure.

If any of this maps to where ${lead.businessName} is right now, 3 minutes in the
intake gets the conversation started.

${PITCH_RULES}`,
  },

];

export const agencySequence = buildICPSequence(spike);
