import { Fragment, type ReactNode } from 'react'
import { ARCHETYPE_NAMES, ARCHETYPE_PLURALS } from '@/data/archetypes'
import type { Archetype } from '@/engine/types'
import { ARCHETYPE_COLORS, ArchetypeIcon, HeartIcon, QuantityIcon } from './svg/icons'
import { Keyword } from './Keyword'

const KEYWORDS = new Set(['mutate', 'remove', 'add', 'awaken', 'fuse', 'devour'])
const ARCHETYPE_TOKENS: Record<string, Archetype> = {
  Pest: 'pest',
  Aemberon: 'aemberon',
  BoneSentry: 'boneSentry',
  Agito: 'agito',
}

/**
 * Renders card markup: {mutate} etc. → red keyword, {act}/{qty} → stat icon,
 * {Pest}/{Aemberon}/{BoneSentry}/{Agito} (+ optional trailing "s" for plural) → icon + name.
 * A keyword's trailing letters ({mutate}s, {add}ed) are part of the highlighted word.
 */
export function CardText({ text, className }: { text: string; className?: string }) {
  const parts: ReactNode[] = []
  const re = /\{(\w+)\}([a-z]*)/g
  let last = 0
  let k = 0
  for (let m = re.exec(text); m; m = re.exec(text)) {
    if (m.index > last) parts.push(text.slice(last, m.index))
    const [, token, s] = m
    const key = k++
    if (KEYWORDS.has(token)) {
      parts.push(<Keyword key={key} mechanic={token} word={token + s} />)
    } else if (token === 'act') {
      parts.push(<Fragment key={key}><HeartIcon />{s}</Fragment>)
    } else if (token === 'qty') {
      parts.push(<Fragment key={key}><QuantityIcon />{s}</Fragment>)
    } else if (ARCHETYPE_TOKENS[token]) {
      const a = ARCHETYPE_TOKENS[token]
      parts.push(
        <span key={key} className="archetype-ref" style={{ whiteSpace: 'nowrap' }}>
          <ArchetypeIcon archetype={a} size={18} />
          <span data-archetype-word={a} style={{ color: ARCHETYPE_COLORS[a], fontWeight: 600 }}>
            {s.startsWith('s') ? ARCHETYPE_PLURALS[a] : ARCHETYPE_NAMES[a]}
          </span>
          {s.slice(s.startsWith('s') ? 1 : 0)}
        </span>,
      )
    } else {
      parts.push(m[0])
    }
    last = re.lastIndex
  }
  if (last < text.length) parts.push(text.slice(last))
  return <span className={className}>{parts}</span>
}
