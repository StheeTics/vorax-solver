import type { Archetype, Rarity } from '@/engine/types'

const SCALE: Record<Rarity, number> = { normal: 0.8, magic: 1, rare: 1.18, boss: 1.38 }
const INK = '#1d1410'

/** Rarity glow in currentColor; Boss red would vanish on the red glass, so it gets a white rim and a strong red halo. */
const GLOW = 'drop-shadow(0 0 2.5px currentColor) drop-shadow(0 0 6px currentColor) drop-shadow(0 0 14px currentColor)'
// no white: a tight dark outline + dark crimson aura (contrasts with the bright red glass), then an orange-red bloom; pulses via .boss-glow
const BOSS_GLOW = 'drop-shadow(0 0 1.5px #1a0003) drop-shadow(0 0 2px #1a0003) drop-shadow(0 0 9px #2a0004) drop-shadow(0 0 14px #2a0004) drop-shadow(0 0 24px #ff5a1f)'

/**
 * Flat monster drawing per Archetype (same style as the card art), loosely based on the in-game models.
 * The rarity shows as a glow in currentColor and as size.
 */
export function Silhouette({ archetype, rarity, size = 120 }: { archetype: Archetype; rarity: Rarity; size?: number }) {
  const s = size * SCALE[rarity]
  return (
    <svg
      data-silhouette={archetype}
      className={rarity === 'boss' ? 'boss-glow' : undefined}
      width={s}
      height={s * 1.25}
      viewBox="0 0 100 125"
      aria-hidden="true"
      style={{ filter: rarity === 'boss' ? BOSS_GLOW : GLOW, overflow: 'visible' }}
    >
      <g stroke={INK} strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round">
        {MONSTERS[archetype]}
      </g>
    </svg>
  )
}

const MONSTERS: Record<Archetype, JSX.Element> = {
  // Purple bug: segmented abdomen, horned head, six jointed legs
  pest: (
    <>
      <g fill="none" stroke="#3d2470" strokeWidth="3.4">
        <path d="M38 66l-16 6-8 16M36 76l-18 14-4 18M40 86l-12 18 2 16" />
        <path d="M62 66l16 6 8 16M64 76l18 14 4 18M60 86l12 18-2 16" />
      </g>
      <ellipse cx="50" cy="94" rx="20" ry="26" fill="#9466d8" />
      <path d="M32 84c10 4 26 4 36 0M31 96c11 4 27 4 38 0M33 108c10 4 24 4 34 0" fill="none" stroke="#5b3a9a" strokeWidth="2.4" />
      <path d="M40 80c4-6 16-6 20 0" fill="none" stroke="#c8a6ff" strokeWidth="2" />
      <ellipse cx="50" cy="66" rx="15" ry="12" fill="#7b4bc4" />
      <path d="M36 52c-4-10 2-20 14-20s18 10 14 20c-4 4-24 4-28 0Z" fill="#9466d8" />
      <path d="M50 34c-2-10 2-18 12-22-4 6-4 12-2 18Z" fill="#7b4bc4" />
      <path d="M42 38c4-3 12-3 16 0" fill="none" stroke="#c8a6ff" strokeWidth="2" />
      <path d="M42 54l-6 8 8-2M58 54l6 8-8-2" fill="#3d2470" />
      <circle cx="43" cy="46" r="3.4" fill="#f3e9ff" />
      <circle cx="57" cy="46" r="3.4" fill="#f3e9ff" />
    </>
  ),
  // Yellow mech knight: boxy plated armour, visor slit, fin, dark mechanical joints
  boneSentry: (
    <>
      <path d="M50 2l6 16H44Z" fill="#a0761a" />
      <path d="M34 18h32l4 26H30Z" fill="#f0c23a" />
      <path d="M36 30h28v6H36Z" fill="#2a2a2e" />
      <path d="M40 32h20" stroke="#ffe680" strokeWidth="2.4" />
      <path d="M44 44h12v6H44Z" fill="#3a3a42" />
      <path d="M14 50h22v18H14ZM64 50h22v18H64Z" fill="#f0c23a" />
      <path d="M14 56h22M64 56h22" stroke="#a0761a" strokeWidth="2" />
      <path d="M32 50h36l-2 34H34Z" fill="#f0c23a" />
      <path d="M40 58h20M40 64h20M40 70h20" stroke="#a0761a" strokeWidth="2.2" />
      <circle cx="50" cy="78" r="4" fill="#ffe680" />
      <path d="M18 68v20M82 68v20" stroke="#3a3a42" strokeWidth="7" />
      <path d="M12 88h14v14H12ZM74 88h14v14H74Z" fill="#f0c23a" />
      <path d="M34 84h32v8H34Z" fill="#3a3a42" />
      <path d="M34 92h12v20H34ZM54 92h12v20H54Z" fill="#f0c23a" />
      <circle cx="40" cy="101" r="3" fill="#3a3a42" />
      <circle cx="60" cy="101" r="3" fill="#3a3a42" />
      <path d="M30 112h18v10H30ZM52 112h18v10H52Z" fill="#a0761a" />
    </>
  ),
  // Red floating armour: helm, detached pauldrons and gauntlets, hovering cuirass, no body — just light and a spirit trail
  agito: (
    <g transform="translate(50 60) scale(1.18) translate(-50 -60)">
      <path data-part="spirit-trail" d="M40 80c-5 16 2 26-6 40 9-5 12-14 16-14s7 9 16 14c-8-14-1-24-6-40Z" fill="#ffd9d9" fillOpacity="0.4" stroke="none" />
      <ellipse cx="50" cy="62" rx="12" ry="18" fill="#ffffff" fillOpacity="0.55" stroke="none" />
      <path d="M50 4c-4 6-4 10 0 14 4-4 4-8 0-14Z" fill="#e0b050" />
      <path d="M34 34c0-12 7-18 16-18s16 6 16 18v8c-4 4-28 4-32 0Z" fill="#9c1f2b" />
      <path d="M38 30h24v4H52v8h-4v-8H38Z" fill="#ffffff" />
      <path d="M34 34h32" stroke="#e0b050" strokeWidth="2" />
      <path d="M12 52c2-8 10-12 20-10l2 14c-8 4-18 4-22-4Z" fill="#9c1f2b" />
      <path d="M88 52c-2-8-10-12-20-10l-2 14c8 4 18 4 22-4Z" fill="#9c1f2b" />
      <path d="M14 54c6 2 12 2 18 0M86 54c-6 2-12 2-18 0" stroke="#e0b050" strokeWidth="2" fill="none" />
      <path d="M36 50h28l-3 26c-4 6-18 6-22 0Z" fill="#9c1f2b" />
      <path d="M50 52v24M40 58c6 3 14 3 20 0" stroke="#5a0f17" strokeWidth="2" fill="none" />
      <path d="M38 50h24" stroke="#e0b050" strokeWidth="2.4" />
      <path d="M12 66h10l2 6c0 6-3 10-8 10s-7-4-7-9Z" fill="#9c1f2b" />
      <path d="M88 66H78l-2 6c0 6 3 10 8 10s7-4 7-9Z" fill="#9c1f2b" />
      <path d="M11 66h12M77 66h12" stroke="#e0b050" strokeWidth="2.4" />
      <path d="M14 76h6M80 76h6" stroke="#5a0f17" strokeWidth="1.6" />
    </g>
  ),
  // Blue werewolf: hunched beast, snout and fangs, pointed ears, mane, long clawed arms
  aemberon: (
    <>
      <path d="M34 92l-8 22-10 6h14l8-12 4-14ZM66 92l8 22 10 6H70l-8-12-4-14Z" fill="#23408a" />
      <path d="M28 52c-6 16-6 32 2 44 8 6 32 6 40 0 8-12 8-28 2-44-6-6-38-6-44 0Z" fill="#3f6fd0" />
      <path d="M40 62c6 4 14 4 20 0l-2 26c-4 4-12 4-16 0Z" fill="#8fb4f0" />
      <path d="M28 54c-10 8-16 22-16 36l-4 10 6-2 2 8 4-8 4 4-2-12c2-10 6-18 12-24ZM72 54c10 8 16 22 16 36l4 10-6-2-2 8-4-8-4 4 2-12c-2-10-6-18-12-24Z" fill="#23408a" />
      <path d="M30 50l-4-12 8 6 2-10 6 8 4-10 4 10 4-10 4 10 6-8 2 10 8-6-4 12Z" fill="#23408a" />
      <path d="M36 32l-6-22 12 12ZM64 32l6-22-12 12Z" fill="#3f6fd0" />
      <path d="M36 28c0-8 6-14 14-14s14 6 14 14v6c0 4-2 8-4 10l-10 8-10-8c-2-2-4-6-4-10Z" fill="#3f6fd0" />
      <path d="M42 38c2 8 14 8 16 0l-2 12-6 4-6-4Z" fill="#8fb4f0" />
      <path d="M45 50l2 4 2-4M51 50l2 4 2-4" fill="#ffffff" />
      <circle cx="50" cy="40" r="2.6" fill="#1a1a2a" />
      <path d="M41 30l5 2M59 30l-5 2" stroke="#1a1a2a" strokeWidth="2" />
      <circle cx="43" cy="31" r="2" fill="#ffd84a" stroke="none" />
      <circle cx="57" cy="31" r="2" fill="#ffd84a" stroke="none" />
    </>
  ),
}
