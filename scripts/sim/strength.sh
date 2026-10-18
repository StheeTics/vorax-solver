#!/bin/bash
# strength.sh <gamesPerInstrument> <shards>  → src/data/instrumentStrength.json
# Shards run in parallel at the lowest priority (the same PC is often used for gaming).
cd "$(dirname "$0")/../.."
N=$1; S=$2
tmp=$(mktemp -d)
for i in $(seq 0 $((S-1))); do nice -n 19 npx vite-node --root . scripts/sim/strengthShard.ts $N $i $S > $tmp/$i.jsonl & done
wait
python3 - "$tmp" <<'PY'
import json, glob, sys, re
rows = [json.loads(l) for f in glob.glob(sys.argv[1] + '/*.jsonl') for l in open(f)]
odds = re.search(r"updated: '([^']+)'", open('src/data/liveWeights.ts').read()).group(1)
out = {'odds': odds, 'games': rows[0]['games'], 'strength': {r['name']: r['strength'] for r in sorted(rows, key=lambda r: -r['strength'])}}
json.dump(out, open('src/data/instrumentStrength.json', 'w'), indent=2)
open('src/data/instrumentStrength.json', 'a').write('\n')
print(len(rows), 'instruments measured')
PY
rm -rf $tmp
