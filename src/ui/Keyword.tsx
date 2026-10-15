import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { MECHANICS } from './mechanics'

/** Red, underlined card keyword; click to toggle a tooltip explaining the mechanic. */
export function Keyword({ mechanic, word }: { mechanic: string; word: string }) {
  const [anchor, setAnchor] = useState<DOMRect | null>(null)
  const ref = useRef<HTMLButtonElement>(null)
  const id = useId()
  const info = MECHANICS[mechanic]

  useEffect(() => {
    if (!anchor) return
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !ref.current?.contains(e.target as Node)) setAnchor(null)
    }
    document.addEventListener('keydown', close)
    document.addEventListener('pointerdown', close)
    window.addEventListener('resize', close)
    return () => {
      document.removeEventListener('keydown', close)
      document.removeEventListener('pointerdown', close)
      window.removeEventListener('resize', close)
    }
  }, [anchor])

  return (
    <>
      <button
        ref={ref}
        type="button"
        className="kw"
        aria-expanded={!!anchor}
        aria-describedby={anchor ? id : undefined}
        onClick={e => {
          e.stopPropagation()
          setAnchor(a => (a ? null : e.currentTarget.getBoundingClientRect()))
        }}
        onKeyDown={e => e.stopPropagation()}
      >
        {word}
      </button>
      {anchor && info &&
        createPortal(
          <div id={id} role="tooltip" className="kw-tooltip" style={{ left: anchor.left + anchor.width / 2, top: anchor.bottom + 8 }}>
            <strong>{info.title}</strong>
            <span>{info.text}</span>
          </div>,
          document.body,
        )}
    </>
  )
}
