// Adds the boards pulled since the digest was last written (data/live/raw) to it (data/live/digest): what the
// dashboard needs of them, kept in git so the raw boards needn't be. The nightly jobs run it after the pull.
// Usage: npx vite-node scripts/live/digest.ts
import { loadDigest, saveDigest, updatedDigest } from './collect'

const before = loadDigest()
const d = updatedDigest()
saveDigest(d)
const boards = (x: typeof d) => x.days.reduce((n, day) => n + day.boards, 0)
console.log(`Digest: ${boards(d) - boards(before)} boards added, up to ${d.upto || 'none yet'}; ${d.games.length} games in all`)
