// Usage: vite-node scripts/sim/strengthShard.ts <games> <shard> <shards>  → one JSON line per instrument in this shard
import { INSTRUMENTS } from '@/data/instruments'
import { measureStrength } from './strength'

const [games, shard, shards] = process.argv.slice(2).map(Number)
INSTRUMENTS.forEach((d, i) => {
  if (i % shards === shard) console.log(JSON.stringify({ name: d.name, strength: +measureStrength(d.name, games).toFixed(3), games }))
})
