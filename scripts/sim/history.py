"""Adds a line to data/live/history.jsonl (the dashboard's "Odds and advice over time") for a simulation run.
Usage: python3 scripts/sim/history.py <run dir> <date> <what changed>"""
import glob, json, sys

TARGET = 900_000  # the advice's goal (src/strategy/bot.ts TARGET)


def metrics(d):
    scores = []
    for f in glob.glob(d + '/*.jsonl'):
        for line in open(f):
            scores += [g['score'] for g in json.loads(line).get('decisions', [])]
    scores.sort()
    n = len(scores)
    return {'games': n, 'reached': round(sum(x >= TARGET for x in scores) / n, 3), 'average': round(sum(min(x, TARGET) for x in scores) / n), 'median': scores[n // 2]}


if __name__ == '__main__':
    run, date, change = sys.argv[1], sys.argv[2], sys.argv[3]
    with open('data/live/history.jsonl', 'a') as out:
        out.write(json.dumps({'date': date, 'change': change, **metrics(run)}) + '\n')
