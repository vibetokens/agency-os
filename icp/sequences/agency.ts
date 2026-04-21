/**
 * agency.ts — 5-email plain text sequence
 * v3 2026-03-31: specific outcome proof in Day 1, tighter subject guidance.
 * No positive declarative subjects. Peer-level tone throughout.
 */

import type { Lead } from "../../lib/db/schema";
import type { SequenceEmail } from "./types";

const LP = "https://vibetokens.io/agency";

const RULES = `
Rules:
- Subject line first, on its own line: Subject: <subject>
- Subject line: 2-5 words. Title Case. Must name a problem or create curiosity — never declare good news.
  Good formats: "[City] Agency Question" / "The [Name] Ceiling" / "Question About Deliverables"
  Never: statements that sound positive, anything that reads like a newsletter headline.
- Body: 75-100 words total. Every sentence earns its place.
- Plain text only — no HTML tags, no markdown asterisks or underscores, no bullet points.
- Paragraphs separated by a single blank line.
- No AI disclosure. No agency jargon ("omnichannel", "synergy", "AI-powered leverage").
- Include ONE specific outcome or proof point — no vague claims.
- CTA is specified per email — follow it exactly.
- Tone: peer-level. You have run an agency. You solved this problem. You are not selling to them.
- Sign off on its own line: — Murph
`;

export const agencySequence: SequenceEmail[] = [

  {
    day: 1,
    theme: "Owner as ceiling — specific proof, reply CTA",
    buildPrompt: (lead: Lead) => `You are Murph, the voice of Vibe Tokens.

Write a cold email to the owner of ${lead.businessName} in ${lead.city}.

Structure:
1. Open with ONE sentence that explains how you found them — e.g. "Came across ${lead.businessName} while looking at agencies in ${lead.city}." Keep it simple and specific. Do not over-explain.
2. Then the core pitch: boutique agency owners become the ceiling — everything requiring judgment routes through them before it ships. It feels like quality control. It is actually a capacity cap. Agencies that built an AI operating layer removed the owner from the 80% that does not need their judgment specifically. One agency I work with went from the owner reviewing 40+ deliverables a week to under 10. Same output. Same standards. The owner is just no longer the connector between every step.
3. End with a reply-inviting question followed by "Just hit reply." on its own line. Example: "Is that the actual bottleneck at ${lead.businessName}? Just hit reply."

No link. Reply only. Make the action completely obvious and frictionless.

${RULES}`,
  },

  {
    day: 2,
    theme: "Tool users vs infrastructure builders — the gap is widening",
    buildPrompt: (lead: Lead) => `You are Murph, the voice of Vibe Tokens.

Write a cold email to the owner of ${lead.businessName} in ${lead.city}.

The pitch: there are agencies using AI as a tool — ChatGPT for a draft, Canva AI for an image, saving 20 minutes here and there. And there are agencies where AI is the operating system — proposals, briefs, client reports all flow through it before touching the owner queue. The second kind runs at 2-3x deliverable rate with the same headcount. Their clients notice. That gap is widening and it compounds each quarter.

CTA: reply question — "Which side of that gap is ${lead.businessName} on right now?" No link.

${RULES}`,
  },

  {
    day: 3,
    theme: "What the layer looks like — concrete, link CTA",
    buildPrompt: (lead: Lead) => `You are Murph, the voice of Vibe Tokens.

Write a pitch email to the owner of ${lead.businessName} in ${lead.city}.

Be specific: proposals, research briefs, client reports, copy drafts, and follow-up sequences — all routed through a Claude-based system before they reach the owner queue. Owner reviews final outputs only. Built in weeks, running permanently. Not a strategy document — actual infrastructure. Deliverable rate goes up. Owner review time goes down.

CTA: include the URL naturally in the last sentence — "See what it looks like in practice: ${LP}"

${RULES}`,
  },

  {
    day: 4,
    theme: "Objection — we already use AI tools",
    buildPrompt: (lead: Lead) => `You are Murph, the voice of Vibe Tokens.

Write a short email to the owner of ${lead.businessName} in ${lead.city}.

The pitch: every agency says they already use AI. Using tools still means a human prompts, reviews, and routes every piece. Infrastructure means the routing is built in — work moves from intake to delivery without the owner connecting the steps. Saving 20 minutes and running at 2x capacity are not the same outcome.

CTA: ${LP} as a plain URL on the last line.

${RULES}`,
  },

  {
    day: 5,
    theme: "Last email — 2-3 sentences, clean close",
    buildPrompt: (lead: Lead) => `You are Murph, the voice of Vibe Tokens.

Write the final email in a cold sequence to the owner of ${lead.businessName} in ${lead.city}.

2-3 sentences only. Last email. If the owner-bottleneck problem is real for them, three minutes at ${LP} is the whole ask. No follow-up after this.

CTA: ${LP} as a plain URL on its own line.

${RULES}`,
  },

];
