import { render } from '@testing-library/react'
import { CardArt } from '@/ui/svg/CardArt'
import { POTION_ART, INSTRUMENT_ART } from '@/ui/svg/cardArtSpecs'
import { POTIONS } from '@/data/potions'
import { INSTRUMENTS } from '@/data/instruments'
import { Card } from '@/ui/game/Card'
import { ARCHETYPE_PLURALS } from '@/data/archetypes'

it('every potion has its own drawing (no two alike)', () => {
  for (const p of POTIONS) expect(POTION_ART[p.id], `potion ${p.id} ${p.name}`).toBeDefined()
  const looks = POTIONS.map(p => JSON.stringify(POTION_ART[p.id]))
  expect(new Set(looks).size).toBe(POTIONS.length)
})

it('every instrument has its own drawing', () => {
  for (const d of INSTRUMENTS) expect(INSTRUMENT_ART[d.id], `instrument ${d.id} ${d.name}`).toBeDefined()
  expect(new Set(Object.values(INSTRUMENT_ART)).size).toBe(INSTRUMENTS.length)
})

it('renders distinct SVG markup per card', () => {
  const markup = (card: Parameters<typeof CardArt>[0]['card']) => render(<CardArt card={card} />).container.innerHTML.replace(/:r\w+:/g, '')
  const potions = POTIONS.map(p => markup({ kind: 'potion', id: p.id }))
  expect(new Set(potions).size).toBe(POTIONS.length)
  const tools = INSTRUMENTS.map(d => markup({ kind: 'instrument', id: d.id }))
  expect(new Set(tools).size).toBe(INSTRUMENTS.length)
})

it('cards use the drawing (no bitmap images)', () => {
  const { container } = render(<Card card={{ kind: 'potion', id: 12 }} />)
  expect(container.querySelector('svg[data-art="potion-12"]')).not.toBeNull()
  expect(container.querySelector('img')).toBeNull()
})

it('Supreme potions say ULT Potion; Agito plural is Agitoes, as in-game', () => {
  const { getByText } = render(<Card card={{ kind: 'potion', id: 38 }} />)
  expect(getByText('ULT Potion')).toBeTruthy()
  expect(ARCHETYPE_PLURALS.agito).toBe('Agitoes')
})

it('powders: Vivigenic red, Slender-Limb (normal) grey, Xenopurge purple', () => {
  expect(POTION_ART[16].color).toBe('#d8443c')
  expect(POTION_ART[23].color).toBe(POTION_ART[27].color)
  expect(POTION_ART[23].color).toBe('#a9a49c')
  expect(POTION_ART[17].color).toMatch(/^#[0-9a-f]{6}$/)
})
