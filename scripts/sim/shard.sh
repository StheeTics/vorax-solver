#!/bin/bash
# shard.sh <shards> <gamesPerShard> <policy> <mode> <json>  → merged stats per label (raw scores pooled)
cd "$(dirname "$0")/../.."
S=$1; N=$2; shift 2
tmp=$(mktemp -d)
for i in $(seq 0 $((S-1))); do RAW=1 SEED0=$((${BASE:-1000000} + i*N)) nice -n ${NICE:-19} npx vite-node --root . scripts/sim/run.ts $N "$@" > $tmp/$i.jsonl 2>$tmp/$i.err & done
wait
python3 scripts/sim/merge.py $tmp/*.jsonl
[ -n "$KEEP" ] && mkdir -p "$KEEP" && cp $tmp/*.jsonl "$KEEP"/
rm -rf $tmp
