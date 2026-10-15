export const STAGE_W = 1600
export const STAGE_H = 900

/**
 * How the fixed 1600×900 stage fits the visible area. On touch screens held upright,
 * the stage is turned 90° so the wide game fills the tall screen.
 */
export function stageLayout(viewW: number, viewH: number, touch: boolean): { rotated: boolean; scale: number } {
  const rotated = touch && viewH > viewW
  const [w, h] = rotated ? [viewH, viewW] : [viewW, viewH]
  return { rotated, scale: Math.min(w / STAGE_W, h / STAGE_H) }
}

export interface Box {
  left: number
  top: number
  width: number
  height: number
}

const GAP = 8

/** Tooltip position in stage coordinates: below the anchor if it fits, otherwise above; clamped to the stage. */
export function placeTooltip(anchor: Box, size: { width: number; height: number }): { left: number; top: number; above: boolean } {
  const below = anchor.top + anchor.height + GAP
  const above = below + size.height > STAGE_H - GAP
  const top = above ? Math.max(GAP, anchor.top - GAP - size.height) : below
  const centered = anchor.left + anchor.width / 2 - size.width / 2
  const left = Math.min(STAGE_W - size.width - GAP, Math.max(GAP, centered))
  return { left, top, above }
}
