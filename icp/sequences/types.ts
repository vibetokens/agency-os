import type { Lead } from "../../lib/db/schema";

export type SequenceEmail = {
  day: number;
  theme: string;
  buildPrompt: (lead: Lead) => string;
};

export type Sequence = SequenceEmail[];
