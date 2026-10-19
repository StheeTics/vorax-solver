// The private analytics page (/dashboard). It holds no data: it asks for the dashboard password once per
// browser, then reads /v1/stats with it, and the odds history (data/live/history.jsonl) from the public repo.
export const DASHBOARD_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Vorax analytics</title>
<style>
  :root { --bg-0:#0b0506; --bg-1:#1d0a0c; --bg-2:#2a1014; --iron:#2b2a2e; --gold:#e3b25a; --gold-hi:#ffd98a; --gold-lo:#8a5e22; --text:#f1e9e2; --dim:#b8aba3; --faint:#7d716b; --red:#ff5b5b; --blue:#6aa7ff; color-scheme: dark; }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg-0); color: var(--text); font: 15px/1.45 Inter, 'Segoe UI', system-ui, sans-serif; }
  main { max-width: 1100px; margin: 0 auto; padding: 24px 16px 48px; }
  h1 { margin: 0 0 4px; color: var(--gold-hi); font: 700 26px/1.2 Cinzel, Georgia, serif; }
  h2 { margin: 28px 0 10px; color: var(--gold); font-size: 15px; letter-spacing: .06em; text-transform: uppercase; }
  .sub { margin: 0; color: var(--faint); font-size: 13px; }
  .tiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; margin-top: 18px; }
  .tile { padding: 12px 14px; border: 1px solid var(--iron); border-radius: 8px; background: var(--bg-1); }
  .tile b { display: block; color: var(--gold-hi); font-size: 26px; font-variant-numeric: tabular-nums; }
  .tile span { color: var(--dim); font-size: 13px; }
  .panel { padding: 14px; border: 1px solid var(--iron); border-radius: 8px; background: var(--bg-1); overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; font-size: 13.5px; font-variant-numeric: tabular-nums; }
  th, td { padding: 5px 8px; border-bottom: 1px solid var(--iron); text-align: left; white-space: nowrap; }
  th { color: var(--dim); font-weight: 600; }
  td.n, th.n { text-align: right; }
  .legend { display: flex; gap: 16px; margin: 0 0 8px; color: var(--dim); font-size: 13px; }
  .key { display: inline-block; width: 10px; height: 10px; margin-right: 6px; border-radius: 2px; }
  svg text { fill: var(--dim); font-size: 11px; }
  form { display: flex; gap: 8px; margin-top: 18px; }
  input { padding: 8px 10px; border: 1px solid var(--gold-lo); border-radius: 6px; background: var(--bg-1); color: var(--text); font: inherit; }
  button { padding: 8px 14px; border: 1px solid var(--gold); border-radius: 6px; background: var(--gold-lo); color: var(--gold-hi); font: 600 14px inherit; cursor: pointer; }
  .err { color: var(--red); }
  [hidden] { display: none !important; }
</style>
</head>
<body>
<main>
  <h1>Vorax analytics</h1>
  <p class="sub" id="sub">Boards shared by the Solver and Vorax Overlay. Players are counted per day: the collector keeps no lasting ID of anyone.</p>
  <form id="login" hidden>
    <label for="pw" class="sub">Dashboard password</label>
    <input id="pw" type="password" autocomplete="current-password" required>
    <button type="submit">Open</button>
    <span class="err" id="err" role="alert"></span>
  </form>
  <div id="out" hidden>
    <div class="tiles" id="tiles"></div>
    <h2>Per day</h2>
    <div class="panel"><p class="legend"><span><i class="key" style="background:var(--gold)"></i>Games</span><span><i class="key" style="background:var(--blue)"></i>Players</span></p><div id="days"></div></div>
    <h2>Real results</h2>
    <div class="panel" id="real"></div>
    <h2>Card effects in real games</h2>
    <div class="panel" id="rules"></div>
    <h2>How far games got (highest round)</h2>
    <div class="panel" id="rounds"></div>
    <h2>Odds and advice over time</h2>
    <div class="panel" id="history"></div>
    <h2>Latest games</h2>
    <div class="panel" id="recent"></div>
    <h2>Games per site version</h2>
    <div class="panel" id="versions"></div>
  </div>
</main>
<script>
const KEY = 'vorax.dashboard'
const HISTORY = 'https://raw.githubusercontent.com/tidewarden/tli-vorax-simulator/main/data/live/history.jsonl'
const RULES = 'https://raw.githubusercontent.com/tidewarden/tli-vorax-simulator/main/data/live/rules-check.json'
const $ = id => document.getElementById(id)
const esc = v => String(v).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
const pct = x => Math.round(100 * x) + '%'
const table = (head, rows, num = []) => '<table><thead><tr>' + head.map((h, i) => '<th' + (num.includes(i) ? ' class="n"' : '') + '>' + esc(h) + '</th>').join('') + '</tr></thead><tbody>' + rows.map(r => '<tr>' + r.map((c, i) => '<td' + (num.includes(i) ? ' class="n"' : '') + '>' + esc(c) + '</td>').join('') + '</tr>').join('') + '</tbody></table>'

function bars(days) {
  const w = Math.max(320, days.length * 46), h = 160, top = Math.max(1, ...days.map(d => Math.max(d.games, d.players)))
  const x = i => 30 + i * ((w - 40) / days.length), bw = Math.min(16, (w - 40) / days.length / 2 - 2)
  const y = v => h - 24 - (v / top) * (h - 40)
  let s = '<svg width="' + w + '" height="' + h + '" role="img" aria-label="Games and players per day">'
  days.forEach((d, i) => {
    s += '<rect x="' + x(i) + '" y="' + y(d.games) + '" width="' + bw + '" height="' + (h - 24 - y(d.games)) + '" fill="#e3b25a"><title>' + d.day + ': ' + d.games + ' games</title></rect>'
    s += '<rect x="' + (x(i) + bw + 2) + '" y="' + y(d.players) + '" width="' + bw + '" height="' + (h - 24 - y(d.players)) + '" fill="#6aa7ff"><title>' + d.day + ': ' + d.players + ' players</title></rect>'
    s += '<text x="' + x(i) + '" y="' + (h - 8) + '">' + d.day.slice(5) + '</text>'
  })
  return s + '<text x="0" y="14">' + top + '</text></svg>'
}

async function load(pw) {
  const r = await fetch('/v1/stats', { headers: { authorization: 'Bearer ' + pw } })
  if (r.status === 401) throw new Error('Wrong password.')
  if (!r.ok) throw new Error('The collector answered ' + r.status + '.')
  const s = await r.json()
  const appGames = s.days.reduce((n, d) => n + d.app, 0)
  $('tiles').innerHTML = [
    [s.totals.games, 'games shared'], [s.totals.boards, 'boards read'], [s.totals.playersToday, 'players today'],
    [pct(s.totals.games ? appGames / s.totals.games : 0), 'of games in Vorax Overlay'], [pct(s.corrected), 'of boards corrected by hand'],
  ].map(([v, l]) => '<div class="tile"><b>' + esc(v) + '</b><span>' + esc(l) + '</span></div>').join('')
  $('days').innerHTML = bars(s.days) + table(['Day', 'Games', 'Players', 'Boards', 'Website', 'App'], s.days.slice().reverse().map(d => [d.day, d.games, d.players, d.boards, d.website, d.app]), [1, 2, 3, 4, 5])
  const rounds = Object.entries(s.rounds).sort((a, b) => a[0] - b[0])
  $('rounds').innerHTML = table(['Highest round', 'Games', ''], rounds.map(([r, n]) => [r, n, '█'.repeat(Math.round(40 * n / Math.max(...rounds.map(x => x[1]))))]), [1])
  $('recent').innerHTML = table(['Started', 'Where', 'Boards', 'Round', 'Instruments'], s.recent.map(g => [g.start.replace('T', ' ').slice(0, 16), g.app ? 'App' : 'Website', g.boards, g.round, g.instruments.join(', ')]), [2, 3])
  $('versions').innerHTML = table(['Version', 'Games'], Object.entries(s.versions).sort((a, b) => b[1] - a[1]), [1])
  const f = s.finished, median = f.finals.length ? f.finals.slice().sort((a, b) => a - b)[f.finals.length >> 1] : 0
  $('real').innerHTML = (f.games
    ? '<p>' + f.games + ' finished game' + (f.games === 1 ? '' : 's') + ' (reached the round-13 Surgical Protocol): <b>' + f.reached + ' reached 950k</b> (' + pct(f.reached / f.games) + '), median final ' + Math.round(median / 1000) + 'k. The simulator expects about 50%.</p>'
    : '<p class="sub">No finished games shared yet.</p>')
    + (s.calibration.length
      ? '<p class="sub">Predicted against real: each board’s advice gave a chance of 950k; this is how those games ended. Close numbers mean the simulator is honest.</p>' + table(['Predicted', 'Average prediction', 'Boards', 'Their games reached 950k'], s.calibration.map(c => [c.band, pct(c.predicted), c.games, pct(c.reached / c.games)]), [1, 2, 3])
      : '<p class="sub">Predicted against real appears once boards carry the advice shown (Solver builds from 2026-10-19).</p>')
  try {
    const rc = await (await fetch(RULES, { cache: 'no-store' })).json()
    $('rules').innerHTML = '<p>' + rc.checked + ' real moves replayed in the simulator: <b>' + rc.reproduced + ' reproduced exactly</b>, ' + rc.missed.length + ' not. A move the simulator can’t reproduce points at a card effect it gets wrong, or a misread board.</p>'
      + (rc.missed.length ? table(['Round', 'Cards on offer', 'Instruments', 'Closest the simulator got', 'Tanks off'], rc.missed.map(m => [m.round, m.hand.join(', '), m.instruments.join(', '), m.best, m.gap]), [0, 4]) : '')
  } catch (e) {
    $('rules').innerHTML = '<p class="sub">The card-effect check couldn’t be read from the repo.</p>'
  }
  $('sub').textContent = 'Updated ' + s.generated.replace('T', ' ').slice(0, 16) + ' UTC. Players are counted per day: the collector keeps no lasting ID of anyone.'
  try {
    const t = await (await fetch(HISTORY, { cache: 'no-store' })).text()
    const h = t.split('\\n').filter(Boolean).map(l => JSON.parse(l)).reverse()
    $('history').innerHTML = h.length ? table(['Date', 'Change', 'Reached 950k', 'Average to 950k', 'Median'], h.map(e => [e.date, e.change, e.reached === undefined ? '' : pct(e.reached), e.average ? Math.round(e.average / 1000) + 'k' : '', e.median ? Math.round(e.median / 1000) + 'k' : '']), [2, 3, 4]) : '<p class="sub">No history yet.</p>'
  } catch (e) {
    $('history').innerHTML = '<p class="sub">The history couldn’t be read from the repo.</p>'
  }
  $('login').hidden = true
  $('out').hidden = false
}

async function start(pw) {
  try {
    await load(pw)
    try { localStorage.setItem(KEY, pw) } catch (e) {}
  } catch (e) {
    try { localStorage.removeItem(KEY) } catch (x) {}
    $('login').hidden = false
    $('err').textContent = e.message
  }
}
$('login').addEventListener('submit', e => { e.preventDefault(); $('err').textContent = ''; start($('pw').value) })
let saved = null
try { saved = localStorage.getItem(KEY) } catch (e) {}
if (saved) start(saved); else $('login').hidden = false
</script>
</body>
</html>
`
