import type { Archetype, Rarity } from '@/engine/types'

const SCALE: Record<Rarity, number> = { normal: 0.8, magic: 0.9, rare: 1, boss: 1.15 }

/** Dark creature silhouette with a rim glow in currentColor (the rarity color). */
export function Silhouette({ archetype, rarity, size = 120 }: { archetype: Archetype; rarity: Rarity; size?: number }) {
  const s = size * SCALE[rarity]
  return (
    <svg
      data-silhouette={archetype}
      width={s}
      height={s * 1.25}
      viewBox="0 0 100 125"
      aria-hidden="true"
      style={{ filter: 'drop-shadow(0 0 1.5px #000) drop-shadow(0 0 3px currentColor) drop-shadow(0 0 10px currentColor)', overflow: 'visible' }}
    >
      <defs>
        <linearGradient id={`body-${archetype}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3b1a24" />
          <stop offset="1" stopColor="#120609" />
        </linearGradient>
      </defs>
      <g fill={`url(#body-${archetype})`} stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round">
        {SHAPES[archetype]}
      </g>
    </svg>
  )
}

const SHAPES: Record<Archetype, JSX.Element> = {
  // Moth / parasitic butterfly
  pest: (
    <>
      <path d="M50 52C34 22 6 18 6 40c0 16 20 22 40 18Z" />
      <path d="M50 52C66 22 94 18 94 40c0 16-20 22-40 18Z" />
      <path d="M48 60C30 64 16 80 24 96c8 12 22-6 26-30Z" />
      <path d="M52 60C70 64 84 80 76 96c-8 12-22-6-26-30Z" />
      <ellipse cx="50" cy="66" rx="6" ry="24" />
      <circle cx="50" cy="40" r="7" />
      <path d="M47 34C42 22 36 16 30 14M53 34C58 22 64 16 70 14" fill="none" />
      <path d="M20 36c8 2 16 8 24 16M80 36c-8 2-16 8-24 16M28 84c6-6 12-12 18-18M72 84c-6-6-12-12-18-18" fill="none" opacity="0.55" />
      <circle cx="47" cy="39" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="53" cy="39" r="1.6" fill="currentColor" stroke="none" />
    </>
  ),
  // Horned demon
  aemberon: (
    <>
      <path d="M38 30C26 22 20 8 26 0c4 12 12 18 20 22Z" />
      <path d="M62 30C74 22 80 8 74 0c-4 12-12 18-20 22Z" />
      <path d="M50 18c12 0 18 10 16 22-1 8-8 14-16 14s-15-6-16-14c-2-12 4-22 16-22Z" />
      <path d="M34 50c-14 4-24 14-26 30l10 6-6 14 14-4 6 14 6-16c4 4 8 6 12 6s8-2 12-6l6 16 6-14 14 4-6-14 10-6c-2-16-12-26-26-30-4 4-10 6-16 6s-12-2-16-6Z" />
      <path d="M40 102l-4 22h12l2-16 2 16h12l-4-22" />
      <path d="M42 36l5 3M58 36l-5 3" fill="none" />
      <circle cx="44" cy="38" r="2" fill="currentColor" stroke="none" />
      <circle cx="56" cy="38" r="2" fill="currentColor" stroke="none" />
      <path d="M44 47c4 3 8 3 12 0" fill="none" />
    </>
  ),
  // Armored skeleton
  boneSentry: (
    <>
      <path d="M50 4c12 0 19 8 19 19 0 7-3 11-7 13v6H38v-6c-4-2-7-6-7-13C31 12 38 4 50 4Z" />
      <path d="M30 48h40l6 10-6 30H30l-6-30Z" />
      <path d="M36 56h28M37 64h26M38 72h24M40 80h20" fill="none" opacity="0.7" />
      <path d="M50 48v40" fill="none" />
      <path d="M24 52 10 74l6 18 6-2-4-14 10-14Z" />
      <path d="M76 52l12 18-2 22 6 2 4-24-14-22Z" />
      <path d="M92 20v100" fill="none" strokeWidth="2.2" />
      <path d="M88 20l4-12 4 12Z" />
      <path d="M36 88l-4 36h10l6-28h4l6 28h10l-4-36Z" />
      <circle cx="43" cy="22" r="4" fill="currentColor" stroke="none" opacity="0.9" />
      <circle cx="57" cy="22" r="4" fill="currentColor" stroke="none" opacity="0.9" />
      <path d="M44 32h12M47 32v4M53 32v4" fill="none" />
    </>
  ),
  // Robed, hooded figure with a single eye
  agito: (
    <>
      <path d="M50 4c16 0 24 14 24 28 0 6-2 12-4 16h-40c-2-4-4-10-4-16C26 18 34 4 50 4Z" />
      <path d="M30 44c-10 10-16 30-18 56-1 10 4 20 12 24h52c8-4 13-14 12-24-2-26-8-46-18-56-6 4-12 6-20 6s-14-2-20-6Z" />
      <path d="M50 52v68M38 60c-2 20-4 40-6 60M62 60c2 20 4 40 6 60" fill="none" opacity="0.5" />
      <path d="M22 70c-8 8-12 20-10 32l8-4M78 70c8 8 12 20 10 32l-8-4" fill="none" />
      <path d="M36 28c4-6 9-8 14-8s10 2 14 8c-4 6-9 8-14 8s-10-2-14-8Z" fill="#0a0305" />
      <circle cx="50" cy="28" r="4.5" fill="currentColor" stroke="none" />
      <circle cx="50" cy="88" r="6" fill="currentColor" stroke="none" opacity="0.75" />
    </>
  ),
}
