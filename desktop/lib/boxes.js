// The green boxes from the Solver page (src/solver/advice/highlight.ts), cleaned before they reach the window
// that draws them over the game: numbers only, each box inside the picture (0 to 1), a card and six tanks at most.
const MAX = 7;
const inside = (b) => b && typeof b === 'object' && [b.x, b.y, b.w, b.h].every(Number.isFinite)
  && b.x >= 0 && b.y >= 0 && b.w > 0 && b.h > 0 && b.x + b.w <= 1 + 1e-9 && b.y + b.h <= 1 + 1e-9;

function cleanBoxes(boxes) {
  if (!Array.isArray(boxes)) return [];
  return boxes.filter(inside).slice(0, MAX).map((b) => ({ x: b.x, y: b.y, w: b.w, h: b.h }));
}

module.exports = { cleanBoxes };
