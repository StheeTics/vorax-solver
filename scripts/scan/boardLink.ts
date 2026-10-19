// A link that opens the Solver on a saved board (src/solver/boardLink.ts), to look at a hand again.
// Usage: vite-node scripts/scan/boardLink.ts <a capture's NNN-board.reading.json> [--local]
//   --local: the dev server (npm run dev) instead of the live site
import { readFileSync } from 'node:fs'
import { boardLink } from '../../src/solver/boardLink'

const [file, flag] = process.argv.slice(2)
const reading = JSON.parse(readFileSync(file, 'utf8'))
const page = flag === '--local' ? 'http://localhost:5173/tli-vorax-simulator/solver.html' : 'https://tidewarden.github.io/tli-vorax-simulator/solver.html'
console.log(boardLink(reading.state ?? reading, page))
