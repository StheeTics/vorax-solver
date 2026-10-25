// Training data for the Solver's reader: screenshots of cards it's short of pictures of, or couldn't settle quickly
// (src/solver/share/training.ts). One GitHub issue per card in the private repo, "Training Data: <name>", its
// screenshots committed to the training-data branch and shown in the issue: the first opens it, the next ones are
// comments, and once it has SHOTS the card is no longer wanted. Any card may open an issue, with no daily limit (a
// cap of 10 new cards a day, Oct 23–25, was used up by common cards within minutes). TRAINING_TOKEN: a fine-grained
// token for the repo alone, Contents and Issues read and write.
import names from './names.json'

export const REPO = 'tidewarden/vorax-solver'
export const BRANCH = 'training-data'
/** screenshots per card: from several players' setups (resolutions, interface scales) */
export const SHOTS = 10
/** a JPEG of the game window, base64: about 1-2 MB at 3440x1440 */
export const MAX_PICTURE = 3_000_000
export const MAX_ASK = 2_000

export type Phase = 'potion' | 'instrument' | 'protocol'
const NAMES: Record<Phase, string[]> = { potion: names.potions, instrument: names.instruments, protocol: names.protocols }

export interface TrainingRow { key: string; title: string; issue: number | null; shots: number; created: string }
export interface TrainingStore {
  training(key: string): Promise<TrainingRow | null>
  /** takes a card's row for a new issue; false if another upload has it */
  claimTraining(key: string, title: string, created: string): Promise<boolean>
  setTrainingIssue(key: string, issue: number): Promise<void>
  addTrainingShot(key: string): Promise<void>
  dropTraining(key: string): Promise<void>
}

export interface Card { phase: Phase; name?: string; text?: string }
export interface Shot extends Card { uid: string; slot: number; hand: string[]; why: 'rare' | 'slow'; round?: number; build?: string; picture: string; ui: number }

const isPhase = (v: unknown): v is Phase => v === 'potion' || v === 'instrument' || v === 'protocol'
const str = (v: unknown, max: number) => (typeof v === 'string' && v.length > 0 && v.length <= max ? v : undefined)

/** A card named the collector knows, and nothing else: a title as read is a misread, not a new card. */
export function validateCard(raw: unknown): Card | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  if (!isPhase(o.phase)) return null
  return typeof o.name === 'string' && NAMES[o.phase].includes(o.name) ? { phase: o.phase, name: o.name } : null
}

export function validateShot(raw: unknown): Shot | null {
  const card = validateCard(raw)
  if (!card) return null
  const o = raw as Record<string, unknown>
  const uid = str(o.uid, 64)
  const picture = str(o.picture, MAX_PICTURE)
  // JPEG data starts /9j/ in base64
  if (!uid || !picture || !picture.startsWith('/9j/') || !/^[A-Za-z0-9+/]+=*$/.test(picture)) return null
  if (!Number.isInteger(o.slot) || (o.slot as number) < 0 || (o.slot as number) > 4) return null
  if (!Array.isArray(o.hand) || o.hand.length > 5 || !o.hand.every(h => typeof h === 'string' && h.length <= 60)) return null
  if (o.why !== 'rare' && o.why !== 'slow') return null
  // the interface scale it was read at, which the game logged: without it the cards can't be cut right (a Solver from
  // before Oct 25 doesn't send it)
  if (typeof o.ui !== 'number' || !(o.ui >= 0.5 && o.ui <= 2.5)) return null
  const round = Number.isInteger(o.round) && (o.round as number) >= 1 && (o.round as number) <= 13 ? (o.round as number) : undefined
  return { ...card, uid, picture, slot: o.slot as number, hand: o.hand as string[], why: o.why, ui: Math.round((o.ui as number) * 10000) / 10000, ...(round ? { round } : {}), ...(str(o.build, 40) ? { build: o.build as string } : {}) }
}

/** The same card however its title was read: its name, or the first letters of its text (the app's trainingKey). */
export const keyOf = (c: Card) => `${c.phase}:${c.name ?? `?${(c.text ?? '').toLowerCase().replace(/[^a-z]/g, '').slice(0, 24)}`}`
export const titleOf = (c: Card) =>
  c.name ? `Training Data: ${c.name}` : `Training Data: unknown ${c.phase} "${(c.text ?? '').replace(/\s+/g, ' ').trim().slice(0, 40)}"`

/** Whether a screenshot of this card is still wanted: fewer than SHOTS on its issue, or no issue yet. */
export async function wanted(store: TrainingStore, card: Card): Promise<boolean> {
  const row = await store.training(keyOf(card))
  return row ? row.issue !== null && row.shots < SHOTS : true
}

type Fetcher = (url: string, init?: RequestInit) => Promise<Response>
const api = (token: string, fetcher: Fetcher) => async <T>(path: string, method = 'GET', body?: unknown): Promise<{ ok: boolean; status: number; data: T }> => {
  const res = await fetcher(`https://api.github.com/repos/${REPO}${path}`, {
    method,
    headers: { authorization: `Bearer ${token}`, accept: 'application/vnd.github+json', 'user-agent': 'vorax-live', 'x-github-api-version': '2022-11-28', ...(body ? { 'content-type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  return { ok: res.ok, status: res.status, data: (res.ok ? await res.json() : null) as T }
}

const slug = (c: Card) => (c.name ?? `unknown-${c.text}`).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)

/** The label block a screenshot is added to the reader's training data by (scripts/scan/pullTraining.ts). */
const label = (s: Shot, file: string, received: string) =>
  '```json\n' + JSON.stringify({ file, phase: s.phase, slot: s.slot, hand: s.hand, ...(s.name ? { name: s.name } : { text: s.text }), why: s.why, round: s.round, ui: s.ui, build: s.build, received }, null, 1) + '\n```'

/** Files a screenshot: commits it to the training-data branch, and opens the card's issue or comments on it. */
export async function fileShot(store: TrainingStore, s: Shot, token: string, fetcher: Fetcher, now = new Date()): Promise<{ filed: boolean; issue?: number; why?: string }> {
  const key = keyOf(s)
  const received = now.toISOString()
  let row = await store.training(key)
  let fresh = false
  if (!row) {
    fresh = await store.claimTraining(key, titleOf(s), received)
    row = await store.training(key)
  }
  // another upload is opening its issue, or it has its screenshots
  if (!row || (!fresh && (row.issue === null || row.shots >= SHOTS))) return { filed: false, why: 'not wanted' }

  const gh = api(token, fetcher)
  const release = async (why: string) => {
    if (fresh) await store.dropTraining(key)
    return { filed: false, why }
  }
  // the branch, made from main the first time
  if (!(await gh(`/git/ref/heads/${BRANCH}`)).ok) {
    const main = await gh<{ object: { sha: string } }>('/git/ref/heads/main')
    if (!main.ok || !(await gh('/git/refs', 'POST', { ref: `refs/heads/${BRANCH}`, sha: main.data.object.sha })).ok) return release('no branch')
  }
  const file = `training-data/${slug(s)}/${received.replace(/[:.]/g, '-')}-${s.uid.slice(0, 8)}.jpg`
  const put = await gh(`/contents/${file}`, 'PUT', { message: `${titleOf(s)} (${received})`, content: s.picture, branch: BRANCH })
  if (!put.ok) return release(`picture not saved (${put.status})`)
  const image = `![screenshot](https://github.com/${REPO}/blob/${BRANCH}/${file}?raw=true)`
  const where = `Slot ${s.slot + 1} of the ${s.phase} pick${s.round ? `, round ${s.round}` : ''}: ${s.why === 'rare' ? 'the reader has fewer than 3 pictures of this card' : 'neither its picture nor its title settled it quickly'}.`
  if (fresh) {
    const body = `${where}\n\n${image}\n\n${label(s, file, received)}\n\nUp to ${SHOTS} screenshots of this card come here. Add them to the reader with \`npx vite-node scripts/scan/pullTraining.ts\`.`
    const issue = await gh<{ number: number }>('/issues', 'POST', { title: titleOf(s), body })
    if (!issue.ok) return release(`no issue (${issue.status})`)
    await store.setTrainingIssue(key, issue.data.number)
    await store.addTrainingShot(key)
    return { filed: true, issue: issue.data.number }
  }
  const comment = await gh(`/issues/${row.issue}/comments`, 'POST', { body: `${where}\n\n${image}\n\n${label(s, file, received)}` })
  if (!comment.ok) return { filed: false, why: `no comment (${comment.status})` }
  await store.addTrainingShot(key)
  return { filed: true, issue: row.issue! }
}
