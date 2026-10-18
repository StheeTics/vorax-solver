"""Compares two advice simulation runs (shard.sh KEEP directories) game by game, and two strength files.
Usage: python3 scripts/sim/compare.py <previous run dir> <new run dir> [<previous strengths.json> <new strengths.json>]
Prints a Markdown report. Games are matched by seed, so only seeds in both runs count."""
import glob, json, sys

TARGET = 950_000  # the advice's goal (src/strategy/bot.ts TARGET): counts as rainbow with the endgame battle bonus


def scores(d):
    out = {}
    for f in glob.glob(d + '/*.jsonl'):
        for line in open(f):
            for g in json.loads(line).get('decisions', []):
                out[g['seed']] = g['score']
    return out


def row(name, v):
    v = sorted(v)
    n = len(v)
    return '| %s | %.0f%% | %.0fk | %.0fk | %.0fk |' % (name, 100 * sum(x >= TARGET for x in v) / n, sum(min(x, TARGET) for x in v) / n / 1000, v[n // 2] / 1000, v[n // 10] / 1000)


prev, new = scores(sys.argv[1]), scores(sys.argv[2])
seeds = sorted(set(prev) & set(new))
print('## Simulated games (%d, same seeds)\n' % len(seeds))
if seeds:
    print('| | Reached 950k | Average counted to 950k | Median | Worst 10% |\n|---|---|---|---|---|')
    print(row('Before', [prev[s] for s in seeds]))
    print(row('Now', [new[s] for s in seeds]))
    print('\nReached 950k now but not before: %d games. Before but not now: %d.' % (sum(new[s] >= TARGET > prev[s] for s in seeds), sum(prev[s] >= TARGET > new[s] for s in seeds)))
else:
    print('No earlier run with the same seeds to compare with.')
if len(sys.argv) > 4:
    a = json.load(open(sys.argv[3]))['strength']
    b = json.load(open(sys.argv[4]))['strength']
    print('\n## Instrument strengths (average score counted to 950k, in thousands)\n')
    print('| Instrument | Before | Now | Change |\n|---|---|---|---|')
    for name in sorted(b, key=lambda k: -b[k]):
        before = a.get(name)
        print('| %s | %s | %.0f | %s |' % (name, '%.0f' % (before / 1000) if before and before > 1000 else '–', b[name] / 1000, '%+.0f' % ((b[name] - before) / 1000) if before and before > 1000 else 'new scale'))
