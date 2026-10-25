// Which game-log lines mean "the board changed", and when its animations have settled enough to look.
// Patterns come from the game's own lines in a real UE_game.log (see tests/fixtures/vorax-log-excerpt.log).

export type TriggerKind = 'board' | 'screen' | 'refresh' | 'over'

export interface TriggerRules {
  patterns: Record<TriggerKind, string[]>
  /** the `over` lines that mean the run itself is done */
  finished: string[]
  /** a card or number animation is still playing */
  animation: string
  /** sounds of the player's own clicks, which share the animation prefix but aren't animations */
  playerSounds: string[]
  /** the board's numbers have landed: the last animation of a played potion */
  done: string
  /** the new hand being dealt: on a board with no numbers changing, the last of its animations */
  dealt: string
  /** how long after the deal a board with no numbers changing counts as settled (its picture still waits for a
   *  still screen) */
  dealtDelayMs: number
  /** how long a new board waits for its deal before silence counts again (a deal never logged) */
  dealWaitMs: number
  /** numbers landing sooner than this after the deal: the cards are still flying in, so the picture waits for a
   *  still screen (settled as 'dealt') instead of being taken at once */
  dealLandsMs: number
  /** the player clicked something: the board they're looking at has settled */
  playerActions: string[]
  /** the tanks' numbers are changing (a potion's effects): only their landing, `done`, means they've settled */
  effects: string[]
  doneDelayMs: number
  settleMs: number
  maxMs: number
  /** the same, while numbers are changing and their landing hasn't been logged */
  effectSettleMs: number
  effectMaxMs: number
}

export const DEFAULT_RULES: TriggerRules = {
  patterns: {
    // the server's reply after Confirm or Refresh: the new board
    board: ['ProtoId = 5619'],
    // the game screen opens: the first board and the starting instrument offer
    screen: ['S13GamePlayMain Run', 'S13GamePlay_C_StartGameBtn'],
    refresh: ['S13GamePlayMain_C_RefreshBtn'],
    // closing the Vorax screen logs "Destory" (the game's spelling), seen Oct 23; the run ends on the reward screen
    over: ['ProtoId = 5621', 'S13GamePlayMain Hide', 'S13GamePlayMain Destory', 'S13GamePlayReward Run', 'S13GamePlayReward_C_FightBtn', 'S13GamePlayReward_C_GiveUpBtn'],
  },
  // the run is done (the reward screen after round 13's protocol, then the battle), not just its screen closed
  finished: ['ProtoId = 5621', 'S13GamePlayReward Run', 'S13GamePlayReward_C_FightBtn', 'S13GamePlayReward_C_GiveUpBtn'],
  animation: 'Play_UI_S13_KYZ_Card_',
  playerSounds: ["KYZ_Card_Selected'", 'KYZ_Card_Selected_Confirm', 'KYZ_Card_Agentia_Use'],
  done: 'KYZ_Card_Figure_Refresh',
  dealt: 'KYZ_Card_Selected_Shuffle',
  playerActions: ['normal-click SelectBtn', 'normal-click ComfirmBtn', 'normal-click RefreshBtn', 'normal-click RelicBtn'],
  effects: ['KYZ_Card_Figure_Add', 'KYZ_Card_Monster_'],
  // Measured on a real game at the game's x4 Speed-up: a potion's animations end with the numbers
  // landing (done); a deal after an instrument pick or a reroll goes quiet within ~300 ms.
  doneDelayMs: 0,
  // 105 boards, Oct 22-23: the deal was the last animation of all 42 plain deals; the next click came 0.47 s
  // after it at the soonest
  dealtDelayMs: 100,
  // the deal came 0.42-0.53 s after the board's line when nothing was logged before it (Oct 23)
  dealWaitMs: 1000,
  // protocol rounds log the deal and the landing together (cards caught mid-flight, Oct 23); in potion rounds the
  // deal came 0.57-0.58 s before the landing
  dealLandsMs: 450,
  settleMs: 150,
  maxMs: 3000,
  // 63 boards of real games (Oct 22-23): the numbers landed 0.58 s after the last change, so 0.4 s of silence
  // came before every one of 32 landings; the slowest landed 4.8 s after the board. 4 boards changed numbers
  // and logged no landing.
  effectSettleMs: 800,
  effectMaxMs: 6000,
}

const ORDER: TriggerKind[] = ['board', 'screen', 'refresh', 'over']

export function classify(line: string, rules = DEFAULT_RULES): TriggerKind | null {
  return ORDER.find(k => rules.patterns[k].some(p => line.includes(p))) ?? null
}

/** The interface scale the labelled frames were captured at, as the game logs it: the reader's 1x. */
export const REF_PAGE_SCALE = 0.66887495368719

/**
 * The reader's interface scale from the game's own line, written as each page opens:
 * "PageView@PageViewSetUIScale PageId = 70434_SettingCtrl, PageScale = 0.84115232944489 0.841 0.84115232944489".
 * The last number is the slider setting (0.64 lowest, 0.841 recommended, 1 highest; Oct 23), the same on every page;
 * the first is fixed on a few. A screenshot at 0.64 fit 0.955x on the reader's layout, its estimate 0.957.
 */
export function uiScaleOf(line: string): number | null {
  const m = /PageViewSetUIScale PageId = \S+, PageScale = [\d.]+ [\d.]+ ([\d.]+)/.exec(line)
  const v = m ? Number(m[1]) : NaN
  return v > 0.3 && v < 3 ? v / REF_PAGE_SCALE : null
}

export const isAnimation = (line: string, rules = DEFAULT_RULES) =>
  line.includes(rules.animation) && !rules.playerSounds.some(p => line.includes(p))

/** The time at the start of a log line, "[2026.10.17-14.24.11:563]", in ms; null if it has none. */
export function logTime(line: string): number | null {
  const m = /^\[(\d{4})\.(\d\d)\.(\d\d)-(\d\d)\.(\d\d)\.(\d\d):(\d{3})\]/.exec(line)
  return m ? Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6], +m[7]) : null
}

/** Why a board counted as settled: its numbers landed, the player clicked, the new hand was dealt with no numbers
 *  changing, the log went quiet, or the wait ran out. */
export type SettledBy = 'done' | 'acted' | 'dealt' | 'quiet' | 'max'

export interface Settler {
  feed(lines: string[], now: number): void
  /** a snap to take now, at most once per trigger */
  due(now: number): 'board' | 'screen' | null
  cancel(): void
  readonly refreshes: number
  readonly over: boolean
  /** the run is done (over says only that nothing is on screen) */
  readonly finished: boolean
  /** why the last snap was due */
  readonly settledBy: SettledBy | null
}

export function createSettler(rules = DEFAULT_RULES): Settler {
  let pending: { kind: 'board' | 'screen'; t0: number; lastAnim: number; doneAt: number | null; dealtAt: number | null; dealAt: number | null; acted: boolean; effects: boolean; awaitDeal: boolean } | null = null
  const start = (kind: 'board' | 'screen', now: number) => ({ kind, t0: now, lastAnim: now, doneAt: null, dealtAt: null, dealAt: null, acted: false, effects: false, awaitDeal: false })
  let refreshes = 0
  let over = false
  let finished = false
  let settledBy: SettledBy | null = null

  return {
    feed(lines, now) {
      for (const line of lines) {
        const kind = classify(line, rules)
        if (kind === 'screen') {
          over = false
          finished = false
          refreshes = 0
          pending = start(kind, now)
        } else if (kind === 'over') {
          over = true
          if (rules.finished.some(p => line.includes(p))) finished = true
          pending = null
        } else if (kind === 'refresh') {
          refreshes++
        } else if (kind === 'board') {
          // a new board's hand is dealt up to ~0.5 s after its line, with nothing logged before it (a potion that
          // changes nothing, an instrument's surgery; Oct 23): no silence counts until the deal
          if (!over) pending = { ...start(kind, now), awaitDeal: true }
        } else if (pending && rules.playerActions.some(p => line.includes(p))) {
          pending.acted = true
        } else if (pending && line.includes(rules.done)) {
          pending.doneAt = now
        } else if (pending && isAnimation(line, rules)) {
          pending.lastAnim = now
          if (rules.effects.some(p => line.includes(p))) pending.effects = true
          if (line.includes(rules.dealt)) [pending.awaitDeal, pending.dealAt] = [false, now]
          // the deal counts only while it's the last thing animating
          pending.dealtAt = line.includes(rules.dealt) ? now : null
        }
      }
    },
    due(now) {
      if (!pending) return null
      const { kind, t0, lastAnim, doneAt, dealtAt, dealAt, acted, effects, awaitDeal } = pending
      // a deal still to come: no silence counts until it has, or until it's clearly not coming
      const quiet = awaitDeal && now - t0 < rules.dealWaitMs ? Infinity : effects ? rules.effectSettleMs : rules.settleMs
      const max = effects ? rules.effectMaxMs : rules.maxMs
      const dealt = !effects && dealtAt !== null && now - dealtAt >= rules.dealtDelayMs
      const landed = doneAt !== null && now - doneAt >= rules.doneDelayMs
      const flying = landed && dealAt !== null && doneAt! - dealAt < rules.dealLandsMs
      const why: SettledBy | null = acted ? 'acted' : landed ? (flying ? 'dealt' : 'done') : dealt ? 'dealt' : now - lastAnim >= quiet ? 'quiet' : now - t0 >= max ? 'max' : null
      if (why) {
        pending = null
        settledBy = why
        return kind
      }
      return null
    },
    cancel() {
      pending = null
    },
    get refreshes() {
      return refreshes
    },
    get over() {
      return over
    },
    get finished() {
      return finished
    },
    get settledBy() {
      return settledBy
    },
  }
}
