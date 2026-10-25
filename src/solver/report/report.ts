// The text a player pastes into a GitHub issue when the Solver misreads their screen or advises oddly, and the link
// that opens the issue form with it filled in. It holds what was read and the advice shown, nothing from the log;
// the screenshot goes on the clipboard, for the player to paste into the issue.
import { SOLVER_ISSUE_URL } from '@/ui/links'
import type { Advice, ScreenState } from '@/strategy/advisor'
import { describe as move, predicted } from '../advice/describe'
import type { FieldKey, Problem, Reading, Source } from '../types'

export interface ReportContext { build: string; userAgent: string; source: Source; corrections: Record<FieldKey, string>; advice?: { board: ScreenState; advice: Advice } | null }

const MAX_URL = 7500

function describe(p: Problem): string {
  if (p.kind === 'notFound') return 'screen not found'
  if (p.kind === 'animating') return 'card animation'
  if (p.kind === 'unknownName') return `unknown name ${p.name}`
  const m = /^(hand|instrument|tank)(\d)(?:\.(\w+))?$/.exec(p.field)
  const what = !m ? p.field : m[1] === 'hand' ? `card ${+m[2] + 1}` : m[1] === 'instrument' ? `instrument ${+m[2] + 1}` : `tank ${+m[2] + 1}${m[3] ? ` ${m[3][0].toUpperCase()}${m[3].slice(1)}` : ''}`
  return p.kind === 'unknownArt' ? `${what} not recognised` : `${what} unreadable`
}

function browser(ua: string): string {
  const b = /Edg\/(\d+)/.exec(ua) ? `Edge ${/Edg\/(\d+)/.exec(ua)![1]}` : /Chrome\/(\d+)/.exec(ua) ? `Chrome ${/Chrome\/(\d+)/.exec(ua)![1]}` : /Firefox\/(\d+)/.exec(ua) ? `Firefox ${/Firefox\/(\d+)/.exec(ua)![1]}` : 'another browser'
  const os = /Windows/.test(ua) ? 'Windows' : /Mac OS/.test(ua) ? 'macOS' : /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Linux/.test(ua) ? 'Linux' : 'another OS'
  return `${b} · ${os}`
}

export function buildReport(r: Reading, ctx: ReportContext): string {
  const unsure = Object.fromEntries(
    Object.entries(r.fields)
      .filter(([, f]) => !f.sure)
      .map(([k, f]) => [k, `${f.guess ?? '?'}${f.score !== undefined ? ` (score ${f.score.toFixed(2)} vs ${(f.second ?? 0).toFixed(2)})` : ''}`]),
  )
  const lines = [
    '### Solver board report',
    `- Problem: ${r.problems.map(describe).join('; ') || 'none flagged'}`,
    `- Solver: v${ctx.build} · ${browser(ctx.userAgent)}`,
    `- Frame: ${r.frame ? `${r.frame.width}×${r.frame.height}` : 'unknown'}, source: ${ctx.source}${r.frame?.trigger ? ` (trigger: ${r.frame.trigger})` : ''}`,
    `- Phase: ${r.state.phase} · Round: ${r.state.round ?? '?'}/13 (${r.fields.round?.sure === false ? 'unsure' : 'sure'})`,
    '- Read:',
    '```json',
    JSON.stringify({ ...r.state, unsure }, null, 2),
    '```',
  ]
  const fixes = Object.entries(ctx.corrections)
  if (fixes.length) lines.push(`- Your corrections: ${fixes.map(([k, v]) => `${k} ${v}`).join(', ')}`)
  if (ctx.advice) lines.push(...adviceLines(ctx.advice.board, ctx.advice.advice))
  return lines.join('\n')
}

/** The advice as the panel showed it: every option, best first, with what it's predicted to end at. */
function adviceLines(board: ScreenState, a: Advice): string[] {
  const value = (r: Advice['ranking'][number]) => (r.end ? predicted(r.end) : `${Math.round(r.value).toLocaleString()}${a.plan ? '' : ' this round'}`)
  return [
    `- Advice (${a.final ? 'final' : 'still working'}, ${Math.round(a.ms)} ms): ${a.best === 'refresh' ? 'Refresh' : a.best ? move(a.best, board, true) : a.note ?? 'any choice'}`,
    ...a.ranking.map(r => `  - ${move(r, board, true)}: ${value(r)}`),
    ...(a.refreshEnd ? [`  - Refresh: ${predicted(a.refreshEnd)}`] : []),
  ]
}

export const reportTitle = (r: Reading) => `Solver: ${r.problems.length ? describe(r.problems[0]) : 'board report'}`

export function issueLink(title: string, report: string): { url: string; prefilled: boolean } {
  const full = `${SOLVER_ISSUE_URL}?${new URLSearchParams({ template: 'solver-reading.yml', title, report })}`
  if (full.length <= MAX_URL) return { url: full, prefilled: true }
  return { url: `${SOLVER_ISSUE_URL}?${new URLSearchParams({ template: 'solver-reading.yml', title })}`, prefilled: false }
}
