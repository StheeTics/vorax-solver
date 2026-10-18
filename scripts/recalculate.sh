#!/bin/bash
# The "get smarter" loop, run when new player data has come in:
#   1. pull the shared boards the live-data workflow committed,
#   2. apply the odds changes the live data supports (scripts/live/weights.ts, within its guards),
#   3. re-measure the instrument strengths under the new odds,
#   4. re-run the advice simulations on the same seeds as last time and compare,
#   5. write the report to data/live/recalculation.md.
# Nothing is committed: read the report, run the tests, then commit.
# Runs 8 processes at the lowest priority (the same PC is often used for gaming), about 15 minutes.
# Usage: bash scripts/recalculate.sh
set -euo pipefail
cd "$(dirname "$0")/.."
runs=scripts/sim/results/recalc
mkdir -p "$runs"
stamp=$(date +%Y-%m-%d-%H%M)

echo "1/4 Pulling the latest shared data"
git pull --rebase --autostash -q

echo "2/4 Applying the odds the live data supports"
odds=$(npx vite-node scripts/live/weights.ts)
echo "$odds"

echo "3/4 Re-measuring instrument strengths (25 instruments x 1,000 games)"
cp src/data/instrumentStrength.json "$runs/strengths-before.json"
bash scripts/sim/strength.sh 1000 8

echo "4/4 Simulating 240 games with the advice"
previous=$(ls -d "$runs"/run-* 2>/dev/null | tail -1 || true)
KEEP="$runs/run-$stamp" bash scripts/sim/shard.sh 8 30 plan:4:32 board 16 > /dev/null

{
  echo "# Recalculation, $stamp"
  echo
  echo "## Odds"
  echo
  echo "$odds" | sed 's/^/- /'
  echo
  python3 scripts/sim/compare.py "${previous:-/nonexistent}" "$runs/run-$stamp" "$runs/strengths-before.json" src/data/instrumentStrength.json
} > data/live/recalculation.md
echo "Done: data/live/recalculation.md"
