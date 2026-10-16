import type { Card } from '@/engine/types'
import { INSTRUMENTS } from '@/data/instruments'
import { POTIONS } from '@/data/potions'

const CARDS = new Map<string, Card>([
  ...POTIONS.map(p => [p.name, { kind: 'potion', id: p.id }] as const),
  ...INSTRUMENTS.map(i => [i.name, { kind: 'instrument', id: i.id }] as const),
])

// Longest first, so "Potent Xenopurge Powder" wins over "Xenopurge Powder". Names glued to more
// letters ("Xeno-Hormones", a generic plural) are left alone.
const NAME_RE = new RegExp(
  `(?<![\\w-])(${[...CARDS.keys()]
    .sort((a, b) => b.length - a.length)
    .map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|')})(?![\\w-])`,
  'g',
)

/** The card a `.card-ref` element names. */
export function cardOf(el: Element): Card | undefined {
  return CARDS.get(el.getAttribute('data-card') ?? '')
}

/** Wraps every card name in `root`'s text in a focusable `.card-ref` span. */
export function linkCardNames(root: HTMLElement): void {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: n => (n.parentElement?.closest('a, code, .card-ref') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
  })
  const nodes: Text[] = []
  while (walker.nextNode()) nodes.push(walker.currentNode as Text)

  for (const node of nodes) {
    const text = node.data
    const parts: (string | HTMLElement)[] = []
    let last = 0
    for (const m of text.matchAll(NAME_RE)) {
      if (m.index > last) parts.push(text.slice(last, m.index))
      const span = document.createElement('span')
      span.className = 'card-ref'
      span.tabIndex = 0
      span.dataset.card = m[0]
      span.textContent = m[0]
      parts.push(span)
      last = m.index + m[0].length
    }
    if (last === 0) continue
    if (last < text.length) parts.push(text.slice(last))
    node.replaceWith(...parts)
  }
}
