// What stops the Solver following the game in Vorax Overlay, in words a player can act on: the card over the
// game says it in a line, the Solver window lists what to check.

export type Trouble = 'logOff' | 'windowBlocked' | 'noWindow'

export const TROUBLES: Record<Trouble, { card: string; steps: string[] }> = {
  logOff: {
    card: 'The game’s log is off, so the Solver can’t follow your game.',
    steps: ['In the game: Esc, Account Related, Enable Log, then log out and back in.'],
  },
  // Windows refused to capture the window: most often the game (or Steam) runs as administrator, which a
  // program that isn't can't capture
  windowBlocked: {
    card: 'Windows won’t let Vorax Overlay see the game window.',
    steps: [
      'Don’t run the game or Steam as administrator (Properties, Compatibility), or run Vorax Overlay as administrator too.',
      'On a laptop with two graphics cards: Windows Settings, System, Display, Graphics, set Vorax Overlay to High performance.',
      'On Windows N (Settings, System, About shows the edition): install the Media Feature Pack.',
      'Update your graphics driver, and close other tools that block screen capture.',
    ],
  },
  noWindow: {
    card: 'Vorax Overlay can’t find the game window.',
    steps: ['Play windowed or borderless, with the game window not minimized.', 'If the game is open, restart Vorax Overlay.'],
  },
}

/** Why the game window couldn't be shared, from the error: the app refuses (no game window found), or Windows
 *  won't start the capture. */
export const troubleOf = (err: unknown): Trouble => ((err as Error)?.name === 'NotAllowedError' ? 'noWindow' : 'windowBlocked')
