// The green boxes around the advised move, as fractions of the game's picture, which this window covers.
window.VoraxHighlight.on((boxes) => {
  document.body.replaceChildren(...boxes.map((b) => {
    const el = document.createElement('div');
    el.className = 'box';
    Object.assign(el.style, { left: `${b.x * 100}%`, top: `${b.y * 100}%`, width: `${b.w * 100}%`, height: `${b.h * 100}%` });
    return el;
  }));
});
