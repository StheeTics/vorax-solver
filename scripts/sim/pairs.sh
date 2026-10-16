#!/bin/bash
# Every basic × advanced instrument pair, equipped from round 1, fair bot. One JSON line per pair.
# pairs.sh <games per pair> <parallel jobs> <out file>
cd "$(dirname "$0")/../.."
N=$1; P=$2; OUT=$3
for b in 1 2 3 4 5 6 7 8; do for a in $(seq 9 24); do echo "[[${b},${a}]]"; done; done |
  xargs -P "$P" -I{} sh -c "SEED0=1 npx vite-node --root . scripts/sim/run.ts $N ev:8:0 fixed '{}' 2>/dev/null" > "$OUT"
echo PAIRSDONE
