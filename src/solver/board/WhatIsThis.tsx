import { useEffect, useRef } from 'react'
import { names } from '@/strategy/advisor'
import type { Problem } from '../types'
import type { HandPhase } from '../scan/data'
import { layout } from '../scan/layout'
import { addLocalRef } from '../scan/localRefs'
import { crop } from '../scan/pixels'
import { cardArt, handAt } from '../scan/cards'
import styles from './WhatIsThis.module.css'

const NAMES = names()

interface Props {
  problem: Extract<Problem, { kind: 'unknownArt' }>
  phase: HandPhase
  frame: ImageData
  onNamed(): void
  onSkip(): void
}

/** A card the reader doesn't know: the player names it once, and this browser remembers its art. */
export function WhatIsThis({ problem, phase, frame, onNamed, onSkip }: Props) {
  const slot = Number(/\d+/.exec(problem.field)?.[0] ?? 0)
  const canvas = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = canvas.current
    const ctx = c?.getContext('2d')
    if (!c || !ctx) return
    const part = crop(frame, problem.crop)
    c.width = part.width
    c.height = part.height
    ctx.putImageData(new ImageData(part.data, part.width, part.height), 0, 0)
  }, [frame, problem])

  const choose = async (name: string) => {
    if (!name) return
    const l = layout(frame)
    await addLocalRef(`${phase}:${name}`, cardArt(frame, handAt(l, problem.hand ?? 3)[slot], l.k))
    onNamed()
  }
  const options = phase === 'instrument' ? NAMES.instruments : NAMES.potions

  return (
    <div className={styles.what}>
      <canvas ref={canvas} className={styles.card} aria-label={`Card ${slot + 1} as seen`} />
      <label className={styles.pick}>
        <span>What is card {slot + 1}?</span>
        <select aria-label={`Card ${slot + 1} is`} defaultValue="" onChange={e => void choose(e.target.value)}>
          <option value="">Pick its name…</option>
          {options.map(n => <option key={n} value={n}>{n}</option>)}
        </select>
      </label>
      <button type="button" className="ghost-button" onClick={onSkip}>Skip</button>
    </div>
  )
}
