import { readFileSync } from 'node:fs'
import { names } from '../../src/strategy/advisor'

it('the collector accepts every name the Solver can read (worker/src/names.json: npx vite-node scripts/live/names.ts)', () => {
  // a board with a name the collector doesn't know is dropped whole
  const accepted = JSON.parse(readFileSync('worker/src/names.json', 'utf8')) as { potions: string[]; instruments: string[] }
  expect(accepted.potions).toEqual(names().potions)
  expect(accepted.instruments).toEqual(names().instruments)
})
