/**
 * elevated.ts
 *
 * The backbone sequence — Koe/Bilyeau/Denning voice, The Layer themes.
 * Goes to everyone. Runs forever. NOT salesy. Builds the relationship.
 *
 * ICP spikes (days 3-5) are injected by each ICP sequence file.
 * This file provides days 1-2 and days 6-14.
 */

import type { Lead } from "../../lib/db/schema";
import type { SequenceEmail } from "./types";

const ELEVATED_RULES = `
Rules:
- Subject line first on its own line: Subject: <subject>
- Subject line: Title Case. Never all lowercase. Must sound like something a real person sends.
- 4-5 sentences. Every word earns its place.
- No AI disclosure. No agency speak. No buzzwords. No emoji.
- No CTA in elevated emails — this is relationship, not pitch.
- Paragraphs as <p style="margin:0 0 16px 0;font-family:Georgia,serif;font-size:16px;line-height:1.7;color:#1a1a1a;"> tags. No bullet lists.
- Links (day 14 only): <a href="URL" style="color:#1a1a1a;font-weight:700;text-decoration:underline;">anchor text</a>
- Formatting: use <strong> to bold 1-2 key phrases per email. Use <em> for a single sharp insight. Use <u> once max for the most important line.
- Voice: Dan Koe elevation + Tim Denning raw honesty + Tom Bilyeau intensity.
- Write like Bilyeau — short punchy sentences. One idea per sentence. Whitespace is emphasis.
- First person, documented experience — journal, not lecture.
- Sign off inside the final <p>: — Jason
`;

// ── Days 1–2: Elevated intro ──────────────────────────────────────────────────

export const ELEVATED_INTRO: SequenceEmail[] = [

  {
    day: 1,
    theme: "The attention tax — introducing the cost nobody talks about",
    buildPrompt: (lead: Lead) => `You are Jason Murphy, entrepreneur and founder of Vibe Tokens.

Write a cold email to the owner of ${lead.businessName} in ${lead.city}.

Topic: The hidden cost of running a business through reactive apps and constant context-switching.
Reference Gloria Mark's research on attention residue — 23 minutes to recover from a single interruption.
The point: most operators aren't underperforming because they lack discipline. They're underperforming
because their operating environment is built to fragment their attention.

Do NOT pitch anything. Do NOT mention Vibe Tokens services. This is a thought email — it should
feel like something worth reading even if they never become a client.

Angle: frame it as something you noticed about yourself, not a lesson being taught to them.

${ELEVATED_RULES}`,
  },

  {
    day: 2,
    theme: "Not laziness. Architecture. — The Layer thesis",
    buildPrompt: (lead: Lead) => `You are Jason Murphy, entrepreneur and founder of Vibe Tokens.

Write a cold email to the owner of ${lead.businessName} in ${lead.city}.

Topic: The difference between a discipline problem and an architecture problem.
Most people think they need better habits. What they actually need is a better system.
The apps they use to "stay on top of things" are the thing making them fall behind.
Every time you open an inbox to grab one thing, you leave carrying fragments of six others.

The shift: instead of going to apps, let AI go to the apps for you. The information lands on
the layer — not on you.

Do NOT pitch anything. No services mentioned. This is pure elevated thinking.
Frame it from personal experience — something you built, something you changed.

${ELEVATED_RULES}`,
  },

];

// ── Days 6–14: Elevated continuation ─────────────────────────────────────────

export const ELEVATED_CONTINUATION: SequenceEmail[] = [

  {
    day: 6,
    theme: "The inbox trap — what email actually costs you",
    buildPrompt: (lead: Lead) => `You are Jason Murphy, entrepreneur and founder of Vibe Tokens.

Write a cold email to the owner of ${lead.businessName} in ${lead.city}.

Topic: What the inbox actually costs — not the time to read and respond, but the toll
that starts the moment you open it. The subject line that made you tense before you knew
the full story. The thread that redirected your morning. The email you read at 7am that
sat in your head all day.

The inbox wasn't designed to help you. It was designed to be checked. Constantly.
Every unread number is a small anxiety signal. Every subject line is a context switch.

Share how you fixed it: a one-prompt brief instead of visiting the inbox directly.
What came back was a clean read — everything that mattered, nothing that didn't.

Do NOT pitch. No CTA. This should feel like a dispatch from someone who figured something out.

${ELEVATED_RULES}`,
  },

  {
    day: 7,
    theme: "The calendar problem — designed vs accumulated",
    buildPrompt: (lead: Lead) => `You are Jason Murphy, entrepreneur and founder of Vibe Tokens.

Write a cold email to the owner of ${lead.businessName} in ${lead.city}.

Topic: Most calendars aren't a plan. They're a record of what other people wanted from you.
You didn't design that Tuesday — you inherited it, one "does this work for you?" at a time.
That's not scheduling. That's managed surrender.

The distinction: a designed calendar starts with a question — what does this week need to
accomplish, and what conditions does that require? A full calendar starts with availability.

The most important work never makes a meeting request. It just waits.

No pitch. No CTA. One operator talking to another.

${ELEVATED_RULES}`,
  },

  {
    day: 8,
    theme: "What your morning is actually worth",
    buildPrompt: (lead: Lead) => `You are Jason Murphy, entrepreneur and founder of Vibe Tokens.

Write a cold email to the owner of ${lead.businessName} in ${lead.city}.

Topic: The morning brain is a different instrument than the mid-reactive-cycle brain.
Most people never find out what they're capable of in the morning because they've
already spent it reacting.

Once you've opened the inbox, you're working with what's left over.
The 23 minutes to recover from each interruption — that's the math behind why your
best thinking happens before you check email, not after.

One block. First thing. Belongs to your most important work before anything reactive touches the day.
Architecture is the answer. Not discipline. Not a better morning routine.

No pitch. No CTA. Personal and direct.

${ELEVATED_RULES}`,
  },

  {
    day: 9,
    theme: "The professor model — documented experience at scale",
    buildPrompt: (lead: Lead) => `You are Jason Murphy, entrepreneur and founder of Vibe Tokens.

Write a cold email to the owner of ${lead.businessName} in ${lead.city}.

Topic: The greatest content marketers in history weren't influencers. They were professors.
A professor builds a curriculum (content strategy). The syllabus is a content calendar.
Lectures are long-form. Office hours are community. Research papers are thought leadership.
They do it semester after semester, for decades, without burning out — because the structure
does the work.

The shift happening now: the production barrier is nearly gone. AI handles the packaging.
Which means the new premium isn't the information. It's the guide who's been where you want
to go and is willing to show the path in real time.

Content that wins in this era isn't polished expertise. It's documented experience.

No pitch. This is a concept worth sitting with.

${ELEVATED_RULES}`,
  },

  {
    day: 10,
    theme: "The gap — what AI-native actually means",
    buildPrompt: (lead: Lead) => `You are Jason Murphy, entrepreneur and founder of Vibe Tokens.

Write a cold email to the owner of ${lead.businessName} in ${lead.city}.

Topic: The gap between what AI-native operators can do and what everyone else is doing
is not closing. It's growing. Every month someone spends in the old way, someone else
is already live, ranking, following up automatically, publishing daily.

This isn't about replacing humans. It's about removing yourself from the work that was
never worth your attention in the first place.

The businesses that figure this out in 2026 are going to look back at the competition
the way Amazon looked at Borders. The ones that don't are going to wonder why the
work keeps taking the same amount of time.

No pitch. Frame it from your own observations, not a lecture.

${ELEVATED_RULES}`,
  },

  {
    day: 11,
    theme: "Social without the scroll",
    buildPrompt: (lead: Lead) => `You are Jason Murphy, entrepreneur and founder of Vibe Tokens.

Write a cold email to the owner of ${lead.businessName} in ${lead.city}.

Topic: Social media is reactive by addiction, not just by design.
Opening Instagram to check one post and resurfacing 40 minutes later — that's the feature,
not the bug. The platform is engineered to extract attention, not to help you share ideas.

The distinction: being present on social vs being in it.
You don't need to live in the feed to publish into it.
AI can draft, schedule, and engage while you stay out of the loop entirely.
Show up with intention. Let the layer handle the rest.

No pitch. No CTA.

${ELEVATED_RULES}`,
  },

  {
    day: 12,
    theme: "What compounds — the small architecture decisions",
    buildPrompt: (lead: Lead) => `You are Jason Murphy, entrepreneur and founder of Vibe Tokens.

Write a cold email to the owner of ${lead.businessName} in ${lead.city}.

Topic: The residue from a poorly designed operating system isn't just tiredness.
It's the slow accumulation of work that matters getting consistently displaced by
work that just arrived. Over time, that shapes what you build, what you earn,
and what kind of operator you become.

Small architecture decisions compound. One protected morning block per week, over a year,
is 50 hours of your best thinking returned to you. That's not a marginal difference.
That's the difference between doing your best work and doing adequate work that required twice the effort.

Arriving at a hard problem with a full mind versus a fragmented one is not productivity optimization.
It's the actual output ceiling.

No pitch.

${ELEVATED_RULES}`,
  },

  {
    day: 13,
    theme: "The operator's identity — what you're actually building",
    buildPrompt: (lead: Lead) => `You are Jason Murphy, entrepreneur and founder of Vibe Tokens.

Write a cold email to the owner of ${lead.businessName} in ${lead.city}.

Topic: Most operators spend their days in their business instead of on it because the
infrastructure was never built to support the second option. Not because they lack ambition.
Because the systems default to reactive.

The question worth sitting with: if your business ran at its full potential without you
touching the operational layer — what would you actually do with that capacity?

Most people have never had to answer that question because the operations never stopped
claiming their attention long enough to ask it.

Tom Bilyeau's lens: you're capable of more than your current environment is asking for.
The environment is the variable. Build a different one.

No pitch. This should feel like something worth writing in their journal.

${ELEVATED_RULES}`,
  },

  {
    day: 14,
    theme: "The invitation — soft close back to The Layer",
    buildPrompt: (lead: Lead) => `You are Jason Murphy, entrepreneur and founder of Vibe Tokens.

Write a cold email to the owner of ${lead.businessName} in ${lead.city}.

Topic: This is the last email in this sequence — but not the last conversation.
Reference that you've been sending them elevated thinking for the past few weeks.
Whether they've read every one or just this one, the offer is the same:

If any of this landed — the attention residue, the calendar architecture, the operating
layer concept — and they're curious what it looks like practically for a business like theirs,
the door is open.

One link: https://vibetokens.io — invite them to start the conversation. No pressure framing.
Murph's intake takes 3 minutes. If it's a fit, they'll hear back with a real plan, not a proposal.

Tone: warm, earned, not desperate. They've been in the conversation this long for a reason.

Link format: <a href="https://vibetokens.io" style="color:#7c3aed;text-decoration:none;">anchor text</a>

${ELEVATED_RULES}`,
  },

];
