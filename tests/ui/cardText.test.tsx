import { render } from '@testing-library/react'
import { CardText } from '@/ui/CardText'
import { formatNumber } from '@/ui/format'

it('renders keywords red and archetype plurals', () => {
  const { container } = render(<CardText text="Select 1 group(s) of monsters to {mutate} into {Aemberon}s, with a 50% chance" />)
  expect(container.querySelector('.kw')?.textContent).toBe('mutate')
  expect(container.textContent).toContain('Aemberons')
  expect(container.textContent).not.toContain('{')
})

it('renders stat icons', () => {
  const { container } = render(<CardText text="+41 {act}Activity and +25 {qty}Quantity" />)
  expect(container.querySelector('[data-icon="heart"]')).not.toBeNull()
  expect(container.querySelector('[data-icon="quantity"]')).not.toBeNull()
})

it('pluralizes Bone Sentry as Bone Sentries and keeps singular names', () => {
  const { container } = render(<CardText text="{BoneSentry}s and an {Agito}" />)
  expect(container.textContent).toContain('Bone Sentries')
  expect(container.textContent).toContain('an Agito')
  expect(container.querySelectorAll('[data-icon="archetype"]')).toHaveLength(2)
})

it('formats huge numbers with separators', () => {
  expect(formatNumber(1234567890)).toBe('1,234,567,890')
})

import { ArchetypeWords } from '@/ui/ArchetypeWords'

it('card text archetype refs carry their archetype color hook', () => {
  const { container } = render(<CardText text="{BoneSentry}s and {Pest}s" />)
  expect(container.querySelector('[data-archetype-word="boneSentry"]')?.textContent).toBe('Bone Sentries')
  expect(container.querySelector('[data-archetype-word="pest"]')?.textContent).toBe('Pests')
})

it('ArchetypeWords colors archetype names inside plain text', () => {
  const { container } = render(<ArchetypeWords text="Added Normal Bone Sentry to tank 1; Slender Limb Powder - Pest; 2 Aemberons, Agitos" />)
  const words = [...container.querySelectorAll('[data-archetype-word]')].map(e => [e.getAttribute('data-archetype-word'), e.textContent])
  expect(words).toEqual([['boneSentry', 'Bone Sentry'], ['pest', 'Pest'], ['aemberon', 'Aemberons'], ['agito', 'Agitos']])
  expect(container.textContent).toBe('Added Normal Bone Sentry to tank 1; Slender Limb Powder - Pest; 2 Aemberons, Agitos')
})

import { ArchetypeIcon, ARCHETYPE_COLORS } from '@/ui/svg/icons'

it('archetype colors: Pest purple, Bone Sentry yellow, Aemberon blue, Agito red', () => {
  expect(ARCHETYPE_COLORS).toEqual({ pest: '#b07cff', boneSentry: '#f2c94c', aemberon: '#4f9dff', agito: '#ff4d4d' })
  const { container } = render(<ArchetypeIcon archetype="aemberon" />)
  expect(container.querySelector('circle')?.getAttribute('stroke')).toBe('#4f9dff')
})

import { fireEvent, screen } from '@testing-library/react'

it('keyword highlight includes the whole word (mutates, added, removed)', () => {
  const { container } = render(<CardText text="When a monster {mutate}s, each time a monster is {add}ed or {remove}d" />)
  expect([...container.querySelectorAll('.kw')].map(e => e.textContent)).toEqual(['mutates', 'added', 'removed'])
  expect(container.textContent).toBe('When a monster mutates, each time a monster is added or removed')
})

it('clicking a keyword shows a tooltip explaining the mechanic; Escape closes it', () => {
  render(<CardText text="{awaken} them" />)
  fireEvent.click(screen.getByRole('button', { name: 'awaken' }))
  expect(screen.getByRole('tooltip').textContent).toMatch(/raises the group[’']s rarity/i)
  fireEvent.keyDown(document, { key: 'Escape' })
  expect(screen.queryByRole('tooltip')).toBeNull()
})

it('the Quantity icon is a swarm of curled grubs, as in-game', () => {
  const { container } = render(<CardText text="+25 {qty}Quantity" />)
  const icon = container.querySelector('[data-icon="quantity"]')!
  expect(icon.getAttribute('data-shape')).toBe('swarm')
  expect(icon.querySelectorAll('[data-part="grub"]').length).toBe(4)
})
