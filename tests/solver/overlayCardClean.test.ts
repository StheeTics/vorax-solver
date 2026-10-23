// @vitest-environment node
// The app's own code between the page and the card over the game: what it lets through.
import { createRequire } from 'node:module'
import { overlayCard } from '@/solver/desktop/bridge'

const { cleanCard } = createRequire(import.meta.url)('../../desktop/lib/card.js') as { cleanCard(card: unknown): Record<string, unknown> | null }

it('lets through everything the page’s card carries, the question included', () => {
  const card = overlayCard(null, false, ['Which Intern Shelley level do you have?', 'Tank 2’s numbers weren’t read for sure'])
  expect(cleanCard(card)).toEqual(card)
  const paused = overlayCard(null, false, [], null, [], { paused: ['logOff', 'shelley'], forced: [] })
  expect(cleanCard(paused)).toEqual(paused)
})

it('only plain text, cut to length; anything else is left out', () => {
  expect(cleanCard({ move: 'Refresh', detail: 1, others: ['a', 2, 'c', 'd'], round: 'x', updating: 1, ask: { html: '<b>' }, asks: ['q', 3, 'r', 's', 't', 'u'], extra: 'no' }))
    .toEqual({ move: 'Refresh', detail: '', others: ['a', '', 'c'], round: null, updating: true, ask: null, asks: ['q', 'r', 's', 't'], choices: [], paused: false, warning: '' })
  expect(cleanCard({ ask: 'x'.repeat(500) })!.ask).toHaveLength(300)
  expect(cleanCard({ choices: ['Fouled Scraper', 2, 'Rawhide Restraint', 'a', 'b'] })!.choices).toEqual(['Fouled Scraper', 'Rawhide Restraint', 'a'])
  expect(cleanCard({ paused: 'yes', warning: { html: '<b>' } })).toMatchObject({ paused: true, warning: '' })
  expect(cleanCard(null)).toBeNull()
})

it('when the run is over, the card says so instead of the last pick’s advice, and passes through the app', () => {
  const card = overlayCard(null, true, [], null, [], { paused: ['logOff'], forced: [] }, true)
  expect(card).toMatchObject({ move: 'Enjoy your loot', updating: false, paused: false })
  expect(cleanCard(card)).toEqual(card)
})
