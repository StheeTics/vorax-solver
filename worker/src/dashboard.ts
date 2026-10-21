// The private analytics page (/dashboard). It holds no data: it asks for the dashboard password once per
// browser, then reads /v1/stats with it, the odds history and the card-effect check from the public repo,
// and the automated loops' runs from GitHub's public API.
// Design: a neutral palette that follows the system's light or dark mode, one accent colour, red and green
// kept for status, key numbers first, then health, trends and the detail tables, in a responsive grid.
export const DASHBOARD_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<meta name="color-scheme" content="light dark">
<title>Vorax analytics</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap">
<style>
  :root {
    --bg: #f6f6f7; --card: #ffffff; --border: #e5e5e8; --text: #18181b; --muted: #6b6b76; --faint: #a1a1aa;
    --accent: #4f46e5; --accent-2: #0891b2; --grid: #ececef;
    --ok: #15803d; --bad: #dc2626; --warn: #b45309;
    --radius: 12px; --shadow: 0 1px 2px rgb(0 0 0 / 0.04);
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #0b0b0d; --card: #131316; --border: #26262b; --text: #f4f4f5; --muted: #a1a1aa; --faint: #71717a;
      --accent: #8b8cf8; --accent-2: #22d3ee; --grid: #222227;
      --ok: #4ade80; --bad: #f87171; --warn: #fbbf24;
      --shadow: none;
    }
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--text); font: 14px/1.5 Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif; -webkit-font-smoothing: antialiased; }
  main { max-width: 1240px; margin: 0 auto; padding: 32px 20px 64px; }
  header { display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: 8px 24px; margin-bottom: 24px; }
  h1 { margin: 0; font-size: 22px; font-weight: 600; letter-spacing: -0.01em; }
  .sub { margin: 4px 0 0; color: var(--muted); font-size: 13px; }
  .live { display: inline-flex; align-items: center; gap: 8px; color: var(--muted); font-size: 13px; }
  .live::before { content: ''; width: 8px; height: 8px; border-radius: 50%; background: var(--ok); box-shadow: 0 0 0 3px color-mix(in srgb, var(--ok) 20%, transparent); }

  .kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 12px; margin-bottom: 16px; }
  .kpi { padding: 16px 18px; border: 1px solid var(--border); border-radius: var(--radius); background: var(--card); box-shadow: var(--shadow); }
  .kpi span { display: block; color: var(--muted); font-size: 12.5px; font-weight: 500; }
  .kpi b { display: block; margin-top: 6px; font-size: 28px; font-weight: 600; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; }
  .kpi small { display: block; margin-top: 2px; color: var(--faint); font-size: 12px; }

  .grid { display: grid; grid-template-columns: repeat(12, 1fr); gap: 16px; }
  .card { grid-column: span 12; min-width: 0; padding: 18px 20px; border: 1px solid var(--border); border-radius: var(--radius); background: var(--card); box-shadow: var(--shadow); }
  @media (min-width: 1000px) { .half { grid-column: span 6; } }
  .card h2 { margin: 0; font-size: 15px; font-weight: 600; }
  .card > .sub { margin: 2px 0 14px; }
  .scroll { overflow-x: auto; }

  table { width: 100%; border-collapse: collapse; font-size: 13.5px; font-variant-numeric: tabular-nums; }
  th { padding: 0 10px 8px; color: var(--muted); font-size: 12px; font-weight: 500; text-align: left; white-space: nowrap; border-bottom: 1px solid var(--border); }
  td { padding: 9px 10px; border-bottom: 1px solid var(--grid); vertical-align: top; }
  tr:last-child td { border-bottom: 0; }
  th:first-child, td:first-child { padding-left: 0; white-space: nowrap; }
  td.n, th.n { text-align: right; white-space: nowrap; }
  td.dim { color: var(--muted); }
  a { color: var(--accent); text-decoration: none; }
  a:hover { text-decoration: underline; }

  .pill { display: inline-flex; align-items: center; gap: 6px; padding: 2px 9px; border-radius: 999px; font-size: 12.5px; font-weight: 500; white-space: nowrap; }
  .pill::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
  .pill.ok { color: var(--ok); background: color-mix(in srgb, var(--ok) 12%, transparent); }
  .pill.bad { color: var(--bad); background: color-mix(in srgb, var(--bad) 12%, transparent); }
  .pill.warn { color: var(--warn); background: color-mix(in srgb, var(--warn) 14%, transparent); }
  .pill.idle { color: var(--muted); background: color-mix(in srgb, var(--muted) 12%, transparent); }

  .legend { display: flex; gap: 16px; margin: 0 0 10px; color: var(--muted); font-size: 12.5px; }
  .key { display: inline-block; width: 10px; height: 10px; margin-right: 6px; border-radius: 3px; vertical-align: -1px; }
  svg { display: block; width: 100%; height: auto; overflow: visible; }
  svg text { fill: var(--muted); font-size: 11px; font-family: inherit; }
  svg .grid-line { stroke: var(--grid); }
  svg .a { fill: var(--accent); }
  svg .b { fill: var(--accent-2); }
  svg .line { fill: none; stroke: var(--accent); stroke-width: 2.5; stroke-linejoin: round; }
  svg .dot { fill: var(--card); stroke: var(--accent); stroke-width: 2.5; }
  svg .goal { stroke: var(--ok); stroke-dasharray: 4 4; }
  svg .goal-text { fill: var(--ok); font-weight: 600; }

  .hbar { display: flex; align-items: center; gap: 10px; }
  .hbar i { display: block; height: 8px; border-radius: 4px; background: var(--accent); min-width: 2px; }
  .stat { display: flex; flex-wrap: wrap; gap: 8px 28px; margin: 0 0 14px; }
  .stat div span { display: block; color: var(--muted); font-size: 12px; }
  .stat div b { font-size: 20px; font-weight: 600; font-variant-numeric: tabular-nums; }

  form { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; max-width: 520px; padding: 20px; border: 1px solid var(--border); border-radius: var(--radius); background: var(--card); }
  form label { width: 100%; color: var(--muted); font-size: 13px; }
  input { flex: 1; min-width: 200px; padding: 9px 12px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg); color: var(--text); font: inherit; }
  input:focus { outline: 2px solid color-mix(in srgb, var(--accent) 50%, transparent); outline-offset: 1px; }
  button { padding: 9px 16px; border: 0; border-radius: 8px; background: var(--accent); color: #fff; font: 600 14px inherit; cursor: pointer; }
  .err { width: 100%; color: var(--bad); font-size: 13px; }
  button.run { padding: 4px 12px; border: 1px solid var(--border); border-radius: 8px; background: transparent; color: var(--accent); font: 500 13px inherit; cursor: pointer; white-space: nowrap; }
  button.run:hover:not(:disabled) { border-color: var(--accent); }
  button.run:disabled { color: var(--muted); cursor: default; }
  [hidden] { display: none !important; }
</style>
</head>
<body>
<main>
  <header>
    <div>
      <h1>Vorax analytics</h1>
      <p class="sub">Boards shared by the Solver and Vorax Overlay. Players are counted per day: the collector keeps no lasting ID of anyone.</p>
    </div>
    <span class="live" id="updated" hidden></span>
  </header>
  <form id="login" hidden>
    <label for="pw">Dashboard password</label>
    <input id="pw" type="password" autocomplete="current-password" required>
    <button type="submit">Open</button>
    <span class="err" id="err" role="alert"></span>
  </form>
  <div id="out" hidden>
    <div class="kpis" id="tiles"></div>
    <div class="grid">
      <section class="card">
        <h2>Automation health</h2>
        <p class="sub">The repo's loops, from GitHub's public run list. Late: a scheduled loop hasn't run in 2.5 times its interval.</p>
        <div class="scroll" id="health"><p class="sub">Reading GitHub…</p></div>
      </section>
      <section class="card half">
        <h2>Games and players per day</h2>
        <p class="sub">Players: different devices that day.</p>
        <p class="legend"><span><i class="key" style="background:var(--accent)"></i>Games</span><span><i class="key" style="background:var(--accent-2)"></i>Players</span></p>
        <div id="days"></div>
      </section>
      <section class="card half">
        <h2>Average final score per day</h2>
        <p class="sub">Games that finished that day (reached the round-13 Surgical Protocol). The dashed line is 950k: rainbow with the battle bonus.</p>
        <div id="scores"></div>
      </section>
      <section class="card half">
        <h2>Real results</h2>
        <p class="sub">How finished games ended, and whether the advice's predictions hold up.</p>
        <div id="real"></div>
      </section>
      <section class="card half">
        <h2>Odds and advice over time</h2>
        <p class="sub">Each change, measured on the same 240 simulated games.</p>
        <div class="scroll" id="history"></div>
      </section>
      <section class="card">
        <h2>Card effects in real games</h2>
        <p class="sub">Real moves replayed in the simulator. One it can't reproduce points at a card effect it gets wrong, or a misread board.</p>
        <div class="scroll" id="rules"></div>
      </section>
      <section class="card">
        <h2>Latest games</h2>
        <p class="sub">Score: the final score when the game finished, else the score on its last shared board.</p>
        <div class="scroll" id="recent"></div>
      </section>
      <section class="card half">
        <h2>How far games got</h2>
        <p class="sub">Games by the highest round they reached.</p>
        <div id="rounds"></div>
      </section>
      <section class="card">
        <h2>Problems by setup</h2>
        <p class="sub">Boards read with something unsure, and with a tank’s numbers unsure, by the player’s screen shape, window (the app tells windowed from borderless), HDR and browser. A setup far above the others is where to look.</p>
        <div class="scroll" id="problems"></div>
      </section>
      <section class="card half">
        <h2>Games per site version</h2>
        <p class="sub">The website's build each game was played on.</p>
        <div class="scroll" id="versions"></div>
      </section>
    </div>
  </div>
</main>
<script>
const KEY = 'vorax.dashboard'
const HISTORY = 'https://raw.githubusercontent.com/tidewarden/tli-vorax-simulator/main/data/live/history.jsonl'
const RULES = 'https://raw.githubusercontent.com/tidewarden/tli-vorax-simulator/main/data/live/rules-check.json'
const $ = id => document.getElementById(id)
const esc = v => String(v).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
const pct = x => Math.round(100 * x) + '%'
const k = v => Math.round(v / 1000) + 'k'
const num = v => Math.round(v).toLocaleString('en-US')
// cells are escaped unless given as { html }
const cell = c => (c && typeof c === 'object' && 'html' in c ? c.html : esc(c))
const table = (head, rows, right = []) => '<table><thead><tr>' + head.map((h, i) => '<th' + (right.includes(i) ? ' class="n"' : '') + '>' + esc(h) + '</th>').join('') + '</tr></thead><tbody>' + rows.map(r => '<tr>' + r.map((c, i) => '<td' + (right.includes(i) ? ' class="n"' : '') + '>' + cell(c) + '</td>').join('') + '</tr>').join('') + '</tbody></table>'
const pill = (kind, text) => '<span class="pill ' + kind + '">' + esc(text) + '</span>'

// A chart frame: gridlines at a few round values, labels on the left, days along the bottom.
function frame(w, h, top, fmt) {
  let s = ''
  for (let i = 0; i <= 4; i++) {
    const v = (top * i) / 4, y = h - 24 - (v / top) * (h - 40)
    s += '<line class="grid-line" x1="40" x2="' + w + '" y1="' + y + '" y2="' + y + '"/><text x="0" y="' + (y + 4) + '">' + fmt(v) + '</text>'
  }
  return s
}

function bars(days) {
  if (!days.length) return '<p class="sub">No games yet.</p>'
  const w = 560, h = 200, top = Math.max(4, ...days.map(d => Math.max(d.games, d.players)))
  const slot = (w - 50) / days.length, bw = Math.min(18, slot / 2 - 3)
  const x = i => 48 + i * slot + (slot - 2 * bw - 3) / 2
  const y = v => h - 24 - (v / top) * (h - 40)
  let s = '<svg viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="Games and players per day">' + frame(w, h, top, v => Math.round(v))
  days.forEach((d, i) => {
    s += '<rect class="a" rx="3" x="' + x(i) + '" y="' + y(d.games) + '" width="' + bw + '" height="' + Math.max(0, h - 24 - y(d.games)) + '"><title>' + d.day + ': ' + d.games + ' games</title></rect>'
    s += '<rect class="b" rx="3" x="' + (x(i) + bw + 3) + '" y="' + y(d.players) + '" width="' + bw + '" height="' + Math.max(0, h - 24 - y(d.players)) + '"><title>' + d.day + ': ' + d.players + ' players</title></rect>'
    s += '<text x="' + (x(i) + bw) + '" y="' + (h - 6) + '" text-anchor="middle">' + d.day.slice(5) + '</text>'
  })
  return s + '</svg>'
}

function scoreChart(days) {
  const pts = days.filter(d => d.averageFinal !== null)
  if (!pts.length) return '<p class="sub">No finished games yet. Every game’s final board is shared from 2026-10-19, so this fills in as people play.</p>'
  const w = 560, h = 200, top = Math.max(1200000, ...pts.map(d => d.averageFinal)) * 1.05
  const x = i => 60 + (pts.length === 1 ? (w - 80) / 2 : (i * (w - 80)) / (pts.length - 1))
  const y = v => h - 24 - (v / top) * (h - 40)
  let s = '<svg viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="Average final score per day">' + frame(w, h, top, k)
  s += '<line class="goal" x1="40" x2="' + w + '" y1="' + y(950000) + '" y2="' + y(950000) + '"/><text class="goal-text" x="' + (w - 4) + '" y="' + (y(950000) - 6) + '" text-anchor="end">950k</text>'
  if (pts.length > 1) s += '<polyline class="line" points="' + pts.map((d, i) => x(i) + ',' + y(d.averageFinal)).join(' ') + '"/>'
  pts.forEach((d, i) => {
    s += '<circle class="dot" r="4.5" cx="' + x(i) + '" cy="' + y(d.averageFinal) + '"><title>' + d.day + ': ' + num(d.averageFinal) + ' average over ' + d.finished + ' finished</title></circle>'
    s += '<text x="' + x(i) + '" y="' + (y(d.averageFinal) - 12) + '" text-anchor="middle">' + k(d.averageFinal) + ' · ' + d.finished + '</text>'
    s += '<text x="' + x(i) + '" y="' + (h - 6) + '" text-anchor="middle">' + d.day.slice(5) + '</text>'
  })
  return s + '</svg>'
}

// The repo's automated loops, from GitHub's public list of workflow runs (no token: the repo is public).
// every: how often it should run, in hours (null: only when something triggers it); late after 2.5x that.
const LOOPS = [
  { file: 'live-data.yml', name: 'Odds from live data', every: 1 },
  { file: 'strengths.yml', name: 'Instrument strengths', every: null },
  { file: 'daily-check.yml', name: 'Daily check (simulation)', every: 24 },
  { file: 'issue-fixer.yml', name: 'Issue fixer', every: 1 },
  { file: 'deploy.yml', name: 'Website deploy', every: null },
  { file: 'desktop.yml', name: 'Windows app release', every: null, noRun: true },
]
let password = ''
const ago = t => {
  const m = Math.round((Date.now() - new Date(t)) / 60000)
  return m < 60 ? m + ' min ago' : m < 48 * 60 ? Math.round(m / 60) + ' h ago' : Math.round(m / 1440) + ' days ago'
}
async function health() {
  const rows = await Promise.all(LOOPS.map(async l => {
    const every = { html: '<span class="sub">' + (l.every ? 'every ' + (l.every === 1 ? 'hour' : 'day') : 'when needed') + '</span>' }
    try {
      const r = await fetch('https://api.github.com/repos/tidewarden/tli-vorax-simulator/actions/workflows/' + l.file + '/runs?per_page=20', { headers: { accept: 'application/vnd.github+json' } })
      if (!r.ok) throw new Error(r.status)
      const runs = (await r.json()).workflow_runs
      const last = runs[0], good = runs.find(x => x.conclusion === 'success')
      let state = pill('ok', 'Healthy')
      if (!last) state = pill('idle', 'Not run yet')
      else if (last.status !== 'completed') state = pill('warn', 'Running')
      else if (last.conclusion !== 'success') state = pill('bad', 'Failing')
      else if (l.every && Date.now() - new Date(last.created_at) > l.every * 2.5 * 3600000) state = pill('warn', 'Late')
      const lastCell = last ? '<a href="' + esc(last.html_url) + '" target="_blank" rel="noopener">' + ago(last.created_at) + '</a> <span class="sub">· ' + esc(last.status === 'completed' ? last.conclusion : last.status) + '</span>' : '<span class="sub">–</span>'
      return [l.name, { html: state }, { html: lastCell }, good ? ago(good.created_at) : '–', every, runButton(l)]
    } catch (e) {
      return [l.name, { html: pill('idle', 'Unknown') }, { html: '<span class="sub">GitHub didn’t answer (60 looks an hour without signing in)</span>' }, '', every, runButton(l)]
    }
  }))
  $('health').innerHTML = table(['Loop', 'Status', 'Last run', 'Last success', 'Runs', ''], rows)
}
const runButton = l => ({ html: l.noRun ? '<span class="sub">needs a version tag</span>' : '<button type="button" class="run" data-run="' + l.file + '">Run now</button>' })
// Run now: the collector asks GitHub to start the workflow; the table refreshes once GitHub lists it
document.addEventListener('click', async e => {
  const b = e.target.closest && e.target.closest('button[data-run]')
  if (!b) return
  b.disabled = true
  b.textContent = 'Starting…'
  try {
    const r = await fetch('/v1/run/' + b.dataset.run, { method: 'POST', headers: { authorization: 'Bearer ' + password } })
    const body = await r.json().catch(() => ({}))
    if (!r.ok) throw new Error(body.error || ('The collector answered ' + r.status))
    b.textContent = 'Started'
    setTimeout(() => void health(), 6000)
  } catch (err) {
    b.textContent = 'Failed'
    b.title = err.message
    const note = document.createElement('div')
    note.className = 'err'
    note.textContent = err.message
    b.after(note)
  }
})

async function load(pw) {
  password = pw
  const r = await fetch('/v1/stats', { headers: { authorization: 'Bearer ' + pw } })
  if (r.status === 401) throw new Error('Wrong password.')
  if (!r.ok) throw new Error('The collector answered ' + r.status + '.')
  const s = await r.json()
  const appGames = s.days.reduce((n, d) => n + d.app, 0)
  const f = s.finished
  $('tiles').innerHTML = [
    ['Games shared', num(s.totals.games), s.totals.boards + ' boards read'],
    ['Players today', num(s.totals.playersToday), 'different devices'],
    ['Players ever', s.totals.countedSince ? num(s.totals.playersEver) : '–', (s.totals.countedSince ? 'since ' + s.totals.countedSince + ' · ' : '') + num(s.totals.playerDays) + ' player-days in all'],
    ['Average final score', f.games ? k(f.average) : '–', f.games + ' finished game' + (f.games === 1 ? '' : 's')],
    ['Reached 950k', f.games ? pct(f.reached / f.games) : '–', 'of finished games'],
    ['In Vorax Overlay', pct(s.totals.games ? appGames / s.totals.games : 0), 'of games'],
    ['Corrected by hand', pct(s.corrected), 'of boards'],
    ['Read unsure', pct(s.unsure), 'of boards'],
  ].map(([label, value, note]) => '<div class="kpi"><span>' + esc(label) + '</span><b>' + esc(value) + '</b><small>' + esc(note) + '</small></div>').join('')
  $('updated').textContent = 'Updated ' + s.generated.replace('T', ' ').slice(0, 16) + ' UTC'
  $('updated').hidden = false
  void health()
  $('days').innerHTML = bars(s.days)
  $('scores').innerHTML = scoreChart(s.days)
  const median = f.finals.length ? f.finals.slice().sort((a, b) => a - b)[f.finals.length >> 1] : 0
  $('real').innerHTML = (f.games
    ? '<div class="stat"><div><span>Finished games</span><b>' + f.games + '</b></div><div><span>Reached 950k</span><b>' + f.reached + ' (' + pct(f.reached / f.games) + ')</b></div><div><span>Average</span><b>' + k(f.average) + '</b></div><div><span>Median</span><b>' + k(median) + '</b></div></div><p class="sub">The simulator expects about half of games to reach 950k.</p>'
    : '<p class="sub">No finished games shared yet.</p>')
    + (s.calibration.length
      ? '<div class="scroll">' + table(['Advice predicted', 'On average', 'Boards', 'Those games reached 950k'], s.calibration.map(c => [c.band, pct(c.predicted), c.games, pct(c.reached / c.games)]), [1, 2, 3]) + '</div>'
      : '<p class="sub">Predicted against real appears once boards carry the advice shown (from 2026-10-19) and their games finish.</p>')
  const rounds = Object.entries(s.rounds).sort((a, b) => a[0] - b[0])
  const most = Math.max(1, ...rounds.map(x => x[1]))
  $('rounds').innerHTML = table(['Round', 'Games', ''], rounds.map(([r, n]) => [r, n, { html: '<div class="hbar"><i style="width:' + Math.round((100 * n) / most) + '%"></i></div>' }]), [1])
  const score = g => (g.score ? num(g.score) : '–') + (g.finished ? '' : g.score ? ' · round ' + g.round : '')
  $('recent').innerHTML = table(['Started (UTC)', 'Where', 'Boards', 'Round', 'Score', '', 'Instruments'], s.recent.map(g => [
    g.start.replace('T', ' ').slice(0, 16), g.app ? 'App' : 'Website', g.boards, g.round, score(g),
    { html: g.finished ? (g.score >= 950000 ? pill('ok', 'Rainbow') : pill('idle', 'Finished')) : '' },
    { html: '<span class="sub">' + esc(g.instruments.join(', ')) + '</span>' },
  ]), [2, 3, 4])
  $('problems').innerHTML = s.problems && s.problems.length
    ? table(['Setup', '', 'Boards', 'Something unsure', 'Tank numbers unsure'], s.problems.map(p => [p.by, p.group, num(p.boards), pct(p.unsure), pct(p.numbers)]), [2, 3, 4])
    : '<p class="sub">No boards with their setup yet: they come from the Solver since this section was added.</p>'
  $('versions').innerHTML = table(['Version', 'Games'], Object.entries(s.versions).sort((a, b) => b[1] - a[1]), [1])
  try {
    const rc = await (await fetch(RULES, { cache: 'no-store' })).json()
    $('rules').innerHTML = '<div class="stat"><div><span>Moves replayed</span><b>' + rc.checked + '</b></div><div><span>Reproduced exactly</span><b>' + rc.reproduced + ' (' + pct(rc.reproduced / Math.max(1, rc.checked)) + ')</b></div><div><span>Not reproduced</span><b>' + rc.missed.length + '</b></div></div>'
      + (rc.missed.length ? table(['Round', 'Cards on offer', 'Instruments', 'Closest the simulator got', 'Tanks off'], rc.missed.map(m => [m.round, m.hand.join(', '), { html: '<span class="sub">' + esc(m.instruments.join(', ')) + '</span>' }, m.best, m.gap]), [0, 4]) : '')
  } catch (e) {
    $('rules').innerHTML = '<p class="sub">The card-effect check couldn’t be read from the repo.</p>'
  }
  try {
    const t = await (await fetch(HISTORY, { cache: 'no-store' })).text()
    const h = t.split('\\n').filter(Boolean).map(l => JSON.parse(l)).reverse()
    $('history').innerHTML = h.length ? table(['Date', 'Change', 'Reached 950k', 'Average', 'Median'], h.map(e => [e.date, e.change, e.reached === undefined ? '–' : pct(e.reached), e.average ? k(e.average) : '–', e.median ? k(e.median) : '–']), [2, 3, 4]) : '<p class="sub">No history yet.</p>'
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
