import { useLayoutEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import type { Card as CardRef } from '@/engine/types'
import { Card } from '@/ui/game/Card'
import { cardOf } from './cardLinks'

const GAP = 8

/** Viewport position for the preview: beside the name if there's room, otherwise below or above it. */
export function placePreview(
  anchor: { left: number; top: number; right: number; bottom: number },
  size: { width: number; height: number },
  view: { width: number; height: number },
): { left: number; top: number } {
  const clampTop = (t: number) => Math.min(view.height - size.height - GAP, Math.max(GAP, t))
  const clampLeft = (l: number) => Math.min(view.width - size.width - GAP, Math.max(GAP, l))
  if (anchor.right + GAP + size.width + GAP <= view.width) return { left: anchor.right + GAP, top: clampTop(anchor.top - 40) }
  if (anchor.left - GAP - size.width >= GAP) return { left: anchor.left - GAP - size.width, top: clampTop(anchor.top - 40) }
  const left = clampLeft((anchor.left + anchor.right) / 2 - size.width / 2)
  const below = anchor.bottom + GAP
  return { left, top: below + size.height + GAP <= view.height ? below : Math.max(GAP, anchor.top - GAP - size.height) }
}

function Preview({ card, anchor }: { card: CardRef; anchor: DOMRect }) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null)
  useLayoutEffect(() => {
    const el = ref.current!
    setPos(placePreview(anchor, { width: el.offsetWidth, height: el.offsetHeight }, { width: window.innerWidth, height: window.innerHeight }))
  }, [anchor])
  return (
    <div ref={ref} className="card-preview" data-testid="card-preview" style={pos ?? { visibility: 'hidden' }}>
      <Card card={card} compact />
    </div>
  )
}

/** Shows the in-game card when a `.card-ref` inside `root` is hovered, focused or tapped. */
export function attachCardPreviews(root: HTMLElement): void {
  const host = document.createElement('div')
  document.body.append(host)
  const preview = createRoot(host)
  let current: Element | null = null

  const show = (el: Element) => {
    const card = cardOf(el)
    if (!card || el === current) return
    current = el
    const anchor = el.getBoundingClientRect()
    preview.render(<Preview key={`${anchor.left},${anchor.top}`} card={card} anchor={anchor} />)
  }
  const hide = () => {
    if (!current) return
    current = null
    preview.render(null)
  }
  const refAt = (e: Event) => (e.target as Element | null)?.closest?.('.card-ref') ?? null

  root.addEventListener('mouseover', e => {
    const el = refAt(e)
    if (el) show(el)
  })
  root.addEventListener('mouseout', e => {
    const el = refAt(e)
    if (el && !el.contains(e.relatedTarget as Node | null) && document.activeElement !== el) hide()
  })
  root.addEventListener('focusin', e => {
    const el = refAt(e)
    if (el) show(el)
  })
  root.addEventListener('focusout', hide)
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') hide()
  })
  window.addEventListener('scroll', hide, { passive: true })
  window.addEventListener('resize', hide)
}
