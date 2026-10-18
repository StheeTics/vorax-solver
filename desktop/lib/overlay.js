// The card over the game: shows what the Solver page advises (only text, set with textContent).
const $ = (id) => document.getElementById(id);
const api = window.VoraxOverlay;
let folded = false;
let card = null;
let update = { site: false, app: false };

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
  $('update').hidden = !(update.app || update.site);
  $('update-text').textContent = update.app ? 'A new version of Vorax Overlay is ready.' : 'The Solver has been updated.';
  $('update-button').textContent = update.app ? 'Restart' : 'Reload';
  requestAnimationFrame(() => api.height($('card').getBoundingClientRect().height + 2));
}

api.on('card', (c) => ((card = c), render()));
api.on('update', (u) => ((update = u || update), render()));
api.on('folded', (f) => ((folded = !!f), render()));
$('fold').addEventListener('click', () => {
  folded = !folded;
  api.fold(folded);
  
// The card is dragged by its bar. Not with -webkit-app-region: on Windows that swallows the clicks of the
// bar's button in this kind of window (frameless, transparent, never focused).
const head = document.querySelector('.head');
head.addEventListener('pointerdown', (e) => {
  if (e.button !== 0 || e.target.closest('button')) return;
  head.setPointerCapture(e.pointerId);
  api.dragStart(e.screenX, e.screenY);
});
head.addEventListener('pointermove', (e) => head.hasPointerCapture(e.pointerId) && api.drag(e.screenX, e.screenY));
head.addEventListener('pointerup', (e) => head.hasPointerCapture(e.pointerId) && (head.releasePointerCapture(e.pointerId), api.dragEnd()));

render();
});
$('solver').addEventListener('click', () => api.openSolver());
$('snap').addEventListener('click', () => api.snap());
$('update-button').addEventListener('click', () => (update.app ? api.restart() : api.reload()));

// The card is dragged by its bar. Not with -webkit-app-region: on Windows that swallows the clicks of the
// bar's button in this kind of window (frameless, transparent, never focused).
const head = document.querySelector('.head');
head.addEventListener('pointerdown', (e) => {
  if (e.button !== 0 || e.target.closest('button')) return;
  head.setPointerCapture(e.pointerId);
  api.dragStart(e.screenX, e.screenY);
});
head.addEventListener('pointermove', (e) => head.hasPointerCapture(e.pointerId) && api.drag(e.screenX, e.screenY));
head.addEventListener('pointerup', (e) => head.hasPointerCapture(e.pointerId) && (head.releasePointerCapture(e.pointerId), api.dragEnd()));

render();
