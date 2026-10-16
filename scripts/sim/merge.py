import json, sys, math
from collections import OrderedDict
g = OrderedDict()
for f in sys.argv[1:]:
    for line in open(f):
        if not line.startswith('{'): continue
        d = json.loads(line); k = (d['label'], d['policy'])
        g.setdefault(k, []).extend(d['scores'])
for (label, pol), xs in g.items():
    a = sorted(xs); n = len(a); m = sum(a) / n
    sd = math.sqrt(sum((x - m) ** 2 for x in a) / max(1, n - 1))
    print(json.dumps({'label': label, 'policy': pol, 'n': n, 'mean': round(m), 'ci95': round(1.96 * sd / math.sqrt(n)),
        'median': a[n // 2], 'p10': a[n // 10], 'p90': a[n * 9 // 10], 'rainbowPct': round(100 * sum(x >= 1120000 for x in a) / n, 1)}))
