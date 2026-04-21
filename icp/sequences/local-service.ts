/**
 * local-service.ts — 5-email plain text sequence
 * v5 2026-04-17: Koe/Bilyeu narrative style. Direct templates, no API.
 * Short paragraphs, one thought each, rhythm > length.
 */

import type { Lead } from "../../lib/db/schema";
import type { SequenceEmail } from "./types";

const LP = "https://vibetokens.io/local-service";

function serviceSearch(niche: string, city: string): string {
  const clean = city.split(" ").slice(0, -1).join(" "); // strip state
  const map: Record<string, string> = {
    "tree service": `tree removal ${clean}`,
    "electrician": `electrician ${clean}`,
    "electrical": `electrician ${clean}`,
    "plumber": `plumber ${clean}`,
    "plumbing": `plumber near me ${clean}`,
    "hvac": `AC repair ${clean}`,
    "roofing": `roofing contractor ${clean}`,
    "landscaping": `landscaping ${clean}`,
    "painting": `house painter ${clean}`,
    "cleaning service": `house cleaning ${clean}`,
  };
  return map[niche.toLowerCase()] || `${niche} near me`;
}

function cityName(city: string): string {
  return city.split(" ").slice(0, -1).join(" ");
}

function nichePlural(niche: string): string {
  const map: Record<string, string> = {
    "tree service": "tree service companies",
    "electrician": "electricians",
    "electrical": "electricians",
    "plumber": "plumbers",
    "plumbing": "plumbers",
    "hvac": "HVAC companies",
    "roofing": "roofing companies",
    "landscaping": "landscaping companies",
    "painting": "painting companies",
    "cleaning service": "cleaning companies",
  };
  return map[niche.toLowerCase()] || `${niche} companies`;
}

export const localServiceSequence: SequenceEmail[] = [

  {
    day: 1,
    theme: "Observation — the gap between reputation and visibility",
    buildDirect: (lead: Lead) => {
      const reviews = lead.reviewCount ? `${lead.reviewCount}` : "hundreds of";
      const search = serviceSearch(lead.niche, lead.city);
      const city = cityName(lead.city);
      return {
        subject: `found something while looking at ${city} ${nichePlural(lead.niche)}`,
        body: `I was going through search results for ${nichePlural(lead.niche)} in ${city}.

${lead.businessName} has ${reviews} reviews.

The work is clearly good. The clients clearly come back.

But search "${search}" — the service, not the name — and you're not there.

Not on the first page. Not anywhere near it.

That gap is the whole problem.

The people who already know your name will find you. They always do. What you're missing is the person who just moved to ${city}, who needs a ${lead.niche === "hvac" ? "HVAC tech" : lead.niche} this week, who searched "${search}" at 9pm — and clicked the first thing that came up.

That person is going to someone else. Not because your work is worse. Because their site was built for search and yours wasn't.

Do you currently get leads from your website, or is it mostly referrals and word of mouth?

— Murph, VibeTokens`,
      };
    },
  },

  {
    day: 2,
    theme: "Proof — what we did for a similar company",
    buildDirect: (lead: Lead) => {
      const city = cityName(lead.city);
      return {
        subject: `re: ${lead.businessName}`,
        body: `Quick follow-up.

We work with a tree service company in Cleveland that had the same gap — great reviews, invisible online.

We built them 100+ pages. One for every service in every neighborhood they cover. "Tree removal Lakewood." "Stump grinding Rocky River." "Emergency tree service Westlake."

Each page ranks because it matches exactly what homeowners type into Google.

They stopped paying Angi entirely. The leads come from their own site now.

Same approach works for any service company with an established area. One flat rate. $199/month.

Worth a quick look? ${LP}

— Murph, VibeTokens`,
      };
    },
  },

  {
    day: 3,
    theme: "The math — what it actually costs to not show up",
    buildDirect: (lead: Lead) => {
      const search = serviceSearch(lead.niche, lead.city);
      const city = cityName(lead.city);
      return {
        subject: `the math on "${search}"`,
        body: `People search "${search}" hundreds of times a month.

Right now, every one of those clicks goes to whoever shows up first.

If your site had a page built specifically for that search — with your reviews, your service area, your phone number — you'd be catching those calls instead of losing them to companies with half your experience.

One page per service. One page per neighborhood. That's what we build. $199/month, and the first version goes live the same week.

No contracts. Cancel anytime.

${LP}

— Murph, VibeTokens`,
      };
    },
  },

  {
    day: 4,
    theme: "Objection — our site is fine",
    buildDirect: (lead: Lead) => {
      const search = serviceSearch(lead.niche, lead.city);
      return {
        subject: `one thing about your current site`,
        body: `"Our site is fine" usually means it ranks for the business name and nothing else.

The homeowner typing "${search}" at 9pm doesn't know the name.

Fine doesn't earn that call.

${LP}

— Murph, VibeTokens`,
      };
    },
  },

  {
    day: 5,
    theme: "Clean close",
    buildDirect: (lead: Lead) => {
      return {
        subject: `last note`,
        body: `Last email from me.

If the gap between your reputation and your online visibility is real — and for most service companies it is — three minutes at the link below is the whole ask.

${LP}

No follow-up after this.

— Murph, VibeTokens`,
      };
    },
  },

];
