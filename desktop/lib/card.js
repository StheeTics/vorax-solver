// The card from the Solver page, cleaned before it crosses into the overlay: only plain text, cut to length.
// Every field the page's card carries (src/solver/desktop/bridge.ts OverlayCard) has to be let through here.
const text = (v, max) => (typeof v === 'string' ? v.slice(0, max) : '');

function cleanCard(card) {
  if (!card || typeof card !== 'object') return null;
  return {
    move: text(card.move, 200),
    detail: text(card.detail, 300),
    others: Array.isArray(card.others) ? card.others.slice(0, 3).map((o) => text(o, 200)) : [],
    round: Number.isFinite(card.round) ? card.round : null,
    updating: !!card.updating,
    // the Solver window's question or what stops it following the game: the window is hidden, so the card says it
    ask: typeof card.ask === 'string' && card.ask ? text(card.ask, 300) : null,
    // all of it, most pressing first (pages before it sent only `ask`)
    asks: Array.isArray(card.asks) ? card.asks.filter((a) => typeof a === 'string' && a).slice(0, 4).map((a) => text(a, 300)) : [],
    // the open instrument question's offer, answered with a click on the card
    choices: Array.isArray(card.choices) ? card.choices.filter((a) => typeof a === 'string' && a).slice(0, 3).map((a) => text(a, 80)) : [],
    // the Solver is paused (the move says what to fix): the card offers to show the advice anyway
    paused: !!card.paused,
    // advice shown anyway, though it can't be trusted
    warning: text(card.warning, 200),
  };
}

module.exports = { cleanCard };
