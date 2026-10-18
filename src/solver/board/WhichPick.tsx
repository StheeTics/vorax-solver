import { useEffect, useRef } from 'react'
import type { ArtFeature } from '../scan/pixels'
import type { PickQuestion } from '../track'
import { layout } from '../scan/layout'
import { addLocalRef } from '../scan/localRefs'
import { crop } from '../scan/pixels'
import { iconPattern } from '../scan/instruments'
import { shareIcon } from '../share/icon'
import styles from './Ask.module.css'
import own from './WhichPick.module.css'

interface Props {
  question: PickQuestion
  /** how many instruments the panel shows (the new one is the right-most) */
  count: number
  frame: ImageData
  onPicked(name: string): void
  onSkip(): void
}

/** A pick the Solver can't place (an offer with an instrument whose icon it hasn't seen): the player says
 *  which it was, this browser remembers that icon, and (with sharing on) it's shared for the built-in data. */
export function WhichPick({ question, count, frame, onPicked, onSkip }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null)
  // the panel fills from the right, newest on the right
  const rect = layout(frame).instrumentIcon[count - 1 - question.slot]
  useEffect(() => {
    const c = canvas.current
    const ctx = c?.getContext('2d')
    if (!c || !ctx || !rect) return
    const part = crop(frame, rect)
    c.width = part.width
    c.height = part.height
    ctx.putImageData(new ImageData(part.data, part.width, part.height), 0, 0)
  }, [frame, rect])

  const choose = async (name: string) => {
    if (rect) {
      const pattern = iconPattern(frame, rect)
      await addLocalRef(`icon:${name}`, pattern as unknown as ArtFeature)
      void shareIcon(name, pattern)
    }
    onPicked(name)
  }

  return (
    <div className={`${styles.what} ${own.ask}`} role="group" aria-label="Which instrument did you pick?">
      <canvas ref={canvas} className={styles.card} aria-label="The new instrument icon" />
      <div className={styles.pick}>
        <span className={own.question}>Which instrument did you pick?</span>
        <span className={own.why}>The Solver hasn't seen this icon yet. Your answer teaches it.</span>
        {question.offer.map(n => (
          <button key={n} type="button" onClick={() => void choose(n)}>{n}</button>
        ))}
      </div>
      <button type="button" className="ghost-button" onClick={onSkip}>Skip</button>
    </div>
  )
}
