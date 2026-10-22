// The round when its number can't be read (an effect over it, a card raised in front of it). It used to fall back to
// round 1, so the advice played as if twelve rounds were left: 12% of the boards shared Oct 18–22, 2026. Within a
// game the round only moves on a step at a time, so the last round read stands in, or the reader's guess when it is
// that round or the next.

/** The round to advise on: the one read when sure, else carried over from the board before (`last`). */
export function carriedRound(last: { round?: number; phase: string } | null, read: { round: number; phase: string; sure: boolean; guess?: string }): number {
  if (read.sure) return read.round
  const before = last?.round
  if (!before) return 1
  // rounds 11–13 are the Surgical Protocols; a card or instrument offer after them is a new game
  if (read.phase === 'protocol') return Math.max(before, 11)
  if (before > 10) return 1
  const guess = Number(read.guess)
  if (Number.isInteger(guess) && (guess === before || guess === before + 1)) return guess
  return before
}
