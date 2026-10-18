#!/bin/bash
# Planning-bot runs: every basic with Lady of the Plague Quarter and with Beak, equipped from round 1.
# planning.sh <shards per build> <games per shard> <out dir>   (raw per-shard JSON, merge with merge.py)
cd "$(dirname "$0")/../.."
S=$1; N=$2; OUT=$3; mkdir -p "$OUT"
for b in 1 2 3 4 5 6 7 8; do for a in 19 23; do for i in $(seq 0 $((S-1))); do echo "$b $a $i"; done; done; done |
  xargs -P 16 -L 1 sh -c 'RAW=1 SEED0=$((5000000 + $2 * 1000)) npx vite-node --root . scripts/sim/run.ts '"$N"' ev:6:13:2 fixed "[[$0,$1]]" > '"$OUT"'/$0_$1_$2.jsonl 2>/dev/null'
echo PLANNINGDONE
