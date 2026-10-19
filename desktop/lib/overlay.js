// The card over the game: shows what the Solver page advises (only text, set with textContent).
const $ = (id) => document.getElementById(id);
const api = window.VoraxOverlay;
let folded = false;
let card = null;
let update = { site: false, app: '', version: '', progress: 0, waiting: false };

function render() {
  const c = card || { move: 'Waiting for the cards…', detail: '', others: [], round: null, updating: false };
  $('card').classList.toggle('folded', folded);
  $('card').classList.toggle('updating', !!c.updating);
  $('fold').setAttribute('aria-pressed', String(folded));
  $('fold').textContent = folded ? '+' : '–';
  $('fold').title = folded ? 'Unfold it' : 'Fold it to a thin bar';
  $('fold').setAttribute('aria-label', folded ? 'Unfold' : 'Fold');
  // folded, the bar itself carries the move
  $('status').textContent = folded ? (c.updating ? `${c.move} (updating…)` : c.move) : [c.round ? `Round ${c.round}` : '', c.updating ? 'Working out the new board…' : ''].filter(Boolean).join(' · ') || 'Following the game';
  $('eyebrow').textContent = c.updating ? 'Last board' : 'Next move';
  $('move').textContent = c.move;
  $('detail').textContent = c.detail || '';
  $('detail').hidden = !c.detail;
  const others = $('others');
  others.replaceChildren(...(c.others || []).map((o) => Object.assign(document.createElement('li'), { textContent: o })));
  others.hidden = !(c.others && c.others.length);
  // the Solver window's question: it's hidden, so the card asks, and its button opens the window
  // every message, one per line (a page from before sends only `ask`)
  const asks = c.asks && c.asks.length ? c.asks : c.ask ? [c.ask] : [];
  $('ask').hidden = !asks.length;
  $('ask-text').replaceChildren(...asks.map((a) => Object.assign(document.createElement('span'), { className: 'ask-line', textContent: a })));
  // the instrument question's offer: one click answers it
  const choices = c.choices || [];
  $('choices').hidden = !choices.length;
  $('choices').replaceChildren(...choices.map((n) => {
    const b = Object.assign(document.createElement('button'), { type: 'button', textContent: n });
    b.addEventListener('click', () => api.choose(n));
    return b;
  }));
  // the app's own update first (downloading, or ready to install), then the site's
  const app = update.app === 'ready' || update.app === 'downloading';
  $('update').hidden = !(app || update.site);
  $('update-text').textContent = !app ? 'The Solver has been updated.'
    : update.app === 'ready' ? `Vorax Overlay ${update.version} is ready.`
    : update.waiting ? `Downloading ${update.version}: ${update.progress}%. It installs when done.`
    : `Vorax Overlay ${update.version} is out: downloading (${update.progress}%).`;
  $('update-button').textContent = app ? 'Update' : 'Reload';
  $('update-button').hidden = app && update.app === 'downloading' && update.waiting;
  requestAnimationFrame(() => api.height($('card').getBoundingClientRect().height + 2));
}

api.on('card', (c) => ((card = c), render()));
api.on('update', (u) => ((update = u || update), render()));
api.on('folded', (f) => ((folded = !!f), render()));
$('fold').addEventListener('click', () => {
  folded = !folded;
  api.fold(folded);
  
render();
});
$('solver').addEventListener('click', () => api.openSolver());
$('ask-button').addEventListener('click', () => api.answer());
$('snap').addEventListener('click', () => api.snap());
$('update-button').addEventListener('click', () => (update.app === 'ready' || update.app === 'downloading' ? api.restart() : api.reload()));


render();
