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
    dailyTarget: 25,
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
    dailyTarget: 25,
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
    active: false,
  },

  // ── Vibe Tokens Local Division ───────────────────────────────────────────────
  // REACTIVATED 2026-04-10 — best fit for $199/mo Website + Content product.
  // Starting at 10/day to validate sequence + replies before scaling up.
  {
    niche: "tree service",
    slug: "local-service",
    cities: [
      "Cleveland Ohio",
      "Columbus Ohio",
      "Cincinnati Ohio",
      "Pittsburgh Pennsylvania",
      "Detroit Michigan",
      "Indianapolis Indiana",
      "Louisville Kentucky",
      "Nashville Tennessee",
      "Charlotte North Carolina",
      "Atlanta Georgia",
      "Kansas City Missouri",
      "St. Louis Missouri",
      "Milwaukee Wisconsin",
      "Minneapolis Minnesota",
      "Baltimore Maryland",
    ],
    landingPage: "https://vibetokens.io/local-service",
    dailyTarget: 25,
    active: true,
  },

  {
    niche: "marketing agency",
    slug: "agency",
    cities: [
      "Austin Texas",
      "Denver Colorado",
      "Nashville Tennessee",
      "Atlanta Georgia",
      "Charlotte North Carolina",
      "Dallas Texas",
      "Seattle Washington",
      "Chicago Illinois",
      "Minneapolis Minnesota",
      "Phoenix Arizona",
    ],
    landingPage: "https://vibetokens.io/agency",
    dailyTarget: 15,
    active: false,
  },
];
