/**
 * build.ts
 *
 * Assembles a full 14-day sequence from:
 *   - Elevated intro (days 1-2): shared Koe/Bilyeau/Denning voice
 *   - ICP spike (days 3-5): 3 hard niche-specific pitch emails
 *   - Elevated continuation (days 6-14): shared The Layer themes
 *
 * Usage:
 *   import { buildICPSequence } from "./build";
 *   export const mySequence = buildICPSequence(mySpike);
 */

import { ELEVATED_INTRO, ELEVATED_CONTINUATION } from "./elevated";
import type { SequenceEmail } from "./types";

export function buildICPSequence(spike: [SequenceEmail, SequenceEmail, SequenceEmail]): SequenceEmail[] {
  const [s3, s4, s5] = spike;
  return [
    { ...ELEVATED_INTRO[0],        day: 1 },
    { ...ELEVATED_INTRO[1],        day: 2 },
    { ...s3,                       day: 3 },
    { ...s4,                       day: 4 },
    { ...s5,                       day: 5 },
    { ...ELEVATED_CONTINUATION[0], day: 6  },
    { ...ELEVATED_CONTINUATION[1], day: 7  },
    { ...ELEVATED_CONTINUATION[2], day: 8  },
    { ...ELEVATED_CONTINUATION[3], day: 9  },
    { ...ELEVATED_CONTINUATION[4], day: 10 },
    { ...ELEVATED_CONTINUATION[5], day: 11 },
    { ...ELEVATED_CONTINUATION[6], day: 12 },
    { ...ELEVATED_CONTINUATION[7], day: 13 },
    { ...ELEVATED_CONTINUATION[8], day: 14 },
  ];
}
