import type { Lead } from "../../lib/db/schema";
import type { Sequence } from "./types";

const LP = "https://vibetokens.io/dental";

const RULES = `
Rules:
- Subject line first on its own line: Subject: <subject> — make it feel personal, not like marketing
- 4 sentences max. Every word earns its place.
- No AI disclosure. No agency speak. No buzzwords.
- One CTA at the end — a single link to ${LP} with natural anchor text.
- Paragraphs as <p style="margin:0 0 16px 0;"> tags. No <br> tags. No bullet lists.
- Links: <a href="${LP}" style="color:#7c3aed;text-decoration:none;">anchor text</a>
- Tone: one smart person talking to another. Direct. Slightly dry. Never salesy.
- Sign off inside the final <p>: — Jason
`;

export const dentalSequence: Sequence = [

  // Day 1 — Introduction
  {
    day: 1,
    theme: "Introduction — new patients searching, not finding",
    buildPrompt: (lead: Lead) => {
      const rating = lead.rating ? `${lead.rating} stars` : "solid reviews";
      const reviews = lead.reviewCount ? `${lead.reviewCount} reviews` : "reviews";
      return `You are Jason Murphy, founder of Vibe Tokens.

Write a cold email to ${lead.businessName} in ${lead.city} (${rating}, ${reviews}).

4 sentences:
1. Acknowledge their reviews — peer energy, warm but not sycophantic.
2. My name is Jason, I build websites and content systems for dental practices — specifically to pull in new patients who are searching for services, not just the practice name.
3. Most practices rank fine for their own name but almost nothing for "dentist ${lead.city}" or "teeth whitening near me" — that's where new patients come from.
4. CTA — link to see what it looks like for a practice like theirs.

${RULES}`;
    },
  },

  // Day 2 — New patient acquisition
  {
    day: 2,
    theme: "Where new patients actually come from",
    buildPrompt: (lead: Lead) => `You are Jason Murphy, founder of Vibe Tokens.

Write a cold email to ${lead.businessName} in ${lead.city}.

4 sentences:
1. 77% of patients search online before booking a dental appointment — not to find a specific office, but to find their options.
2. The practices that show up for "family dentist ${lead.city}" or "Invisalign near me" get first contact. Everyone else gets the referrals those practices don't want.
3. It's a ranking problem, not a reputation problem — and it's fixable with the right site structure.
4. CTA.

${RULES}`,
  },

  // Day 3 — AI search
  {
    day: 3,
    theme: "ChatGPT now recommends local dentists",
    buildPrompt: (lead: Lead) => `You are Jason Murphy, founder of Vibe Tokens.

Write a cold email to ${lead.businessName} in ${lead.city}.

4 sentences:
1. Patients are asking ChatGPT and Google AI Overview "best dentist in ${lead.city}" — and getting specific recommendations back.
2. The practices that show up are the ones with structured, machine-readable content on their site. Treatment pages, FAQs, location-specific copy.
3. Most dental sites are digital brochures — they don't answer anything, so they get skipped entirely.
4. CTA.

${RULES}`,
  },

  // Day 4 — Content compounding
  {
    day: 4,
    theme: "Content that compounds",
    buildPrompt: (lead: Lead) => `You are Jason Murphy, founder of Vibe Tokens.

Write a cold email to ${lead.businessName} in ${lead.city}.

4 sentences:
1. A competitor publishing treatment guides, FAQs, and city-specific pages monthly builds a compounding lead advantage — each page is another way a patient finds them.
2. A post about dental implant costs in ${lead.city} published today gets found two years from now. It doesn't expire.
3. The content runs automatically — no one at the practice writes anything.
4. CTA.

${RULES}`,
  },

  // Day 5 — Site speed / mobile
  {
    day: 5,
    theme: "Patients leave slow sites",
    buildPrompt: (lead: Lead) => `You are Jason Murphy, founder of Vibe Tokens.

Write a cold email to ${lead.businessName} in ${lead.city}.

4 sentences:
1. 60% of dental searches happen on mobile. Most dental sites load in 5-8 seconds on a phone — and 53% of mobile users leave before 3.
2. That's not a design problem, that's the first impression failing before the patient sees anything about the practice.
3. Sites I build load under 2 seconds. Google ranks faster sites higher. Patients stay.
4. CTA.

${RULES}`,
  },

  // Day 6 — Specific services
  {
    day: 6,
    theme: "High-value services need their own pages",
    buildPrompt: (lead: Lead) => `You are Jason Murphy, founder of Vibe Tokens.

Write a cold email to ${lead.businessName} in ${lead.city}.

4 sentences:
1. Invisalign, implants, veneers — patients searching for these are higher value and more committed than general search traffic.
2. But "best Invisalign ${lead.city}" returns whoever built a dedicated page for that search. A generic services page doesn't rank for it.
3. Each high-value service needs its own page, structured for the search. That's a one-time setup that drives patients indefinitely.
4. CTA.

${RULES}`,
  },

  // Day 7 — Short question
  {
    day: 7,
    theme: "One question",
    buildPrompt: (lead: Lead) => `You are Jason Murphy, founder of Vibe Tokens.

Write a very short cold email to ${lead.businessName} in ${lead.city}. 3 sentences only.

1. "Quick question." — ask: if someone searched "dentist ${lead.city}" right now, would they show up? Not their name — just dentist + city.
2. One line on what that gap is costing in new patients — factual, not dramatic.
3. CTA.

${RULES}`,
  },

  // Day 8 — Recall / reactivation
  {
    day: 8,
    theme: "Existing patients leaking out",
    buildPrompt: (lead: Lead) => `You are Jason Murphy, founder of Vibe Tokens.

Write a cold email to ${lead.businessName} in ${lead.city}.

4 sentences:
1. A patient who comes in twice a year is worth 4-5x one who comes once and drifts — most practices lose patients between visits not from bad experiences, but from no follow-up.
2. Automated recall sequences — 6-month reminders, lapsed patient win-backs — run without anyone touching them.
3. That's recurring revenue that was already earned. It just needs a system to collect it.
4. CTA.

${RULES}`,
  },

  // Day 9 — Pricing signal
  {
    day: 9,
    theme: "What it costs",
    buildPrompt: (lead: Lead) => `You are Jason Murphy, founder of Vibe Tokens.

Write a cold email to ${lead.businessName} in ${lead.city}.

4 sentences:
1. The most common question I get is what this costs. It's one flat monthly number — new site included, content and automation run from day one.
2. Most practices spend more than this on Google Ads alone — and get zero when they stop paying.
3. The number is on the page, along with exactly what's included.
4. CTA.

${RULES}`,
  },

  // Day 10 — Owner as bottleneck
  {
    day: 10,
    theme: "The practice shouldn't depend on you for marketing",
    buildPrompt: (lead: Lead) => `You are Jason Murphy, founder of Vibe Tokens.

Write a cold email to ${lead.businessName} in ${lead.city}.

4 sentences:
1. Most practice owners spend weekend hours on content, follow-up, and marketing — work that's necessary but shouldn't require a dentist to do it.
2. Systems don't replace clinical judgment, they handle the work that should never have needed clinical judgment in the first place.
3. That's the only way a practice grows without the owner working more.
4. CTA.

${RULES}`,
  },

  // Day 11 — First mover
  {
    day: 11,
    theme: "First mover wins the market",
    buildPrompt: (lead: Lead) => `You are Jason Murphy, founder of Vibe Tokens.

Write a cold email to ${lead.businessName} in ${lead.city}.

4 sentences:
1. In every local market, one practice builds the content infrastructure first and owns search before their competitors understand what shifted.
2. AI search and organic content compound — the practice that starts building now has a 12-18 month head start on anyone who waits.
3. That window is still open in ${lead.city}. Not for much longer.
4. CTA.

${RULES}`,
  },

  // Day 12 — The after state
  {
    day: 12,
    theme: "What running on systems looks like",
    buildPrompt: (lead: Lead) => `You are Jason Murphy, founder of Vibe Tokens.

Write a cold email to ${lead.businessName} in ${lead.city}.

4 sentences:
1. A practice where the site publishes weekly, recall runs automatically, and new patients find them on ChatGPT — that's not a fantasy, it's just the result of having the right infrastructure.
2. Same quality of care. Just more patients, without the owner being the marketing department.
3. That's the difference between a practice and a business.
4. CTA.

${RULES}`,
  },

  // Day 13 — Objections
  {
    day: 13,
    theme: "Direct answers to the usual objections",
    buildPrompt: (lead: Lead) => `You are Jason Murphy, founder of Vibe Tokens.

Write a cold email to ${lead.businessName} in ${lead.city}.

3 sentences — one for each objection, as flowing prose (no lists):
1. "I already have a website" — having one and having one that grows your patient list are different things.
2. "I don't have time to deal with this" — that's the point, it runs without you.
3. "Not sure it's worth it" — fair, the page lays out exactly what you get and what it costs. CTA.

${RULES}`,
  },

  // Day 14 — Last one
  {
    day: 14,
    theme: "Last one — door stays open",
    buildPrompt: (lead: Lead) => `You are Jason Murphy, founder of Vibe Tokens.

Write the last email in a 14-day sequence to ${lead.businessName} in ${lead.city}.

3 sentences. Warm, honest, zero pressure:
1. Acknowledge it's the last one.
2. No hard sell — if the timing's ever right, the page is there.
3. Soft CTA.

${RULES}`,
  },
];
