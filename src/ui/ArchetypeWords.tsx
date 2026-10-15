import type { ReactNode } from 'react'
import type { Archetype } from '@/engine/types'
import { ARCHETYPE_COLORS } from './svg/icons'

const WORD = /\b(Pests?|Aemberons?|Bone Sentr(?:y|ies)|Agito(?:e?s)?)\b/g

function archetypeOf(word: string): Archetype {
  if (word.startsWith('Pest')) return 'pest'
  if (word.startsWith('Aemberon')) return 'aemberon'
  if (word.startsWith('Bone')) return 'boneSentry'
  return 'agito'
}

/** Plain text with any archetype names colored (used for card names). */
export function ArchetypeWords({ text }: { text: string }) {
  const parts: ReactNode[] = []
  let last = 0
  for (const m of text.matchAll(WORD)) {
    const i = m.index!
    if (i > last) parts.push(text.slice(last, i))
    const a = archetypeOf(m[0])
    parts.push(<span key={i} data-archetype-word={a} style={{ color: ARCHETYPE_COLORS[a] }}>{m[0]}</span>)
    last = i + m[0].length
  }
  if (last < text.length) parts.push(text.slice(last))
  return <>{parts}</>
}
