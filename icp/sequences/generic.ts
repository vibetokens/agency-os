import type { Lead } from "../../lib/db/schema";
import type { Sequence } from "./types";

const RULES = `
Rules:
- Subject line first: Subject: <subject> — personal, curiosity-driven, not salesy.
- Output the email as HTML. Use <br> for line breaks, <a href="https://vibetokens.io"> for links.
- No <h1>/<h2> headers. No bullet list HTML. Just clean readable text with <br> spacing.
- Short sentences throughout. Scannable on a phone.
- Confident, direct, real. Not an agency. Not a template. One guy who built something.
- Never mention previous emails in the sequence. Each one stands alone.
- Sign off: Jason, vibetokens.io
`;

export const genericSequence: Sequence = [
  {
    day: 1,
    theme: "Introduction — circular close",
    buildPrompt: (lead: Lead) => {
      const rating = lead.rating ? `${lead.rating} stars` : "strong reviews";
      const reviews = lead.reviewCount ? `${lead.reviewCount} reviews` : "reviews";
      return `You are Jason Murphy, founder of Vibe Tokens (vibetokens.io).

You built a system that moves local service businesses from whatever slow site they're running
to a modern, fast site that performs. Daily content targeting their city, services, nearby towns,
seasons. Built for Google, ChatGPT, Gemini, voice search — every surface people search from.

Write a cold intro email to ${lead.businessName} (${rating}, ${reviews}).

1. OPENER (1 sentence): Acknowledge their reviews — cool, genuine, not gushing.
2. TRANSPARENCY: "And yes, this message was sent with AI — Claude specifically."
3. INTRO: Jason, 20 years building. Link #1 to <a href="https://vibetokens.io">[anchor]</a>.
4. CASE STUDIES: Real examples, started ranking, kept growing. Link #2.
5. TECH STACK (short lines): site speed, daily content, AI search, messaging, onboarding, ops. Link #3.
6. CIRCULAR CLOSE: Circle back to their reviews — they built that reputation review by review.
   Now make sure the next client finds them before they find someone else.
   "If you're starting to feel like your current website or internet presence is falling a little behind the AI trend — this email is for you."
7. CTA: <a href="https://vibetokens.io">[3 minutes with our intake bot]</a>

${RULES}`;
    },
  },
  // Days 2–14 use the same structure as med spa but without niche-specific language.
  // Add dedicated generic prompts here as needed.
  ...Array.from({ length: 13 }, (_, i) => ({
    day: i + 2,
    theme: `Day ${i + 2}`,
    buildPrompt: (lead: Lead) => `You are Jason Murphy, founder of Vibe Tokens (vibetokens.io).
Write a short cold email (day ${i + 2} of a 14-day sequence) to ${lead.businessName} in ${lead.city}.
Focus on a specific pain point relevant to local service businesses on day ${i + 2} of the sequence.
Keep it short, direct, HTML formatted with <br> line breaks and 3 links to vibetokens.io.
${RULES}`,
  })),
];
