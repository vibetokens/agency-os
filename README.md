# Vibe Tokens — Agency OS

The operating system I built to run a Claude-native digital agency. Built in public, documented in [The Layer](https://vibetokens.io/the-layer) series.

Every tool here is live. This is not a template — it's what's actually running.

---

## What This Is

A small business automation stack built on top of Claude (Anthropic). The goal: operate a full-service digital agency with the smallest possible team by replacing manual workflows with AI-native systems.

Current MRR tracked. Pipeline running nightly. Brief fires at 6am. Content drafts itself at 5am.

---

## The Stack

- **Next.js** — landing pages + intake bot (Murph)
- **Claude API** (`claude-sonnet-4-6`) — every intelligence layer
- **Playwright** — browser automation (LinkedIn posting, session monitoring)
- **better-sqlite3** — leads DB + revenue DB (no cloud dependency)
- **Nodemailer / IMAP** — email outreach + reply parsing
- **Windows Task Scheduler** — cron equivalent (2am pipeline, 6am brief, 5am content)

---

## Core Scripts

| Script | What It Does |
|--------|-------------|
| `scripts/run-pipeline.ts` | Discovers leads → sends next sequence email for every due lead |
| `scripts/send-brief.ts` | Builds + emails the CEO dashboard (revenue, pipeline, call list) |
| `scripts/draft-content.ts` | Detects next unpublished blog episode → drafts blog + LinkedIn + tweets → emails for review |
| `scripts/log-deal.ts` | Revenue tracker CLI — log clients, deals, MRR, next actions |
| `scripts/email-outreach.ts` | Single-lead email tool |
| `scripts/check-replies.ts` | IMAP reply parser — flags hot leads, routes responses |

---

## Setup

```bash
cp .env.local.example .env.local
# Fill in your keys (see .env.local.example)

npm install
npm run db:setup
```

### Environment Variables

See `.env.local.example` for all required keys:
- `ANTHROPIC_API_KEY` — Claude API
- `GOOGLE_MAPS_API_KEY` — Lead discovery via Places API
- `GMAIL_USER` + `GMAIL_APP_PASSWORD` — Email outreach
- `NOTION_TOKEN` + `NOTION_LEADS_DATABASE_ID` — Optional Notion sync

---

## Running the Pipeline

```bash
# Dry run — see what would be sent
npm run pipeline -- --dry-run

# Live run
npm run pipeline

# Brief (CEO dashboard email)
npm run brief

# Revenue dashboard
npm run log-deal -- --list

# Content draft (next episode)
npm run draft-content -- --dry-run
```

---

## The Content Engine

The Layer is a blog series documenting this system being built in real time. Episodes draft automatically via `scripts/draft-content.ts`. Series arc: 12 episodes from attention residue to the full agency OS.

Read it: [vibetokens.io/the-layer](https://vibetokens.io/the-layer)

---

## ICP Structure

```
icp/
  [slug].md          — ICP profile, pitch angle, discovery queries
  sequences/
    index.ts         — routing registry
    [slug].ts        — 14-day email sequence
```

Active ICPs: Med Spa (FL), Claude Consulting (10 cities), Dental (launching), Chiropractic (launching).

---

## Revenue Model

| Stream | Price |
|--------|-------|
| Starter Website | $1,500 one-time |
| Growth Retainer | $800/month |
| Claude Consulting | $2,500 entry + $800/mo |

Target: $50k/month. Currently: $2,400 MRR (3 clients).

---

## Philosophy

Not laziness. Architecture.

Every manual workflow is a tax on attention. This repo is the system I built to stop paying that tax — and to document it so others can do the same.

Built by [Jason Murphy](https://vibetokens.io) / Vibe Tokens.
