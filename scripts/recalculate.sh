#!/bin/bash
# The "get smarter" loop, run when new player data has come in:
#   1. pull the shared boards the live-data workflow committed,
#   2. apply the odds changes the live data supports (scripts/live/weights.ts, within its guards),
#   3. re-run the advice simulations (with the shipped board value) on the same seeds as last time and compare,
#   4. write the report to data/live/recalculation.md and add a line to data/live/history.jsonl (the
#      analytics dashboard's odds history).
# Nothing is committed: read the report, run the tests, then commit.
# Runs 8 processes at the lowest priority (the same PC is often used for gaming), about 15 minutes.
# Usage: bash scripts/recalculate.sh
set -euo pipefail
cd "$(dirname "$0")/.."
runs=scripts/sim/results/recalc
mkdir -p "$runs"
stamp=$(date +%Y-%m-%d-%H%M)

echo "1/3 Pulling the latest shared data"
git pull --rebase --autostash -q

echo "2/3 Applying the odds the live data supports"
odds=$(npx vite-node scripts/live/weights.ts)
echo "$odds"

echo "3/3 Simulating 240 games with the advice"
previous=$(ls -d "$runs"/run-* 2>/dev/null | tail -1 || true)
KEEP="$runs/run-$stamp" VALUE_MODEL=src/data/boardValue.json KIT_RULE=1 GOAL=target bash scripts/sim/shard.sh 8 30 plan:4:32:0.3 board 16 > /dev/null

{
  echo "# Recalculation, $stamp"
  echo
  echo "## Odds"
  echo
  echo "$odds" | sed 's/^/- /'
  echo
  python3 scripts/sim/compare.py "${previous:-/nonexistent}" "$runs/run-$stamp"
} > data/live/recalculation.md
first=$(echo "$odds" | head -1)
python3 scripts/sim/history.py "$runs/run-$stamp" "$(date +%Y-%m-%d)" "Recalculated from live data: ${first:-no odds change}"
echo "Done: data/live/recalculation.md, and a line in data/live/history.jsonl (the dashboard's history)"
