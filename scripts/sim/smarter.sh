#!/bin/bash
# The smarter player's learning loop, on this PC (run by hand: it was a GitHub workflow, the owner wants it here).
# It works on a clean copy of origin/main (a git worktree), so the repo's own files are never touched:
#   1. games: the board value as shipped plays practice games under today's odds,
#   2. fit: a new board value (the challenger) is fitted from them,
#   3. gate: challenger and shipped one play 240 fixed games and 240 new ones (new every day), game by game,
#   4. decide: scripts/sim/gate.ts: clearly more games reaching 950,000, and the average not lower,
#   5. publish: only then, a smarter-player/ branch and a pull request for the owner to merge. Never main.
# 16 processes at the lowest priority by default (JOBS=8 while gaming): a few hours. The log, the games and the
# report are kept in ~/.local/state/vorax-smarter/<time>/.
# Usage: bash scripts/sim/smarter.sh            (PUBLISH=0: the report only, no branch or pull request)
set -euo pipefail
repo=$(cd "$(dirname "$0")/../.." && pwd)
JOBS=${JOBS:-16}
out=${XDG_STATE_HOME:-$HOME/.local/state}/vorax-smarter/$(date -u +%Y-%m-%d-%H%M)
mkdir -p "$out/games" "$out/gate/champion" "$out/gate/challenger"
exec > >(tee -a "$out/log.txt") 2>&1
step() { echo "$(date '+%H:%M:%S') $*"; }
# each line a command, JOBS at a time
run() { xargs -d '\n' -P "$JOBS" -I{} nice -n 19 bash -c {}; }

cd "$repo"
git fetch -q origin main
odds=$(git log -1 --format=%ct origin/main -- src/data/liveWeights.ts)
value=$(git log -1 --format=%ct origin/main -- src/data/boardValue.json)
[ "$odds" -gt "$value" ] || step "Note: the odds haven't changed since the board value was trained; running anyway."
work=$out/repo
git worktree add -q --detach "$work" origin/main
trap 'cd "$repo" && git worktree remove --force "$work" 2>/dev/null || true' EXIT
ln -s "$repo/node_modules" "$work/node_modules"
cd "$work"
day=$(( $(date -u +%s) / 86400 ))

step "1/5 Practice games with the board value as shipped (16 x 6,875)"
for i in $(seq 0 15); do
  echo "VALUE_MODEL=src/data/boardValue.json SEED0=$((100000000 + (day % 1000) * 200000 + i * 6250)) npx vite-node --root . scripts/sim/valueData.ts 6250 $out/games/train-$i.bin"
  echo "VALUE_MODEL=src/data/boardValue.json SEED0=$((300000000 + (day % 1000) * 20000 + i * 625)) npx vite-node --root . scripts/sim/valueData.ts 625 $out/games/check-$i.bin"
done | run

step "2/5 Fitting the challenger"
npx vite-node --root . scripts/sim/valueFit.ts "$out/challenger.json" "$out"/games/train-*.bin check: "$out"/games/check-*.bin | tee "$out/fit.txt"

step "3/5 Shipped and challenger on the same 480 games, with the advice as shipped"
for i in $(seq 0 15); do
  for base in $((1000000 + i * 15)) $((2000000 + (day % 1000) * 240 + i * 15)); do
    echo "RAW=1 SEED0=$base VALUE_MODEL=src/data/boardValue.json KIT_RULE=1 GOAL=target npx vite-node --root . scripts/sim/run.ts 15 plan:4:64:0.3 board 64 > $out/gate/champion/$base.jsonl"
    echo "RAW=1 SEED0=$base VALUE_MODEL=$out/challenger.json KIT_RULE=1 GOAL=target npx vite-node --root . scripts/sim/run.ts 15 plan:4:64:0.3 board 64 > $out/gate/challenger/$base.jsonl"
  done
done | run

step "4/5 Does the challenger pass the gate?"
npx vite-node --root . scripts/sim/gate.ts "$out/gate/champion" "$out/gate/challenger" "$out/report.md" | tee "$out/gate.txt"
if [ "$(tail -1 "$out/gate.txt")" != "pass=yes" ]; then
  step "Done: the shipped board value stays. Report: $out/report.md"
  exit 0
fi
if [ "${PUBLISH:-1}" = 0 ]; then
  step "Done: it passes; PUBLISH=0, so no pull request. The new board value: $out/challenger.json"
  exit 0
fi

step "5/5 Proposing the new board value (a pull request; an older one still open is closed)"
export GH_TOKEN=$(gh auth token --user tidewarden)
repo_name=tidewarden/tli-vorax-simulator
oddsDay=$(grep -oP "updated: '\K[^']+" src/data/liveWeights.ts)
name=$(date -u +%Y-%m-%d-%H%M)
cp "$out/challenger.json" src/data/boardValue.json
git -c core.hooksPath=/dev/null commit -qam "A new board value for the smarter player, trained under the odds of $oddsDay"
git push -q origin "HEAD:refs/heads/smarter-player/$name"
for n in $(gh pr list -R "$repo_name" --state open --json number,headRefName --jq '.[] | select(.headRefName | startswith("smarter-player/")) | .number'); do
  gh pr close "$n" -R "$repo_name" --delete-branch --comment "Replaced by a board value trained under newer odds."
done
gh pr create -R "$repo_name" --head "smarter-player/$name" --title "Smarter player: a new board value for the odds of $oddsDay" \
  --body "$(printf 'Trained from practice games under the odds of %s, and checked against the board value shipped, game by game, with the advice as shipped.\n\n%s\n\nMerging ships it: the site redeploys and the overlay picks it up on its next start.' "$oddsDay" "$(cat "$out/report.md")")"
step "Done. Report: $out/report.md"
