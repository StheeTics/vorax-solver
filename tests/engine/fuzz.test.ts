import { createGame, dispatch, DEFAULT_SETTINGS, canConfirm, needsTargets } from '@/engine/game'
import { createRng } from '@/engine/rng'

it('1,000 random games all finish cleanly', () => {
  for (let seed = 1; seed <= 1000; seed++) {
    const choose = createRng(seed * 7919)
    let s = createGame(DEFAULT_SETTINGS, undefined, seed)
    let steps = 0
    while (s.phase !== 'gameOver') {
      if (++steps > 500) throw new Error(`seed ${seed}: did not finish`)
      if (choose.chance(0.05)) s = dispatch(s, { type: 'refresh' }).state
      s = dispatch(s, { type: 'selectCard', index: choose.int(s.hand.length) }).state
      let guard = 0
      while (needsTargets(s) && !canConfirm(s) && guard++ < 20) {
        s = dispatch(s, { type: 'toggleTarget', tank: choose.int(6) }).state
      }
      s = dispatch(s, { type: 'confirm' }).state
    }
    expect(s.round).toBe(13)
    expect(s.instruments.length).toBeLessThanOrEqual(3)
    for (const t of s.tanks) {
      if (!t) continue
      for (const v of [t.activity, t.quantity]) {
        if (!Number.isSafeInteger(v) || v < 1) throw new Error(`seed ${seed}: bad stat ${v}`)
      }
    }
  }
})
