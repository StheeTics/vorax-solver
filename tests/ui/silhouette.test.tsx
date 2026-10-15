import { render } from '@testing-library/react'
import { Silhouette } from '@/ui/svg/Silhouette'
import { ARCHETYPES } from '@/data/archetypes'

const markup = (a: (typeof ARCHETYPES)[number]) => render(<Silhouette archetype={a} rarity="rare" />).container.innerHTML

it('each archetype has its own flat, coloured monster drawing', () => {
  const all = ARCHETYPES.map(markup)
  expect(new Set(all).size).toBe(4)
  for (const html of all) {
    expect(html).not.toContain('url(#body-') // no dark silhouette gradient any more
  }
})

it('uses the in-game looks: purple bug, yellow mech knight, red floating armour, blue werewolf', () => {
  expect(markup('pest')).toContain('#9466d8')
  expect(markup('boneSentry')).toContain('#f0c23a')
  expect(markup('agito')).toContain('#9c1f2b')
  expect(markup('agito')).toContain('data-part="spirit-trail"') // floating armour: no legs, a ghostly trail
  expect(markup('aemberon')).toContain('#3f6fd0')
})

it('keeps the rarity glow and size', () => {
  const small = render(<Silhouette archetype="pest" rarity="normal" size={100} />).container.querySelector('svg')!
  const big = render(<Silhouette archetype="pest" rarity="boss" size={100} />).container.querySelector('svg')!
  expect(Number(big.getAttribute('width'))).toBeGreaterThan(Number(small.getAttribute('width')))
  expect(small.getAttribute('style')).toContain('currentColor')
})
