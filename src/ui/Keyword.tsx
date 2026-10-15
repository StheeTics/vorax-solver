import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { MECHANICS } from './mechanics'
import { useStageOverlay } from './Stage'
import { placeTooltip, type Box } from './layout'

/** Position of an element in stage coordinates (layout offsets, unaffected by the stage's scale/rotation). */
function stageBox(el: HTMLElement, stage: HTMLElement | null): Box {
  let left = 0
  let top = 0
  let node: HTMLElement | null = el
  while (node && node !== stage) {
    left += node.offsetLeft
    top += node.offsetTop
    node = node.offsetParent as HTMLElement | null
  }
  return { left, top, width: el.offsetWidth, height: el.offsetHeight }
}

/** Red, underlined card keyword; click to toggle a tooltip explaining the mechanic. */
export function Keyword({ mechanic, word }: { mechanic: string; word: string }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null)
  const ref = useRef<HTMLButtonElement>(null)
  const tip = useRef<HTMLDivElement>(null)
  const overlay = useStageOverlay()
  const id = useId()
  const info = MECHANICS[mechanic]

  useLayoutEffect(() => {
    if (!open || !ref.current || !tip.current) return
    const anchor = stageBox(ref.current, overlay?.parentElement ?? null)
    setPos(placeTooltip(anchor, { width: tip.current.offsetWidth, height: tip.current.offsetHeight }))
  }, [open, overlay])

  useEffect(() => {
    if (!open) return
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('keydown', close)
    document.addEventListener('pointerdown', close)
    window.addEventListener('resize', close)
    return () => {
      document.removeEventListener('keydown', close)
      document.removeEventListener('pointerdown', close)
      window.removeEventListener('resize', close)
    }
  }, [open])

  return (
    <>
      <button
        ref={ref}
        type="button"
        className="kw"
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        onClick={e => {
          e.stopPropagation()
          setPos(null)
          setOpen(o => !o)
        }}
        onKeyDown={e => e.stopPropagation()}
      >
        {word}
      </button>
      {open && info &&
        createPortal(
          <div
            ref={tip}
            id={id}
            role="tooltip"
            className="kw-tooltip"
            style={pos ? { left: pos.left, top: pos.top } : { left: 0, top: 0, visibility: 'hidden' }}
          >
            <strong>{info.title}</strong>
            <span>{info.text}</span>
          </div>,
          overlay ?? document.body,
        )}
    </>
  )
}
