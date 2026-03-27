import type { Lead } from "../../lib/db/schema";
import type { SequenceEmail } from "./types";
import { buildICPSequence } from "./build";

const LP = "https://vibetokens.io/dental";

const PITCH_RULES = `
Rules:
- Subject line first on its own line: Subject: <subject> — personal, not marketing
- 4 sentences max. Every word earns its place.
- No AI disclosure. No agency speak. No buzzwords.
- One CTA — a single link to ${LP} with natural anchor text.
- Paragraphs as <p style="margin:0 0 16px 0;"> tags. No <br> tags. No bullet lists.
- Links: <a href="${LP}" style="color:#7c3aed;text-decoration:none;">anchor text</a>
- Tone: data-first, peer-to-peer. Dentists are analytical — lead with specifics.
- Sign off inside the final <p>: — Jason
`;

const spike: [SequenceEmail, SequenceEmail, SequenceEmail] = [

  // Day 3 — The site / visibility problem
  {
    day: 3,
    theme: "ICP pitch 1 — most dental sites rank for the practice name, not the procedure",
    buildPrompt: (lead: Lead) => {
      const rating = lead.rating ? `${lead.rating} stars` : "strong reviews";
      const reviews = lead.reviewCount ? `${lead.reviewCount} reviews` : "reviews";
      return `You are Jason Murphy, founder of Vibe Tokens.

Write a direct pitch email to ${lead.businessName} in ${lead.city} (${rating}, ${reviews}).

The pitch: most dental practices rank well for their own name. The problem is nobody
searches for "Clearwater Dental Group" — they search for "dentist accepting new patients
near me" or "Invisalign ${lead.city}." That's the visibility gap.

We build AI-native sites for dental practices that rank for the procedures and the area,
not just the brand. Fast load, clean structure, Google-ready from day one.

${PITCH_RULES}`;
    },
  },

  // Day 4 — Content and new patient acquisition
  {
    day: 4,
    theme: "ICP pitch 2 — new patient content without adding to the admin burden",
    buildPrompt: (lead: Lead) => `You are Jason Murphy, founder of Vibe Tokens.

Write a direct pitch email to ${lead.businessName} in ${lead.city}.

The pitch: the practices pulling ahead on new patient acquisition are publishing consistently —
procedure explainers, local SEO content, FAQ pages that answer what Google is actually being
asked. Most dental teams can't add that to the admin burden.

We build the content engine so it runs without the practice touching it.
Daily output, brand-aligned, optimized for the searches that bring in new patients —
not just people who already know the practice name.

${PITCH_RULES}`,
  },

  // Day 5 — The close
  {
    day: 5,
    theme: "ICP pitch 3 — what we build, the close",
    buildPrompt: (lead: Lead) => `You are Jason Murphy, founder of Vibe Tokens.

Write a closing pitch to ${lead.businessName} in ${lead.city}.

The pitch: be concrete. AI-native website built for procedure-level and local SEO.
Content engine producing consistent output without adding staff time.
Automated new patient follow-up so no lead goes cold after first contact.
All of it live in 14 days.

If the current setup is doing its job, keep it. If any of this matches what's
been sitting on the back burner, 3 minutes in the intake starts the conversation.

${PITCH_RULES}`,
  },

];

export const dentalSequence = buildICPSequence(spike);
