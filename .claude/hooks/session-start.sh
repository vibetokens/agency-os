#!/bin/bash
# SessionStart hook — fires every time a Claude Code session opens in vt-outreach
# Injects live pipeline state as context so Claude is instantly operational

cd "C:/Users/jason/vt-outreach"

echo "=== VT PIPELINE STATUS ==="
echo "Time: $(date)"
echo ""

# DB stats
node -e "
const DB = require('better-sqlite3');
const db = new DB('outreach.db');
const today = new Date().toISOString().slice(0,10);
const total = db.prepare('SELECT COUNT(*) as n FROM leads').get().n;
const inSeq = db.prepare('SELECT COUNT(*) as n FROM leads WHERE email_day > 0 AND email_day < 14').get().n;
const done  = db.prepare('SELECT COUNT(*) as n FROM leads WHERE email_day >= 14').get().n;
const booked= db.prepare('SELECT COUNT(*) as n FROM leads WHERE call_status = \"booked\"').get().n;
const sentToday = db.prepare('SELECT COUNT(*) as n FROM leads WHERE last_emailed_at LIKE ?').get(today+'%').n;
const callReady = db.prepare('SELECT COUNT(*) as n FROM leads WHERE email_day >= 4 AND phone IS NOT NULL AND call_status = \"not_called\"').get().n;
const byNiche = db.prepare('SELECT niche, COUNT(*) as n FROM leads GROUP BY niche ORDER BY n DESC LIMIT 5').all();
console.log('LEADS: ' + total + ' total | ' + inSeq + ' in sequence | ' + done + ' completed | ' + booked + ' booked');
console.log('TODAY: ' + sentToday + ' emails sent | ' + callReady + ' call-ready leads');
console.log('BY NICHE: ' + byNiche.map(r => r.niche + '(' + r.n + ')').join(', '));
" 2>/dev/null

echo ""

# Last pipeline run
echo "LAST PIPELINE RUN:"
tail -5 pipeline.log 2>/dev/null | grep -E "(===|sent|failed|complete)" | tail -3

echo ""

# Replies waiting
node -e "
const DB = require('better-sqlite3');
const db = new DB('outreach.db');
try {
  const replied = db.prepare('SELECT COUNT(*) as n FROM leads WHERE replied_at IS NOT NULL AND call_status = \"not_called\"').get().n;
  if (replied > 0) console.log('⚡ REPLIED LEADS WAITING FOR CALL: ' + replied);
} catch(e) {}
" 2>/dev/null

# Ruflo daemon status
echo "RUFLO DAEMON: $(claude-flow daemon status 2>/dev/null | grep -oE 'running|stopped' | head -1 || echo 'check with: claude-flow status')"

echo ""
echo "ACTIVE ICPs: med-spa (FL), dental (FL+SE), chiropractic (FL+SE), claude-consulting (10 cities)"
echo "SCHEDULE: pipeline 2am | reply-check 30min | briefs 6am+2pm → jasonmatthewmurphy@gmail.com"
echo "SWARM: claude-flow swarm start --config .claude-flow/vt-swarm.yaml"
echo "DISPATCH: claude-flow task create --description 'launch [niche] ICP'"
echo "=========================="
