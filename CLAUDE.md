# VT OUTREACH — OPERATING SYSTEM

> **Revenue target:** $5k–$15k/month (April 2026 goal). $199/mo × 25–75 clients = target.
> **Jason's role:** Approves batches, takes calls, closes deals. Not in the weeds.
> **Your role:** Run the machine. Discover leads, send sequences, surface call-ready leads, launch ICPs, publish content.

---

## ACTIVE ICPs (as of 2026-04-10)

| ICP | Slug | Cities | Daily Target | Status |
|-----|------|--------|--------------|--------|
| Local Service (tree service) | local-service | Ohio → Southeast (15 cities) | 10 | ✅ Active |
| Med Spa (FL) | med-spa | Gulf Coast FL | 30 | ⏸ Paused |
| Claude Consulting | claude-consulting | 10 cities | 20 | ⏸ Paused |
| Dental Practices | dental | FL + Southeast | 30 | ⏸ Paused |
| Chiropractic | chiropractic | FL + Southeast | 30 | ⏸ Paused |
| Agency | agency | 10 major metros | 15 | ⏸ Paused |

**Only local-service is running.** It's the best match for the $199/mo Website + Content product (home services = target customer). Reactivated 2026-04-10 at 10/day to validate replies before scaling. Others remain available for reactivation when local-service proves the funnel.

---

## SUBAGENTS — invoke these, don't re-invent them

| Agent | File | When to use |
|-------|------|-------------|
| `ops-monitor` | `.claude/agents/ops-monitor.md` | Start of session, "what's the status?" |
| `lead-monitor` | `.claude/agents/lead-monitor.md` | "Who should I call?" "Any hot leads?" |
| `icp-launcher` | `.claude/agents/icp-launcher.md` | "Spin up [niche]" — full 9-step launch |
| `content-writer` | `.claude/agents/content-writer.md` | Blog posts, LinkedIn, email content |

---

## DAILY PIPELINE

Runs automatically via Task Scheduler (2am):
```
npm run pipeline
```
Discovers new leads when pool is low → sends next email in sequence for every due lead → logs to `pipeline.log`.

Briefs fire via Task Scheduler:
- **6am** → `npm run brief` → jasonmatthewmurphy@gmail.com
- **2pm** → `npm run brief` → jasonmatthewmurphy@gmail.com

---

## LAUNCHING A NEW ICP — Full 9-Step Procedure

Delegate to `icp-launcher` subagent or execute directly:

### 1 — ICP Profile
`icp/[slug].md` — one-line pitch, owner profile, pain points, pitch angle, discovery queries

### 2 — Email Sequence
`icp/sequences/[slug].ts` — 14 days, 4 sentences each, ICP language, one CTA per email
- CTA: `https://vibetokens.io/[slug]`
- Match tone to owner: female biz owners → peer-female, trades → direct/no-fluff, professional services → data-first

### 3 — Register Sequence
`icp/sequences/index.ts` → add to `ICP_REGISTRY` with niches array + landing URL

### 4 — Landing Page
`vibetokens/app/[slug]/page.tsx` — hero, stats, what's included (6 items), intake bot at bottom
- No pricing on the page. Everything drives to intake bot (Murph).
- Reference: `app/med-spa/page.tsx`

### 5 — Pipeline Config
`pipeline.config.ts` → add ICP with 10-15 cities, dailyTarget: 10 (start low, scale after replies prove the funnel), active: true

### 6 — Discover Initial Leads
```
npm run discover -- --niche "[niche]" --city "[City State]" --limit 30
```
Run for first 2-3 cities to seed the pool.

### 7 — Dry Run + Test Email
```
npm run pipeline -- --dry-run --icp [slug]
npm run email -- --id [first lead id] --day 1 --to jasonmatthewmurphy@gmail.com
```
**Always send Day 1 to Jason before firing the batch.**

### 8 — Deploy Landing Page
```
cd /c/Users/jason/vibetokens && git add app/[slug]/ && git commit -m "Add [ICP] landing page" && git push
```

### 9 — Activate + Report
Set `active: true`. Report: leads queued, first email subjects, landing page URL.

---

## POWER FLAGS — Revenue Engine

**Default invocation for anything content or sequence-related:**
```
claude --effort max
```

**Parallel ICP launch — run all pending ICPs simultaneously:**
```
CLAUDE_CODE_COORDINATOR_MODE=1 claude
# then: "Launch dental and chiropractic simultaneously"
```
Script: `C:\Users\jason\claude-scripts\launch-all-icps.ps1`

**Parallel lead discovery — multiple cities at once:**
```
CLAUDE_CODE_COORDINATOR_MODE=1 claude -p "Discover leads: dental Tampa FL 30, dental Orlando FL 30, dental Miami FL 30"
```

**Bulk sequence generation — all 4 ICPs get fresh sequences in one run:**
```
CLAUDE_CODE_COORDINATOR_MODE=1 claude -p "Rewrite Day 1-3 emails for med-spa, dental, chiropractic, claude-consulting simultaneously. Tighter hooks."
```

**Safe ICP development — isolated branch per ICP:**
```
claude --worktree -w dental-launch
```

**Session start ritual:**
1. Load `ops-monitor` → get pipeline status
2. Run `/dream` → consolidate recent session memory
3. Check lead pool per ICP → queue discovery if any below 50

---

## ABSOLUTE RULES

<rules>

<rule id="toptal-crossover">
NEVER source leads from Jason's email, desktop files, or any Toptal/OneClean context.
Complete separation between VT outreach and Toptal engagement — always.
Check: Could this lead have come from a Toptal source? If any doubt, discard it.
</rule>

<rule id="test-before-batch">
ALWAYS dry-run before any batch send. ALWAYS send Day 1 email to Jason (jasonmatthewmurphy@gmail.com) before firing.
This means EVERY time — new ICP, sequence rewrite, any change to email content. No exceptions.
Check: Has Jason seen the Day 1 email for this ICP/sequence version? If not, stop — send test first.
</rule>

<rule id="icp-copy">
NEVER send generic emails. Every email must be clearly ICP-specific.
Check: Could this email be for any niche? If yes, rewrite it with niche-specific language.
</rule>

<rule id="no-pricing-landing">
NEVER show pricing on Vibe Tokens landing pages. Everything routes to intake bot (Murph).
</rule>

<rule id="bcc-day1">
Day 1 emails must BCC: jasonmatthewmurphy@gmail.com
</rule>

<rule id="operationalize">
When a pipeline bug or sequence issue is found: fix it, check all active ICPs for the same issue, update this file.
</rule>

</rules>

---

## REVENUE MODEL (updated 2026-04-10)

| Stream | Price | Target |
|--------|-------|--------|
| Website + Content | $199/mo | 25–75 clients |
| Content Bolt-On | $99/mo | Upsell for clients with existing sites |
| Claude Consulting | Scoped | Enterprise / custom engagements |

**Core productized offering is $199/mo flat.** No contracts. Same-day delivery. Cancel anytime. Owns the code. Everything routes to `vibetokens.io/start` (free audit) → `/onboard` → subscription.

April 2026 goal: $5k–$15k MRR growth (25–75 new clients). Current: ~$2,400 MRR, 3 clients, 20% audit-to-client conversion rate.

**DO NOT reference the old pricing model** ($1,500 Starter, $800/mo Growth, $750 Local Presence Pro) anywhere in sequences, emails, or landing pages. Those tiers are retired.

---

## FILE MAP

```
vt-outreach/
  CLAUDE.md                    ← this file (project OS)
  pipeline.config.ts           ← active ICPs + cities + targets
  scripts/
    run-pipeline.ts            ← daily runner (discover + email)
    discover.ts                ← Google Maps lead discovery
    email-outreach.ts          ← single-lead email tool
    send-brief.ts              ← 6am/2pm HTML briefing email
  icp/
    [slug].md                  ← ICP profile + pitch angle
    sequences/
      index.ts                 ← ICP routing registry
      [slug].ts                ← 14-day email sequence
  lib/db/schema.ts             ← SQLite schema (leads table)
  .claude/
    agents/                    ← subagent definitions
    hooks/session-start.sh     ← auto-injects DB stats on session open

vibetokens/ (C:/Users/jason/vibetokens)
  app/[slug]/page.tsx          ← ICP landing pages
  components/ContactIntake.tsx ← Murph intake bot
```

---

## ADDING TO AN EXISTING ICP

- **New city:** Add to `cities` array in `pipeline.config.ts`
- **Pause ICP:** Set `active: false` in `pipeline.config.ts`
- **Edit sequence:** Edit `icp/sequences/[slug].ts` — next run picks up changes
