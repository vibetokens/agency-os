import type { Lead } from "../../lib/db/schema";
import type { Sequence } from "./types";

const LP = "https://vibetokens.io/med-spa";

const RULES = `
Rules:
- Subject line first on its own line: Subject: <subject> — make it feel personal, not like marketing
- 4 sentences max. Every word earns its place.
- No AI disclosure. No agency speak. No buzzwords.
- One CTA at the end — a single link to ${LP} with natural anchor text.
- Paragraphs as <p style="margin:0 0 16px 0;"> tags. No <br> tags. No bullet lists.
- Links: <a href="${LP}" style="color:#7c3aed;text-decoration:none;">anchor text</a>
- Tone: one smart person talking to another. Direct. A little dry. Never salesy.
- Sign off inside the final <p>: — Jason
`;

export const medSpaSequence: Sequence = [

  // Day 1 — Introduction
  {
    day: 1,
    theme: "Introduction — circular close",
    buildPrompt: (lead: Lead) => {
      const rating = lead.rating ? `${lead.rating} stars` : "strong reviews";
      const reviews = lead.reviewCount ? `${lead.reviewCount} reviews` : "reviews";
      return `You are Jason Murphy, founder of Vibe Tokens.

Write a cold email to ${lead.businessName} in ${lead.city} (${rating}, ${reviews}).

4 sentences:
1. Acknowledge their reviews — cool, peer energy, one sentence.
2. My name is Jason, 20 years building websites, I built a system specifically for med spas.
3. Fast site, daily content, built so clients find them on Google and AI search — not just people who already know their name.
4. Circular close: they built that reputation one client at a time — make sure the next one finds them first. Then CTA.

${RULES}`;
    },
  },

  // Day 2 — Site Speed
  {
    day: 2,
    theme: "Site speed",
    buildPrompt: (lead: Lead) => `You are Jason Murphy, founder of Vibe Tokens.

Write a cold email to ${lead.businessName} in ${lead.city}.

4 sentences:
1. 53% of mobile users leave a site that takes more than 3 seconds to load. Most med spa sites take 4–7.
2. That's not a design problem — that's the first impression failing before anyone sees the work.
3. The sites I build load under 2 seconds. Google ranks faster sites higher. Clients stay longer.
4. CTA — what it looks like for a practice like theirs.

${RULES}`,
  },

  // Day 3 — SEO
  {
    day: 3,
    theme: "Ranking for your name vs your services",
    buildPrompt: (lead: Lead) => `You are Jason Murphy, founder of Vibe Tokens.

Write a cold email to ${lead.businessName} in ${lead.city}.

4 sentences:
1. Most med spas rank #1 for their own name and nothing else — that's just people who already know them.
2. The new clients are searching "Botox ${lead.city}" or "lip filler near me." That traffic goes to whoever built their site for those searches.
3. Every site I build is structured around those terms from day one — services, cities, treatments.
4. CTA.

${RULES}`,
  },

  // Day 4 — AI Search
  {
    day: 4,
    theme: "ChatGPT doesn't know you exist",
    buildPrompt: (lead: Lead) => `You are Jason Murphy, founder of Vibe Tokens.

Write a cold email to ${lead.businessName} in ${lead.city}.

4 sentences:
1. People are asking ChatGPT and Gemini for local recommendations now — "best med spa near ${lead.city}."
2. The practices that show up are the ones with structured, machine-readable content on their site. Most don't have it.
3. That window is still open in most local markets — but it won't be for long.
4. CTA.

${RULES}`,
  },

  // Day 5 — Content
  {
    day: 5,
    theme: "Content compounds",
    buildPrompt: (lead: Lead) => `You are Jason Murphy, founder of Vibe Tokens.

Write a cold email to ${lead.businessName} in ${lead.city}.

4 sentences:
1. A competitor publishing one post a day — treatments, cities, seasons — builds a compounding moat. Each post is another door into their site.
2. A post about summer body sculpting published in April gets found in March of next year. It doesn't expire.
3. This runs automatically. Nobody has to write it.
4. CTA.

${RULES}`,
  },

  // Day 6 — Voice Search
  {
    day: 6,
    theme: "Voice search",
    buildPrompt: (lead: Lead) => `You are Jason Murphy, founder of Vibe Tokens.

Write a cold email to ${lead.businessName} in ${lead.city}.

4 sentences:
1. When someone asks Siri "how long does lip filler last" or "best Botox near ${lead.city}" — the result is whoever answered that question in writing on their website.
2. Most med spa sites are brochures. They don't answer anything. Voice search skips them entirely.
3. FAQ content, treatment guides, comparison pages — this is what shows up. We build it from day one.
4. CTA.

${RULES}`,
  },

  // Day 7 — One question
  {
    day: 7,
    theme: "One question",
    buildPrompt: (lead: Lead) => `You are Jason Murphy, founder of Vibe Tokens.

Write a very short cold email to ${lead.businessName} in ${lead.city}. 3 sentences only.

1. "Quick one." — then ask: if someone searched "Botox ${lead.city}" right now, would they show up? Not their name — the service.
2. One line on what that gap costs — keep it factual, not dramatic.
3. CTA.

${RULES}`,
  },

  // Day 8 — Rebooking
  {
    day: 8,
    theme: "Revenue leaking out the back",
    buildPrompt: (lead: Lead) => `You are Jason Murphy, founder of Vibe Tokens.

Write a cold email to ${lead.businessName} in ${lead.city}.

4 sentences:
1. A client on a 3-month Botox schedule is worth 4x one who comes in once and never hears back.
2. Most practices lose the second visit because nobody followed up. Not because the client had a bad experience.
3. Automated rebooking sequences fix this completely — they run without anyone touching them.
4. CTA.

${RULES}`,
  },

  // Day 9 — Pricing hint
  {
    day: 9,
    theme: "What it costs",
    buildPrompt: (lead: Lead) => `You are Jason Murphy, founder of Vibe Tokens.

Write a cold email to ${lead.businessName} in ${lead.city}.

4 sentences:
1. I get asked what this costs a lot. It's one flat monthly number — new site included, everything runs from day one.
2. Most practices spend more than this on Google Ads alone — and get nothing when they stop paying.
3. The number is on the page, along with exactly what's included.
4. CTA.

${RULES}`,
  },

  // Day 10 — Bottleneck
  {
    day: 10,
    theme: "Everything runs through you",
    buildPrompt: (lead: Lead) => `You are Jason Murphy, founder of Vibe Tokens.

Write a cold email to ${lead.businessName} in ${lead.city}.

4 sentences:
1. In most small practices, the owner is the engine for everything — content, follow-up, onboarding, comms. That's the ceiling.
2. Systems don't replace her — they handle the work that shouldn't require her in the first place.
3. That's the only way a practice grows without the owner working more hours.
4. CTA.

${RULES}`,
  },

  // Day 11 — Competitor / first mover
  {
    day: 11,
    theme: "Someone in your market will figure this out first",
    buildPrompt: (lead: Lead) => `You are Jason Murphy, founder of Vibe Tokens.

Write a cold email to ${lead.businessName} in ${lead.city}.

4 sentences:
1. In every local market, one practice builds the content infrastructure early and owns search before competitors realize the game changed.
2. AI search and organic content compound — the practices that start now will have a 12-month head start on everyone who waits.
3. That window is still open in ${lead.city}. It won't stay that way.
4. CTA.

${RULES}`,
  },

  // Day 12 — What it looks like working
  {
    day: 12,
    theme: "The after state",
    buildPrompt: (lead: Lead) => `You are Jason Murphy, founder of Vibe Tokens.

Write a cold email to ${lead.businessName} in ${lead.city}.

4 sentences:
1. Paint the after state briefly: a practice owner who stopped spending Sundays writing captions and chasing leads — the site publishes daily, follow-up runs automatically, new clients find her on ChatGPT.
2. Same quality of work. Just more of it, without her being the bottleneck.
3. That's the difference between a job and a business.
4. CTA.

${RULES}`,
  },

  // Day 13 — Objections
  {
    day: 13,
    theme: "Direct answers",
    buildPrompt: (lead: Lead) => `You are Jason Murphy, founder of Vibe Tokens.

Write a cold email to ${lead.businessName} in ${lead.city}.

3 sentences — one for each objection, as flowing prose (no lists):
1. "I already have someone handling my site" — maintaining isn't growing.
2. "I don't have time" — that's the point, it runs without you.
3. "Not sure I need it" — fair, the page makes it easy to decide. CTA.

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
2. No hard sell — if the timing is ever right, the page is there.
3. Soft CTA.

${RULES}`,
  },
];
