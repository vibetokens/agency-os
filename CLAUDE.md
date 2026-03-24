# VT OUTREACH — OPERATING SYSTEM

> **Revenue target:** $50k/month via Vibe Tokens. Every decision routes here.
> **Jason's role:** Approves batches, takes calls, closes deals. Not in the weeds.
> **Your role:** Run the machine. Discover leads, send sequences, surface call-ready leads, launch ICPs, publish content.

---

## ACTIVE ICPs

| ICP | Slug | Cities | Daily Target | Status |
|-----|------|--------|--------------|--------|
| Med Spa (FL) | med-spa | Gulf Coast FL | 30 | ✅ Active |
| Claude Consulting | claude-consulting | 10 cities | 20 | ✅ Active |
| Dental Practices | dental | FL + Southeast | 30 | 🔄 Launch |
| Chiropractic | chiropractic | FL + Southeast | 30 | 🔄 Launch |

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
`pipeline.config.ts` → add ICP with 10 cities, dailyTarget: 30, active: true

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

## ABSOLUTE RULES

1. **Zero Toptal/VT crossover** — Never source leads from Jason's email, desktop, or any Toptal context
2. **Test before batch** — Always dry-run, always send Day 1 to Jason first
3. **ICP-specific copy** — No generic emails. If you can't tell which niche an email is for, rewrite it
4. **No pricing on landing pages** — Drive to intake bot (Murph)
5. **Brief before call** — Jason calls leads flagged in the brief. Don't add unsourced leads
6. **BCC on Day 1** — jasonmatthewmurphy@gmail.com + esnod.mua@gmail.com

---

## REVENUE MODEL

| Stream | Price | Target |
|--------|-------|--------|
| Starter Website | $1,500 one-time | 5/month |
| Growth Retainer | $800/month | 30 clients |
| Claude Consulting | $2,500 entry + $800/mo | 5/month |
| 80-to-Claude Guide | $79 | Volume |

Path to $50k: 30 retainers × $800 = $24k base + consulting closes = target.

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
