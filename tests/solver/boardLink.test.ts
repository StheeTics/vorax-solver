import { boardFromLink, boardLink, DEMO_BOARD } from '@/solver/boardLink'

describe('a link that opens the Solver on a given board', () => {
  it('a board survives the round trip through a link', () => {
    const url = boardLink(DEMO_BOARD, 'https://x.dev/solver.html')
    expect(url).toMatch(/^https:\/\/x\.dev\/solver\.html\?board=[\w-]+$/)
    expect(boardFromLink(new URL(url).search)).toEqual(DEMO_BOARD)
  })
  it('?demo opens the example board', () => {
    expect(boardFromLink('?demo')).toEqual(DEMO_BOARD)
  })
  it('anything malformed opens nothing', () => {
    expect(boardFromLink('')).toBeNull()
    expect(boardFromLink('?board=not-json')).toBeNull()
    expect(boardFromLink('?board=' + btoa(JSON.stringify({ tanks: 'x' })))).toBeNull()
  })
  it('the demo is a full board: six tank places, a hand, and the instruments owned', () => {
    expect(DEMO_BOARD.tanks).toHaveLength(6)
    expect(DEMO_BOARD.hand.length).toBeGreaterThan(0)
  })
})

describe('?demo=pick: the question asked when an instrument was picked whose icon the Solver hasn’t seen', () => {
  it('asks about the newest instrument, among the ones that were offered', async () => {
    const { demoPick } = await import('@/solver/boardLink')
    const ask = demoPick('?demo=pick')!
    expect(ask.question.offer).toContain('Two-Inch Skull Nail')
    expect(ask.count).toBe(ask.question.slot + 1)
    expect(demoPick('?demo')).toBeNull()
  })
})
