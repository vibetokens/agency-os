import type { Lead } from "../../lib/db/schema";

export type SequenceEmail = {
  day: number;
  theme: string;
  /** Returns a prompt for Claude API drafting (costs credits per send) */
  buildPrompt?: (lead: Lead) => string;
  /** Returns { subject, body } directly — no API call needed */
  buildDirect?: (lead: Lead) => { subject: string; body: string };
};

export type Sequence = SequenceEmail[];
