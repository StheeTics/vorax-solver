#!/bin/bash
# The nightly jobs, on this PC. They ran on GitHub Actions until the code moved to a private repo (2026-10-22),
# where Actions minutes cost money; Actions keeps only the issue fixer, the deploy and the app release.
#   1. live:    pulls the boards and named icons the Solver shared from the collector, sends the dashboard its
#               numbers, teaches the reader the named icons, applies the odds changes the data supports (within
#               scripts/live/propose.ts's guards), replays the real moves, runs the tests, commits and pushes.
#               A push that changes src/ redeploys the site (deploy.yml).
#   2. check:   when the odds changed in the last day, 240 simulated games with the advice as shipped and a line
#               in data/live/history.jsonl (the dashboard's "Odds and advice over time").
#   3. smarter: when the odds changed after the board value was trained, practice games, a challenger fitted
#               from them, and the gate (challenger vs shipped on 240 fixed games and 240 new ones). Its result
#               goes in data/sim/smarter-history.jsonl; a challenger that passes becomes a pull request.
# Every job's outcome is added to data/live/nightly.jsonl, the dashboard's Loops table.
#
# It works in a clone of its own (~/.local/share/vorax/nightly, made on the first run and out of the way), on
# main, so the working copy and its branch are never touched. Logs: that clone's scripts/sim/results/nightly/<time>/.
# Needs ~/.config/vorax/nightly.env with LIVE_DATA_URL and LIVE_DATA_TOKEN (the collector's EXPORT_TOKEN).
#
# Usage: bash ~/repos/tli-vorax-simulator/scripts/nightly.sh (from anywhere), or bash scripts/nightly.sh
#        [--day] [--force] [live] [check] [smarter]   (no job named: all three)
#   --day    8 processes at once, for when the PC may be used for gaming (otherwise 16); always at nice 19
#   --force  run check and smarter even when the odds didn't change
#   NO_PUSH=1 bash scripts/nightly.sh ...: a test, on the working copy's commit: commits in the clone but pushes
#            nothing and opens no pull request
set -uo pipefail

CLONE=${VORAX_NIGHTLY_DIR:-$HOME/.local/share/vorax/nightly}
ENV_FILE=$HOME/.config/vorax/nightly.env
JOBS=16
FORCE=
WANT=()
for a in "$@"; do
  case "$a" in
    --day) JOBS=8 ;;
    --force) FORCE=1 ;;
    live | check | smarter) WANT+=("$a") ;;
    *) echo "Unknown argument: $a" >&2; exit 2 ;;
  esac
done
[ ${#WANT[@]} -eq 0 ] && WANT=(live check smarter)

# from the working copy: run the clone's own copy of this script, as of origin/main
if [ -z "${VORAX_IN_CLONE:-}" ]; then
  here=$(cd "$(dirname "$0")/.." && pwd)
  if [ ! -d "$CLONE/.git" ]; then
    git clone -q "$(git -C "$here" remote get-url origin)" "$CLONE" || exit 1
    git -C "$CLONE" config user.name "$(git -C "$here" config user.name)"
    git -C "$CLONE" config user.email "$(git -C "$here" config user.email)"
  fi
  # the working copy's origin is the clone's too (it changes when the code moves repos)
  git -C "$CLONE" remote set-url origin "$(git -C "$here" remote get-url origin)"
  # a test (NO_PUSH) runs the working copy's commit instead
  git -C "$CLONE" fetch -q origin || exit 1
  ref=origin/main
  [ -n "${NO_PUSH:-}" ] && { git -C "$CLONE" fetch -q "$here" HEAD && ref=FETCH_HEAD || exit 1; }
  git -C "$CLONE" checkout -q -f main && git -C "$CLONE" reset -q --hard "$ref" || exit 1
  VORAX_IN_CLONE=1 exec bash "$CLONE/scripts/nightly.sh" "$@"
fi

cd "$CLONE"
[ -f "$ENV_FILE" ] && { set -a; . "$ENV_FILE"; set +a; }
case "$(git config user.email)" in
  *tidewarden*) ;;
  *) echo "The clone's git identity isn't tidewarden's: $(git config user.email)" >&2; exit 1 ;;
esac

stamp=$(date +%Y-%m-%d-%H%M)
LOG=scripts/sim/results/nightly/$stamp
mkdir -p "$LOG"
exec 9> scripts/sim/results/nightly/.lock
flock -n 9 || { echo "The nightly jobs are already running." >&2; exit 1; }
REPO=$(git remote get-url origin | sed -E 's#^.*[:/]([^/:]+/[^/]+)$#\1#; s#\.git$##')
export GH_TOKEN=${GH_TOKEN:-$(gh auth token --user tidewarden 2>/dev/null)}
export NICE=19

# npm ci only when the lock file changed since the last install
lock=$(sha1sum package-lock.json | cut -c1-40)
if [ "$(cat node_modules/.nightly-lock 2>/dev/null)" != "$lock" ]; then
  npm ci --no-audit --no-fund > "$LOG/npm.log" 2>&1 || { echo "npm ci failed: $LOG/npm.log" >&2; exit 1; }
  echo "$lock" > node_modules/.nightly-lock
fi

vn() { nice -n 19 npx vite-node --root . "$@"; }
# runs each line of stdin as a command, $JOBS at once; fails when any of them failed
pool() { xargs -d '\n' -n1 -P "$JOBS" bash -c 'eval "$1"' _; }
# the newest main, with nothing left over from a job before
fresh() {
  git checkout -q -f main && git clean -qfd -- data src || return 1
  [ -n "${NO_PUSH:-}" ] && { git reset -q --hard; return 0; }
  git fetch -q origin && git reset -q --hard origin/main
}
# commit what's staged and push it, on top of anything pushed meanwhile
push() {
  git commit -q "$@" || return 1
  [ -n "${NO_PUSH:-}" ] && { echo "(NO_PUSH: committed in the clone, not pushed)"; return 0; }
  git pull -q --rebase && git push -q
}

job_live() {
  [ -n "${LIVE_DATA_URL:-}" ] && [ -n "${LIVE_DATA_TOKEN:-}" ] || { NOTE="no LIVE_DATA_URL and LIVE_DATA_TOKEN in $ENV_FILE"; return 1; }
  vn scripts/live/pull.ts | tee "$LOG/pull.txt" || return 1
  vn scripts/live/summary.ts || echo "(the dashboard's numbers weren't sent)"
  vn scripts/live/newCards.ts | tee "$LOG/cards.txt" || return 1
  vn scripts/live/learnIcons.ts | tee "$LOG/icons.txt" || return 1
  vn scripts/live/weights.ts | tee "$LOG/weights.txt" || return 1
  vn scripts/live/checkRules.ts data/live/raw | tee "$LOG/rules.txt" || return 1
  nice -n 19 npm test > "$LOG/test.txt" 2>&1 || { tail -30 "$LOG/test.txt"; return 1; }
  if ! git diff --quiet src/data/liveWeights.ts; then
    python3 -c "import json,sys; print(json.dumps({'date': sys.argv[1], 'change': 'Odds updated from live data: ' + sys.argv[2]}))" "$(date -u +%Y-%m-%d)" "$(head -1 "$LOG/weights.txt")" >> data/live/history.jsonl
  fi
  git add data/live src/data/liveWeights.ts src/solver/scan/learnedIcons.json
  if git diff --cached --quiet; then NOTE="nothing new"; return 0; fi
  {
    echo "Live data: $(head -1 "$LOG/pull.txt")"
    echo
    grep -v '^No weight changes' "$LOG/weights.txt" || true
    grep -v '^No learned icons' "$LOG/icons.txt" || true
  } > "$LOG/message.txt"
  push -F "$LOG/message.txt" || return 1
  NOTE=$(head -1 "$LOG/pull.txt")
}

job_check() {
  if [ -z "$FORCE" ] && [ -z "$(git log --since='25 hours ago' --format=%h -- src/data/liveWeights.ts)" ]; then
    NOTE="the odds didn't change"; return 3
  fi
  rm -rf "$LOG/check"
  KEEP="$LOG/check" VALUE_MODEL=src/data/boardValue.json KIT_RULE=1 GOAL=target bash scripts/sim/shard.sh "$JOBS" $((240 / JOBS)) plan:4:32:0.3 board 16 > "$LOG/check.txt" || return 1
  python3 scripts/sim/history.py "$LOG/check" "$(date -u +%Y-%m-%d)" "Daily check: the advice under the odds of $(grep -oP "updated: '\K[^']+" src/data/liveWeights.ts)" || return 1
  NOTE=$(tail -1 data/live/history.jsonl | python3 -c "import json,sys; e=json.load(sys.stdin); print(f\"{round(100*e['reached'])}% of 240 simulated games reached 840k\")")
  git add data/live/history.jsonl
  push -m "Daily check: $NOTE"
}

job_smarter() {
  local odds value day dir name
  odds=$(git log -1 --format=%ct -- src/data/liveWeights.ts)
  value=$(git log -1 --format=%ct -- src/data/boardValue.json)
  if [ -z "$FORCE" ] && [ "$odds" -le "$value" ]; then
    NOTE="the odds haven't changed since the board value was trained"; return 3
  fi
  day=$(( $(date -u +%s) / 86400 ))
  dir=$LOG/smarter
  rm -rf "$dir"; mkdir -p "$dir/games" "$dir/champion" "$dir/challenger"

  # practice games with the board value as shipped, under today's odds (the same seeds the Actions job used)
  for i in $(seq 0 15); do
    echo "VALUE_MODEL=src/data/boardValue.json SEED0=$((100000000 + (day % 1000) * 200000 + i * 6250)) nice -n 19 npx vite-node --root . scripts/sim/valueData.ts 6250 $dir/games/train-$i.bin > /dev/null 2>> $dir/games.err"
    echo "VALUE_MODEL=src/data/boardValue.json SEED0=$((300000000 + (day % 1000) * 20000 + i * 625)) nice -n 19 npx vite-node --root . scripts/sim/valueData.ts 625 $dir/games/check-$i.bin > /dev/null 2>> $dir/games.err"
  done | pool || { tail -20 "$dir/games.err"; return 1; }

  vn scripts/sim/valueFit.ts "$dir/challenger.json" "$dir"/games/train-*.bin check: "$dir"/games/check-*.bin | tee "$dir/fit.txt" || return 1

  # the gate: shipped and challenger, the advice as shipped, on the same games
  for i in $(seq 0 15); do
    for base in $((1000000 + i * 15)) $((2000000 + (day % 1000) * 240 + i * 15)); do
      echo "RAW=1 SEED0=$base VALUE_MODEL=src/data/boardValue.json KIT_RULE=1 GOAL=target nice -n 19 npx vite-node --root . scripts/sim/run.ts 15 plan:4:64:0.3 board 64 > $dir/champion/$base.jsonl 2>> $dir/gate.err"
      echo "RAW=1 SEED0=$base VALUE_MODEL=$dir/challenger.json KIT_RULE=1 GOAL=target nice -n 19 npx vite-node --root . scripts/sim/run.ts 15 plan:4:64:0.3 board 64 > $dir/challenger/$base.jsonl 2>> $dir/gate.err"
    done
  done | pool || { tail -20 "$dir/gate.err"; return 1; }

  vn scripts/sim/gate.ts "$dir/champion" "$dir/challenger" "$dir/report.md" | tee "$dir/gate.txt" || return 1
  local pass
  pass=$(tail -1 "$dir/gate.txt" | sed -n 's/^pass=//p')

  RUN="local-$stamp" ODDS=$(grep -oP "updated: '\K[^']+" src/data/liveWeights.ts) SHIPPED=$(git log -1 --format=%h -- src/data/boardValue.json) \
    vn scripts/sim/smarterHistory.ts "$dir/champion" "$dir/challenger" data/sim/smarter-history.jsonl || return 1
  git add data/sim/smarter-history.jsonl
  push -m "Smarter player: the nightly gate's result, in data/sim/smarter-history.jsonl" || return 1

  if [ "$pass" != "yes" ]; then NOTE="the challenger didn't pass the gate"; return 0; fi
  # passed: a pull request (an older one still open is closed)
  local when
  when=$(grep -oP "updated: '\K[^']+" src/data/liveWeights.ts)
  name="$(date -u +%Y-%m-%d)-$stamp"
  [ -n "${NO_PUSH:-}" ] && { NOTE="the challenger passed (NO_PUSH: no pull request)"; return 0; }
  git checkout -q -b "smarter-player/$name"
  cp "$dir/challenger.json" src/data/boardValue.json
  git commit -qam "A new board value for the smarter player, trained under the odds of $when" || return 1
  git push -q origin "HEAD:refs/heads/smarter-player/$name" || return 1
  git checkout -q main
  for n in $(gh pr list -R "$REPO" --state open --json number,headRefName --jq '.[] | select(.headRefName | startswith("smarter-player/")) | .number'); do
    gh pr close "$n" -R "$REPO" --delete-branch --comment "Replaced by a board value trained under newer odds."
  done
  gh pr create -R "$REPO" --head "smarter-player/$name" --title "Smarter player: a new board value for the odds of $when" \
    --body "$(printf 'Trained nightly on the PC from practice games under the odds of %s, and checked against the board value shipped, game by game, with the advice as shipped.\n\n%s\n\nMerging ships it: the site redeploys and the overlay picks it up on its next start.' "$when" "$(cat "$dir/report.md")")" || return 1
  NOTE="the challenger passed: a pull request is open"
}

declare -A NAMES=([live]=live-data [check]=daily-check [smarter]=smarter-player)
: > "$LOG/runs.jsonl"
summary=()
for j in "${WANT[@]}"; do
  fresh || { echo "Couldn't update the clone." >&2; exit 1; }
  echo "== ${NAMES[$j]} ($(date +%H:%M))"
  NOTE=
  t0=$(date +%s)
  "job_$j" > >(tee "$LOG/$j.log") 2>&1
  rc=$?
  case $rc in 0) result=success ;; 3) result=skipped ;; *) result=failure; NOTE=${NOTE:-"see $LOG/$j.log"} ;; esac
  python3 -c "import json,sys; print(json.dumps({'job': sys.argv[1], 'started': sys.argv[2], 'minutes': int(sys.argv[3]), 'result': sys.argv[4], 'note': sys.argv[5]}))" \
    "${NAMES[$j]}" "$(date -u -d "@$t0" +%Y-%m-%dT%H:%M:%SZ)" $(( ($(date +%s) - t0 + 59) / 60 )) "$result" "$NOTE" >> "$LOG/runs.jsonl"
  summary+=("${NAMES[$j]}: $result${NOTE:+ ($NOTE)}")
  echo "   $result${NOTE:+: $NOTE}"
done

# the dashboard's Loops table
fresh && cat "$LOG/runs.jsonl" >> data/live/nightly.jsonl && git add data/live/nightly.jsonl && push -m "Nightly jobs: $(printf '%s; ' "${summary[@]}" | sed 's/; $//')" \
  || echo "Couldn't record the runs in data/live/nightly.jsonl" >&2

printf '%s\n' "${summary[@]}" > "$LOG/summary.txt"
command -v powershell.exe > /dev/null && powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$(wslpath -w "$CLONE/scripts/local/toast.ps1")" \
  "Vorax nightly jobs done" "$(printf '%s\n' "${summary[@]}")" > /dev/null 2>&1
grep -q failure "$LOG/summary.txt" && exit 1 || exit 0
