#!/bin/bash
# wasmShard.sh <shards> <gamesPerShard> <futures>  → merged stats per label, as shard.sh: the live advice's games
# (wasmRun.ts: the futures in WebAssembly, VALUE_MODEL's board value, KIT_RULE) split over processes, seeds from BASE.
cd "$(dirname "$0")/../.."
S=$1; N=$2; F=$3
tmp=$(mktemp -d)
for i in $(seq 0 $((S-1))); do RAW=1 SEED0=$((${BASE:-1000000} + i*N)) nice -n ${NICE:-19} npx vite-node --root . scripts/sim/wasmRun.ts $N $F > $tmp/$i.jsonl 2>$tmp/$i.err & done
wait
python3 scripts/sim/merge.py $tmp/*.jsonl
[ -n "$KEEP" ] && mkdir -p "$KEEP" && cp $tmp/*.jsonl "$KEEP"/
rm -rf $tmp
