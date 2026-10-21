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
  /** the interface scale the frame was read at */
  ui?: number
  onPicked(name: string): void
  onSkip(): void
  /** false on the demo page: the answer is only shown, not learned or shared */
  learn?: boolean
}

/** Learns the new icon as `name`: this browser remembers it, and (with sharing on) it's shared for everyone.
 *  The same whether the player answers here or on the app's card. */
export async function teachPick(frame: ImageData, count: number, question: PickQuestion, name: string, ui?: number): Promise<void> {
  const rect = layout(frame, ui).instrumentIcon[count - 1 - question.slot]
  if (!rect) return
  const pattern = iconPattern(frame, rect)
  await addLocalRef(`icon:${name}`, pattern as unknown as ArtFeature)
  void shareIcon(name, pattern)
}

/** A pick the Solver can't place (an offer with an instrument whose icon it hasn't seen): the player says
 *  which it was, this browser remembers that icon, and (with sharing on) it's shared for the built-in data. */
export function WhichPick({ question, count, frame, ui, onPicked, onSkip, learn = true }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null)
  // the panel fills from the right, newest on the right
  const rect = layout(frame, ui).instrumentIcon[count - 1 - question.slot]
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
    if (learn) await teachPick(frame, count, question, name, ui)
    onPicked(name)
  }

  return (
    <div className={`${styles.what} ${own.ask}`} role="group" aria-label="Which instrument did you pick?">
      <canvas ref={canvas} className={styles.card} aria-label="The new instrument icon" />
      <div className={styles.pick}>
        <span className={own.question}>Which instrument did you pick?</span>
        <span className={own.why}>The Solver hasn't seen this icon yet. Your answer teaches it.</span>
        <div className={own.choices}>
          {question.offer.map(n => (
            <button key={n} type="button" className={`ghost-button ${own.choice}`} onClick={() => void choose(n)}>{n}</button>
          ))}
          <button type="button" className={`ghost-button ${own.choice} ${own.skip}`} onClick={onSkip}>Skip</button>
        </div>
      </div>
    </div>
  )
}
