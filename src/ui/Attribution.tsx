import { COFFEEBNS_URL, TARTARUS_URL } from './links'

/** Credit for the Solver's approach, shown on the landing page and the Solver. */
export function Attribution({ className }: { className?: string }) {
  return (
    <p className={className}>
      The Solver's approach (following the game log and reading the shared game window in the browser) comes from
      CoffeeBns's{' '}
      <a href={TARTARUS_URL} target="_blank" rel="noopener noreferrer">Tartarus Simulator</a>{' '}
      (<a href={COFFEEBNS_URL} target="_blank" rel="noopener noreferrer">twitch.tv/coffeebns</a>), used with
      permission. The code here is our own.
    </p>
  )
}
