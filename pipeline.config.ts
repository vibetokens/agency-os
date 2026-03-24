/**
 * pipeline.config.ts
 *
 * The single source of truth for the lead gen pipeline.
 * Add a new ICP here to activate it. The daily runner picks this up automatically.
 *
 * To add a new ICP:
 *   1. Create icp/[slug].md — the ICP profile
 *   2. Create icp/sequences/[slug].ts — the 14-day email sequence
 *   3. Register it in icp/sequences/index.ts
 *   4. Build the landing page at vibetokens.io/[slug]
 *   5. Add an entry here and set active: true
 */

export type IcpConfig = {
  niche: string;           // passed to discover.ts --niche
  slug: string;            // used for landing page path and sequence lookup
  cities: string[];        // rotated through during discovery
  landingPage: string;     // full URL baked into email CTAs
  dailyTarget: number;     // max emails to send per day across this ICP
  active: boolean;
};

export const PIPELINE: IcpConfig[] = [
  {
    niche: "med spa",
    slug: "med-spa",
    cities: [
      "St. Petersburg Florida",
      "Clearwater Florida",
      "Tampa Florida",
      "Dunedin Florida",
      "Safety Harbor Florida",
      "Largo Florida",
      "Sarasota Florida",
      "Naples Florida",
      "Fort Myers Florida",
      "Boca Raton Florida",
    ],
    landingPage: "https://vibetokens.io/med-spa",
    dailyTarget: 30,
    active: true,
  },

  {
    niche: "dental",
    slug: "dental",
    cities: [
      "Tampa Florida",
      "St. Petersburg Florida",
      "Orlando Florida",
      "Jacksonville Florida",
      "Sarasota Florida",
      "Fort Lauderdale Florida",
      "Miami Florida",
      "Atlanta Georgia",
      "Charlotte North Carolina",
      "Nashville Tennessee",
    ],
    landingPage: "https://vibetokens.io/dental",
    dailyTarget: 30,
    active: true,
  },

  {
    niche: "chiropractor",
    slug: "chiropractic",
    cities: [
      "Tampa Florida",
      "St. Petersburg Florida",
      "Orlando Florida",
      "Jacksonville Florida",
      "Sarasota Florida",
      "Fort Lauderdale Florida",
      "Naples Florida",
      "Atlanta Georgia",
      "Charlotte North Carolina",
      "Nashville Tennessee",
    ],
    landingPage: "https://vibetokens.io/chiropractic",
    dailyTarget: 30,
    active: true,
  },

  {
    niche: "marketing agency",
    slug: "claude-consulting",
    cities: [
      "Cleveland Ohio",
      "Columbus Ohio",
      "Cincinnati Ohio",
      "Pittsburgh Pennsylvania",
      "Nashville Tennessee",
      "Austin Texas",
      "Denver Colorado",
      "Atlanta Georgia",
      "Charlotte North Carolina",
      "Phoenix Arizona",
    ],
    landingPage: "https://vibetokens.io/services/claude-consulting",
    dailyTarget: 20,
    active: true,
  },
];
