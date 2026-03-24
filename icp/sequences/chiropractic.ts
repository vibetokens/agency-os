import type { Lead } from "../../lib/db/schema";
import type { Sequence } from "./types";

const LP = "https://vibetokens.io/chiropractic";

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

export const chiropracticSequence: Sequence = [

  // Day 1 — Introduction
  {
    day: 1,
    theme: "Introduction — patients searching for relief, not finding them",
    buildPrompt: (lead: Lead) => {
      const rating = lead.rating ? `${lead.rating} stars` : "solid reviews";
      const reviews = lead.reviewCount ? `${lead.reviewCount} reviews` : "reviews";
      return `You are Jason Murphy, founder of Vibe Tokens.

Write a cold email to ${lead.businessName} in ${lead.city} (${rating}, ${reviews}).

4 sentences:
1. Acknowledge their reviews — peer energy, warm but not over the top.
2. My name is Jason, I build websites and content systems for chiropractic practices — to pull in new patients who are actively searching for pain relief, not just people who already know the practice name.
3. Most practices rank well for their own name and almost nothing for "chiropractor ${lead.city}" or "back pain relief near me" — that's where new patients come from.
4. CTA — link to see what it looks like for a practice like theirs.

${RULES}`;
    },
  },

  // Day 2 — Pain-driven search
  {
    day: 2,
    theme: "Patients search when they're in pain",
    buildPrompt: (lead: Lead) => `You are Jason Murphy, founder of Vibe Tokens.

Write a cold email to ${lead.businessName} in ${lead.city}.

4 sentences:
1. Patients searching "chiropractor ${lead.city}" or "sciatica treatment near me" are in pain right now — high intent, ready to book.
2. The practice that shows up gets the call. The ones that don't, don't.
3. Ranking for those searches is a site structure problem — not a reputation problem, and it's fixable.
4. CTA.

${RULES}`,
  },

  // Day 3 — AI search
  {
    day: 3,
    theme: "AI search recommends local chiropractors",
    buildPrompt: (lead: Lead) => `You are Jason Murphy, founder of Vibe Tokens.

Write a cold email to ${lead.businessName} in ${lead.city}.

4 sentences:
1. Patients are asking ChatGPT "best chiropractor in ${lead.city}" and getting specific practices recommended back.
2. The ones showing up have structured content — condition-specific pages, FAQs, local copy. The ones that don't have it get skipped entirely.
3. That window is still open in most local markets — but the practices building content now will own it.
4. CTA.

${RULES}`,
  },

  // Day 4 — Condition pages
  {
    day: 4,
    theme: "Each condition is a different patient looking for you",
    buildPrompt: (lead: Lead) => `You are Jason Murphy, founder of Vibe Tokens.

Write a cold email to ${lead.businessName} in ${lead.city}.

4 sentences:
1. "Back pain chiropractor ${lead.city}", "neck pain relief", "sports injury chiro" — each of these is a different patient searching for a different thing.
2. A generic services page doesn't capture any of them. Dedicated condition pages do.
3. That's one-time setup that drives specific, high-intent patients indefinitely.
4. CTA.

${RULES}`,
  },

  // Day 5 — Content compounding
  {
    day: 5,
    theme: "Content that finds patients before they find you",
    buildPrompt: (lead: Lead) => `You are Jason Murphy, founder of Vibe Tokens.

Write a cold email to ${lead.businessName} in ${lead.city}.

4 sentences:
1. A competitor publishing guides on sciatica, herniated discs, sports injuries — each is another doorway into their site that costs nothing once it's built.
2. A piece on "how many chiropractic sessions for back pain" published today gets found two years from now. It doesn't expire.
3. This runs automatically. Nobody at the practice writes anything.
4. CTA.

${RULES}`,
  },

  // Day 6 — Site speed
  {
    day: 6,
    theme: "Patients in pain won't wait for a slow site",
    buildPrompt: (lead: Lead) => `You are Jason Murphy, founder of Vibe Tokens.

Write a cold email to ${lead.businessName} in ${lead.city}.

4 sentences:
1. A patient searching for pain relief on their phone at 11pm doesn't wait for a site that takes 6 seconds to load — they click the next result.
2. Most chiropractic sites take 4-8 seconds to load on mobile. 53% of users leave before 3.
3. Sites I build load under 2 seconds. Google ranks faster sites higher.
4. CTA.

${RULES}`,
  },

  // Day 7 — Short question
  {
    day: 7,
    theme: "One question",
    buildPrompt: (lead: Lead) => `You are Jason Murphy, founder of Vibe Tokens.

Write a very short cold email to ${lead.businessName} in ${lead.city}. 3 sentences only.

1. "Quick question." — ask: if someone searched "chiropractor ${lead.city}" right now, would they show up on the first page? Not their practice name — just the service + city.
2. One line on what that gap costs — factual, not dramatic.
3. CTA.

${RULES}`,
  },

  // Day 8 — Retention / rebooking
  {
    day: 8,
    theme: "Patients who stay are worth 5x",
    buildPrompt: (lead: Lead) => `You are Jason Murphy, founder of Vibe Tokens.

Write a cold email to ${lead.businessName} in ${lead.city}.

4 sentences:
1. A patient on a monthly maintenance plan is worth 8-10x a one-time visit — and most practices lose them between treatments because nobody followed up.
2. Automated recall and check-in sequences fix this — they run without anyone managing them.
3. That's recurring revenue that's already been earned. It just needs a system to collect it.
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
1. Most common question I get is what this costs. It's one flat monthly number — new site included, content and automation run from day one.
2. Most practices spend more than this on Google Ads that stop working the moment they stop paying.
3. The number is on the page with everything that's included.
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
1. Most chiropractors end up being the marketer, the scheduler, and the practitioner — that's the ceiling.
2. Systems don't replace clinical skill. They handle everything that shouldn't require a chiropractor in the first place.
3. That's the only way a practice grows without the owner working more hours.
4. CTA.

${RULES}`,
  },

  // Day 11 — First mover
  {
    day: 11,
    theme: "One practice per market wins this",
    buildPrompt: (lead: Lead) => `You are Jason Murphy, founder of Vibe Tokens.

Write a cold email to ${lead.businessName} in ${lead.city}.

4 sentences:
1. In every local market, one chiropractic practice builds the content infrastructure first and owns search while their competitors are still getting by on referrals.
2. AI search compounds — the practice that starts now has a 12-18 month lead on anyone who waits.
3. That window is still open in ${lead.city}. Not indefinitely.
4. CTA.

${RULES}`,
  },

  // Day 12 — After state
  {
    day: 12,
    theme: "What it looks like when systems run it",
    buildPrompt: (lead: Lead) => `You are Jason Murphy, founder of Vibe Tokens.

Write a cold email to ${lead.businessName} in ${lead.city}.

4 sentences:
1. A practice where new patients find them on ChatGPT, the site publishes weekly condition guides, and recall runs automatically — that's not a big operation. That's just a practice with the right infrastructure.
2. Same quality of care. Just more of it, without the owner doing all the marketing manually.
3. That's the difference between a practice and a business.
4. CTA.

${RULES}`,
  },

  // Day 13 — Objections
  {
    day: 13,
    theme: "Direct answers",
    buildPrompt: (lead: Lead) => `You are Jason Murphy, founder of Vibe Tokens.

Write a cold email to ${lead.businessName} in ${lead.city}.

3 sentences — one per objection, as flowing prose:
1. "I already have a website" — having one and having one that generates new patients consistently are different things.
2. "I don't have bandwidth for this" — it runs without you, that's the whole point.
3. "Not sure I need it" — the page makes it easy to decide. CTA.

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
