import type { Lead } from "../../lib/db/schema";
import type { Sequence } from "./types";
import { medSpaSequence } from "./med-spa";
import { claudeConsultingSequence } from "./claude-consulting";
import { dentalSequence } from "./dental";
import { chiropracticSequence } from "./chiropractic";
import { agencySequence } from "./agency";
import { localServiceSequence } from "./local-service";
import { genericSequence } from "./generic";

// ── ICP registry ──────────────────────────────────────────────────────────────
// Add a new entry here whenever a new ICP + landing page is built.
// landing: the URL baked into every email in that sequence.

const ICP_REGISTRY = [
  {
    niches: ["med spa", "medical spa", "medspa", "aesthetics", "medical aesthetics"],
    sequence: medSpaSequence,
    landing: "https://vibetokens.io/med-spa",
  },
  {
    niches: ["consulting", "consultant", "business coach", "life coach", "coach", "advisor"],
    sequence: claudeConsultingSequence,
    landing: "https://vibetokens.io/services/claude-consulting",
  },
  {
    niches: ["dental", "dentist", "orthodontist", "oral surgeon", "endodontist", "periodontist", "dental practice", "dental office"],
    sequence: dentalSequence,
    landing: "https://vibetokens.io/dental",
  },
  {
    niches: ["chiropractor", "chiropractic", "chiro", "physical therapy", "spine", "sports medicine"],
    sequence: chiropracticSequence,
    landing: "https://vibetokens.io/chiropractic",
  },
  {
    niches: ["agency", "digital agency", "marketing agency", "creative agency", "boutique agency", "ad agency", "media agency", "web agency", "seo agency", "social media agency"],
    sequence: agencySequence,
    landing: "https://vibetokens.io/agency",
  },
  {
    niches: ["tree service", "tree removal", "landscaping", "lawn care", "hvac", "roofing", "plumbing", "gutter", "cleaning service", "house cleaning", "concrete", "pressure washing", "pest control", "electrical", "handyman", "painting", "flooring"],
    sequence: localServiceSequence,
    landing: "https://vibetokens.io/local-service",
  },
];

export function getIcp(lead: Lead) {
  const niche = lead.niche.toLowerCase();
  return ICP_REGISTRY.find((icp) =>
    icp.niches.some((n) => niche.includes(n))
  ) ?? null;
}

export function getNextEmail(lead: Lead): { day: number; prompt: string } | null {
  const icp = getIcp(lead);

  // No ICP match — skip rather than send wrong landing page
  if (!icp) return null;

  const nextDay = (lead.emailDay ?? 0) + 1;
  const email = icp.sequence.find((e) => e.day === nextDay);
  if (!email) return null;

  return { day: nextDay, prompt: email.buildPrompt(lead) };
}
