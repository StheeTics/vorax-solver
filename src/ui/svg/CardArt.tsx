import { useId, type ReactNode } from 'react'
import type { Card } from '@/engine/types'
import { ArchetypeIcon } from './icons'
import { INSTRUMENT_ART, POTION_ART, type Mark, type PotionArt, type Vessel } from './cardArtSpecs'

const INK = '#1d1410'
const CORK = '#a97b4a'
const GLASS = 'rgb(214 228 236 / 0.34)'
const SHINE = 'rgb(255 255 255 / 0.55)'

/** Flat SVG card illustration: one distinct drawing per potion and instrument. */
export function CardArt({ card, size = 76 }: { card: Card; size?: number }) {
  const uid = useId().replace(/:/g, '')
  const body = card.kind === 'potion' ? potionArt(POTION_ART[card.id], uid) : TOOLS[INSTRUMENT_ART[card.id]]
  return (
    <svg data-art={`${card.kind}-${card.id}`} width={size} height={size} viewBox="0 0 80 80" aria-hidden="true" style={{ filter: 'drop-shadow(0 4px 6px rgb(0 0 0 / 0.6))', overflow: 'visible' }}>
      {body}
    </svg>
  )
}

// ---------------------------------------------------------------- potions

/** Glass outline, liquid level (y) and an optional extra element (neck, cork …) for each vessel. */
const GLASS_SHAPES: Partial<Record<Vessel, { glass: string; level: number; top?: ReactNode }>> = {
  bottle: {
    glass: 'M28 25h24v37a10 10 0 0 1-10 10h-4a10 10 0 0 1-10-10Z',
    level: 40,
    top: (
      <>
        <rect x="34" y="16" width="12" height="10" rx="2" fill={GLASS} stroke={INK} strokeWidth="1.2" />
        <rect x="32.5" y="8" width="15" height="9" rx="2" fill={CORK} stroke={INK} strokeWidth="1.2" />
      </>
    ),
  },
  ampoule: {
    glass: 'M33 35c0-5 3-8 7-8s7 3 7 8v29a7 7 0 0 1-14 0Z',
    level: 41,
    top: <path d="M38 28v-9l2-11 2 11v9" fill={GLASS} stroke={INK} strokeWidth="1.2" strokeLinejoin="round" />,
  },
  flask: {
    glass: 'M35 15h10v19a20 20 0 1 1-10 0Z',
    level: 44,
    top: <rect x="33.5" y="7" width="13" height="9" rx="2" fill={CORK} stroke={INK} strokeWidth="1.2" />,
  },
  heartFlask: {
    glass: 'M40 72C15 56 15 33 29 31c5-1 8 2 11 6 3-4 6-7 11-6 14 2 14 25-11 41Z',
    level: 40,
    top: (
      <>
        <rect x="36" y="18" width="8" height="15" rx="2" fill={GLASS} stroke={INK} strokeWidth="1.2" />
        <rect x="34.5" y="10" width="11" height="9" rx="2" fill={CORK} stroke={INK} strokeWidth="1.2" />
      </>
    ),
  },
  teardrop: {
    glass: 'M40 14c11 17 19 29 19 40a19 19 0 0 1-38 0c0-11 8-23 19-40Z',
    level: 30,
  },
}

function potionArt(spec: PotionArt, uid: string): ReactNode {
  const { vessel, color, mark, emblem } = spec
  const shape = GLASS_SHAPES[vessel]
  let art: ReactNode
  if (shape) {
    art = (
      <>
        <defs>
          <clipPath id={`g${uid}`}><path d={shape.glass} /></clipPath>
        </defs>
        {shape.top}
        <path d={shape.glass} fill={GLASS} />
        <g clipPath={`url(#g${uid})`}>
          <rect x="0" y={shape.level} width="80" height="80" fill={color} />
          <rect x="0" y={shape.level} width="80" height="5" fill="rgb(255 255 255 / 0.28)" />
        </g>
        <path d={shape.glass} fill="none" stroke={INK} strokeWidth="1.3" />
        <path d={`M${vessel === 'ampoule' ? 36 : 32} ${shape.level - 6}v18`} stroke={SHINE} strokeWidth="2.2" strokeLinecap="round" />
      </>
    )
  } else if (vessel === 'twinAmpoule') {
    const one = (dx: number, rot: number, id: string) => (
      <g transform={`translate(${dx} 4) rotate(${rot} 40 50) scale(0.82) translate(9 9)`}>
        <defs><clipPath id={id}><path d={GLASS_SHAPES.ampoule!.glass} /></clipPath></defs>
        {GLASS_SHAPES.ampoule!.top}
        <path d={GLASS_SHAPES.ampoule!.glass} fill={GLASS} />
        <g clipPath={`url(#${id})`}><rect x="0" y="41" width="80" height="80" fill={color} /></g>
        <path d={GLASS_SHAPES.ampoule!.glass} fill="none" stroke={INK} strokeWidth="1.4" />
        <path d="M36 37v16" stroke={SHINE} strokeWidth="2.2" strokeLinecap="round" />
      </g>
    )
    art = <>{one(-11, -9, `a${uid}`)}{one(11, 9, `b${uid}`)}</>
  } else {
    art = SOLIDS[vessel](color)
  }
  return (
    <>
      {art}
      {MARKS[mark](color, vessel)}
      {emblem && (
        <g transform="translate(48 52)">
          <ArchetypeIcon archetype={emblem} size={26} />
        </g>
      )}
    </>
  )
}

const SOLIDS: Record<string, (c: string) => ReactNode> = {
  // cloth bag, cinched neck, a puff of powder dust coming out of the open top
  sack: c => (
    <g stroke={INK} strokeWidth="1.3">
      <path d="M31 41c-11 4-17 13-16 22 1 7 7 11 16 11h18c9 0 15-4 16-11 1-9-5-18-16-22Z" fill="#8b7765" />
      <path d="M24 56c3 6 8 9 12 10M56 54c-2 7-6 10-10 12M40 46v8" fill="none" stroke="#5f4e40" strokeOpacity="0.7" />
      <path d="M31 41c2-5 16-5 18 0" fill="#a08b77" />
      <path d="M30 42c6 3 14 3 20 0" fill="none" stroke="#4a3a2c" strokeWidth="2.6" strokeLinecap="round" />
      <ellipse cx="40" cy="35" rx="10" ry="3.5" fill="#4a3a2c" />
      <g fill={c} stroke={INK} strokeWidth="1">
        <circle cx="34" cy="30" r="6" />
        <circle cx="46" cy="29" r="6.5" />
        <circle cx="40" cy="24" r="7.5" />
        <circle cx="40" cy="33" r="5.5" stroke="none" />
      </g>
      <g fill={c} fillOpacity="0.6" stroke="none">
        <circle cx="27" cy="22" r="1.6" /><circle cx="53" cy="20" r="1.4" /><circle cx="31" cy="15" r="1.2" /><circle cx="49" cy="13" r="1.1" />
      </g>
    </g>
  ),
  cauldron: c => (
    <g stroke={INK} strokeWidth="1.3">
      <path d="M24 66l-3 7M56 66l3 7" strokeWidth="3" />
      <path d="M18 36c0 22 10 33 22 33s22-11 22-33Z" fill={c} />
      <ellipse cx="40" cy="36" rx="23" ry="7" fill="#2e3033" />
      <ellipse cx="40" cy="37" rx="18" ry="4.5" fill="#6f8f4f" />
      <path d="M22 46c4 3 10 4 18 4" fill="none" stroke={SHINE} strokeOpacity="0.4" strokeWidth="2" />
    </g>
  ),
  jar: c => (
    <g stroke={INK} strokeWidth="1.3">
      <rect x="20" y="33" width="40" height="36" rx="7" fill={c} />
      <rect x="18" y="23" width="44" height="12" rx="4" fill="#8a6b3e" />
      <rect x="27" y="43" width="26" height="16" rx="2" fill="#efe4c9" />
      <path d="M24 38v24" stroke={SHINE} strokeWidth="2" strokeLinecap="round" />
    </g>
  ),
  pillBottle: c => (
    <g stroke={INK} strokeWidth="1.3">
      <path d="M28 20h24v6c5 2 8 6 8 11v30c0 4-3 6-6 6H26c-3 0-6-2-6-6V37c0-5 3-9 8-11Z" fill={c} />
      <rect x="26" y="11" width="28" height="10" rx="2" fill="#d9d2c3" />
      <path d="M25 36v26" stroke={SHINE} strokeWidth="2" strokeLinecap="round" />
    </g>
  ),
  holedPot: c => (
    <g stroke={INK} strokeWidth="1.3">
      <path d="M22 31h36l-4 37c0 3-3 5-6 5H32c-3 0-6-2-6-5Z" fill={c} />
      <rect x="19" y="25" width="42" height="8" rx="3" fill="#4f5a2b" />
      {[[32, 44], [46, 42], [39, 54], [30, 60], [48, 58]].map(([x, y]) => (
        <circle key={`${x}${y}`} cx={x} cy={y} r="3" fill="#1c1f0e" />
      ))}
    </g>
  ),
  chest: c => (
    <g stroke={INK} strokeWidth="1.3">
      <path d="M12 36h56v32H12Z" fill={c} />
      <path d="M12 36c0-10 8-18 28-18s28 8 28 18Z" fill="#7a4f26" />
      <path d="M12 46h56M40 18v50" stroke="#c99a46" strokeWidth="3" />
      <rect x="34" y="40" width="12" height="12" rx="2" fill="#e6c071" />
    </g>
  ),
  case: c => (
    <g stroke={INK} strokeWidth="1.3">
      <path d="M31 30v-6c0-2 2-4 4-4h10c2 0 4 2 4 4v6" fill="none" strokeWidth="3" />
      <rect x="12" y="30" width="56" height="36" rx="5" fill={c} />
      <path d="M12 40h56" stroke="#d4a94e" strokeWidth="2" />
      <rect x="18" y="62" width="44" height="5" rx="1" fill="#3a2a1a" />
    </g>
  ),
}

const MARKS: Record<Mark, (c: string, v: Vessel) => ReactNode> = {
  none: () => null,
  swirl: () => <path d="M32 58c3-7 13-7 15-1s-9 9-11 3 6-6 7-2" fill="none" stroke="#fff" strokeOpacity="0.75" strokeWidth="1.8" strokeLinecap="round" />,
  bubbles: (_, v) => {
    const y = v === 'cauldron' ? -18 : 0
    return (
      <g fill="#fff" fillOpacity="0.85">
        <circle cx="35" cy={58 + y} r="2.4" />
        <circle cx="44" cy={52 + y} r="1.8" />
        <circle cx="40" cy={46 + y} r="1.3" />
        <circle cx="47" cy={61 + y} r="1.5" />
      </g>
    )
  },
  crystal: () => <path d="M40 45l7 9-7 13-7-13Z M33 54h14" fill="#e8f4ff" fillOpacity="0.9" stroke={INK} strokeWidth="1" strokeLinejoin="round" />,
  drip: c => <path d="M52 34c3 5 3 9 0 11-3-2-3-6 0-11Z" fill={c} stroke={INK} strokeWidth="1" />,
  leech: () => <path d="M32 59c3-5 6 5 9 0s6 5 9 0" fill="none" stroke="#2a0a10" strokeWidth="3.2" strokeLinecap="round" />,
  spores: (_, v) => {
    const y = v === 'jar' ? -12 : 0
    return (
      <g fill="#2f3d14" fillOpacity="0.75">
        {[[34, 60], [42, 56], [47, 63], [38, 66], [45, 50]].map(([x, yy]) => <circle key={`${x}${yy}`} cx={x} cy={yy + y} r="1.7" />)}
      </g>
    )
  },
  flake: () => <path d="M33 56l5-4 3 5-6 2Z M43 60l5-2 1 5-5 1Z" fill="#f3dcc0" stroke={INK} strokeWidth="0.8" />,
  eye: () => (
    <g stroke={INK} strokeWidth="1">
      <path d="M30 54c6-7 14-7 20 0-6 7-14 7-20 0Z" fill="#f2e6ff" />
      <circle cx="40" cy="54" r="3.4" fill="#3a0f55" />
    </g>
  ),
  target: () => (
    <g fill="none" stroke="#2a2a08" strokeWidth="1.4">
      <circle cx="40" cy="53" r="6" />
      <circle cx="40" cy="53" r="2.2" fill="#2a2a08" />
    </g>
  ),
  helix: () => (
    <g fill="none" stroke="#e8fffb" strokeWidth="1.8" strokeLinecap="round" transform="translate(0 -8)">
      <path d="M33 30c4 4 10 4 14 8" />
      <path d="M47 30c-4 4-10 4-14 8" />
    </g>
  ),
  bone: () => (
    <g transform="translate(4 -6) rotate(-25 50 30)" fill="#f2ead8" stroke={INK} strokeWidth="1.2">
      <path d="M47 18h6v22h-6Z" />
      <circle cx="47" cy="18" r="3.4" /><circle cx="53" cy="18" r="3.4" />
      <circle cx="47" cy="40" r="3.4" /><circle cx="53" cy="40" r="3.4" />
    </g>
  ),
  sprout: () => (
    <g stroke={INK} strokeWidth="1.1">
      <path d="M40 38V24" stroke="#2f6b24" strokeWidth="2" />
      <path d="M40 28c-8-1-11-7-10-10 6 0 10 4 10 10Z" fill="#7fd06a" />
      <path d="M40 25c6-3 10-1 11 2-4 3-8 3-11-2Z" fill="#5fb84c" />
    </g>
  ),
  shells: () => (
    <g fill="#fffaf0" stroke={INK} strokeWidth="1" transform="translate(0 -6)">
      <path d="M30 34l6-5 2 6Z" /><path d="M44 31l7 2-4 5Z" /><path d="M38 27l4-3 1 5Z" />
    </g>
  ),
  smoke: () => <path d="M33 18c-3-4 2-7-1-11M41 16c-3-5 3-8 0-13M49 18c-3-4 2-7 0-10" fill="none" stroke="#fff" strokeOpacity="0.55" strokeWidth="2" strokeLinecap="round" />,
  rope: () => <path d="M50 42c5 3 7 9 4 14M50 42c3 5 2 10-2 13" fill="none" stroke="#4a3a2c" strokeWidth="2" strokeLinecap="round" />,
  cross: (_, v) =>
    v === 'case' ? (
      <path d="M36 44h8v6h6v8h-6v6h-8v-6h-6v-8h6Z" fill="#e8e1d2" stroke={INK} strokeWidth="1" transform="translate(0 -2) scale(1 0.9)" />
    ) : (
      <path d="M38 46h4v4h4v4h-4v4h-4v-4h-4v-4h4Z" fill="#c0303a" />
    ),
  capsule: () => (
    <g transform="rotate(-30 40 50)" stroke={INK} strokeWidth="1.2">
      <rect x="28" y="45" width="24" height="11" rx="5.5" fill="#f2efe8" />
      <rect x="40" y="45" width="12" height="11" rx="5.5" fill="#e0353f" />
    </g>
  ),
  glow: (_, v) => (
    <g stroke="#fff4c2" strokeOpacity="0.8" strokeWidth="2" strokeLinecap="round">
      {(v === 'teardrop' ? [[12, 40, 6, 40], [68, 40, 74, 40], [18, 20, 13, 15], [62, 20, 67, 15]] : [[14, 52, 8, 52], [66, 52, 72, 52], [20, 34, 15, 29], [60, 34, 65, 29]]).map(([a, b, c, d]) => (
        <path key={`${a}${b}`} d={`M${a} ${b}L${c} ${d}`} />
      ))}
    </g>
  ),
  fly: () => (
    <g transform="translate(58 18)">
      <ellipse cx="0" cy="0" rx="3.2" ry="2.2" fill="#1c1c1c" />
      <ellipse cx="-2" cy="-3" rx="3" ry="1.8" fill="#dfe8ef" fillOpacity="0.8" />
      <ellipse cx="2" cy="-3" rx="3" ry="1.8" fill="#dfe8ef" fillOpacity="0.8" />
    </g>
  ),
}

// ---------------------------------------------------------------- instruments

const STEEL = '#c9ccd3'
const LEATHER = '#6b4424'
const FLESH = '#c8737a'
const VIOLET = '#8a63c9'

const TOOLS: Record<string, ReactNode> = {
  cocoon: (
    <g stroke={INK} strokeWidth="1.3">
      <ellipse cx="40" cy="44" rx="16" ry="27" fill={VIOLET} />
      <path d="M40 22c-3 6-3 14 0 18 3-4 3-12 0-18Z M40 40v24 M34 46l6 6 6-6" fill="#3a2460" stroke="#3a2460" strokeWidth="2" />
      <path d="M27 34c5 3 21 3 26 0M26 46c6 3 22 3 28 0M28 58c5 3 19 3 24 0" fill="none" stroke="#5b3f8f" />
    </g>
  ),
  eggSac: (
    <g stroke={INK} strokeWidth="1.3">
      <ellipse cx="40" cy="44" rx="22" ry="26" fill="#9a7fd6" />
      <path d="M30 26c4 12 0 24 6 36M48 22c-4 14 4 26-2 42M24 44c10-4 22 4 32-2" fill="none" stroke="#e6dcff" strokeOpacity="0.8" strokeWidth="1.5" />
    </g>
  ),
  brain: (
    <g stroke={INK} strokeWidth="1.3">
      <path d="M20 44c-4-14 8-24 18-21 4-6 18-5 21 4 9 2 11 15 5 21 2 9-9 15-16 11-6 6-18 4-20-3-7 0-11-6-8-12Z" fill="#e3a3ab" />
      <path d="M40 24v42M28 36c4 2 6 6 4 10M50 34c-3 3-3 8 0 11M30 54c4 0 7-2 8-5M50 56c-4-1-6-4-6-7" fill="none" stroke="#9c4f5a" strokeWidth="1.6" />
    </g>
  ),
  gland: (
    <g stroke={INK} strokeWidth="1.3">
      <path d="M40 14v14" stroke="#9c4f5a" strokeWidth="4" strokeLinecap="round" />
      <path d="M40 28c16 0 22 12 18 24-4 13-14 18-18 18s-14-5-18-18c-4-12 2-24 18-24Z" fill={FLESH} />
      <path d="M31 40c4 6 14 6 18 0" fill="none" stroke="#f3c6cb" strokeWidth="2" strokeLinecap="round" />
    </g>
  ),
  bones: (
    <g fill="#efe6d2" stroke={INK} strokeWidth="1.3">
      <path d="M22 60l30-34 6 5-30 34Z" />
      <circle cx="21" cy="64" r="5" /><circle cx="27" cy="68" r="5" /><circle cx="53" cy="22" r="5" /><circle cx="59" cy="28" r="5" />
      <path d="M30 34l26 28" stroke={INK} strokeWidth="7" strokeLinecap="round" />
      <path d="M30 34l26 28" stroke="#efe6d2" strokeWidth="4.5" strokeLinecap="round" />
      <rect x="35" y="38" width="10" height="10" rx="3" fill="#b9a988" transform="rotate(45 40 43)" />
    </g>
  ),
  claw: (
    <g stroke={INK} strokeWidth="1.3">
      {[[24, -10], [40, 0], [56, 10]].map(([x, lean]) => (
        <path key={x} d={`M${x - 5} 58C${x - 5} 44 ${x - 2 + lean / 2} 30 ${x + lean} 16C${x + 3 + lean / 2} 30 ${x + 5} 44 ${x + 5} 58Z`} fill="#ece2c9" />
      ))}
      <path d="M16 58c6-5 42-5 48 0 0 9-10 14-24 14S16 67 16 58Z" fill="#5a3b2a" />
    </g>
  ),
  sprout: (
    <g stroke={INK} strokeWidth="1.3" fill={VIOLET}>
      <circle cx="40" cy="48" r="17" />
      <circle cx="28" cy="38" r="9" /><circle cx="52" cy="38" r="9" /><circle cx="40" cy="30" r="9" />
      <circle cx="27" cy="56" r="8" /><circle cx="53" cy="56" r="8" />
      <circle cx="40" cy="48" r="5" fill="#c2a6f0" />
    </g>
  ),
  liver: (
    <g stroke={INK} strokeWidth="1.3">
      <path d="M14 40c2-12 22-14 36-12 12 2 18 8 16 16-3 12-16 20-28 22-10 2-26-6-24-26Z" fill="#8f2f34" />
      {[[30, 42, 4], [44, 48, 3], [52, 38, 2.5], [36, 56, 3]].map(([x, y, r]) => <circle key={`${x}${y}`} cx={x} cy={y} r={r} fill="#d0a144" stroke="none" />)}
    </g>
  ),
  eggCluster: (
    <g stroke={INK} strokeWidth="1.2" fill="#f2e7b8">
      {[[30, 40], [44, 36], [52, 50], [38, 54], [24, 54], [46, 64], [32, 66]].map(([x, y]) => (
        <ellipse key={`${x}${y}`} cx={x} cy={y} rx="8" ry="9.5" />
      ))}
    </g>
  ),
  cortex: (
    <g stroke={INK} strokeWidth="1.3">
      <path d="M16 54c-2-18 12-30 28-30 14 0 22 10 21 22-1 14-12 22-26 22-12 0-21-5-23-14Z" fill="#8a4b3a" />
      <path d="M22 50c6-4 10 4 16 0s10 4 16 0M24 40c5-3 9 3 14 0s8 3 14 0M26 60c5-3 9 3 14 0s8 3 12 0" fill="none" stroke="#c98a72" strokeWidth="2" />
    </g>
  ),
  garrote: (
    <g fill="none" stroke={INK} strokeWidth="1.3">
      <ellipse cx="40" cy="46" rx="22" ry="14" stroke="#3a2a1c" strokeWidth="4.5" />
      <ellipse cx="40" cy="46" rx="15" ry="9" stroke="#4a3624" strokeWidth="4" />
      <rect x="54" y="18" width="8" height="16" rx="3" fill={LEATHER} transform="rotate(30 58 26)" />
      <path d="M58 32c-2 6-4 10-8 14" stroke="#3a2a1c" strokeWidth="3" />
    </g>
  ),
  spine: (
    <g stroke={INK} strokeWidth="1.2" fill="#ece2c9">
      {[[24, 66], [30, 56], [38, 47], [46, 40], [52, 31], [56, 21]].map(([x, y], i) => (
        <g key={i} transform={`rotate(${-35 + i * 6} ${x} ${y})`}>
          <rect x={x - 7} y={y - 4} width="14" height="8" rx="3" />
          <path d={`M${x} ${y - 4}v-4`} strokeWidth="2.5" />
        </g>
      ))}
    </g>
  ),
  strap: (
    <g stroke={INK} strokeWidth="1.3" transform="rotate(-18 40 44)">
      <rect x="12" y="34" width="56" height="20" rx="4" fill={LEATHER} />
      <path d="M16 38h48M16 50h48" stroke="#c9a67a" strokeDasharray="3 3" />
    </g>
  ),
  needle: (
    <g fill="none" stroke={INK} strokeWidth="1.3">
      <path d="M50 14c-14 10-16 28-6 44" stroke={STEEL} strokeWidth="3.5" strokeLinecap="round" />
      <circle cx="50" cy="14" r="2.5" fill="#fff" />
      <path d="M50 14c-20 4-28 18-18 28s4 24-12 26" stroke="#7a4f3a" strokeWidth="1.8" />
    </g>
  ),
  saw: (
    <g stroke={INK} strokeWidth="1.3">
      <path d="M16 30l40 0 0 16-40 6Z" fill={STEEL} />
      <path d="M16 52l3-5 3 4 3-5 3 4 3-5 3 4 3-5 3 4 3-5 3 4 3-5 3 4" fill="none" stroke="#6f737c" />
      <path d="M56 26h10c2 0 4 2 4 4v14c0 2-2 4-4 4H56Z" fill="#5a3b24" />
      <circle cx="61" cy="37" r="2.5" fill="#1d1410" />
    </g>
  ),
  nail: (
    <g stroke={INK} strokeWidth="1.3">
      <path d="M14 70 52 32l6 6-38 38Z" fill={STEEL} />
      <path d="M48 24l16 0 2 8-8 8-8 0Z" fill="#8d929b" />
    </g>
  ),
  scraper: (
    <g stroke={INK} strokeWidth="1.3">
      <path d="M52 14c8 10 6 26-6 34l-6-6c8-6 12-16 12-28Z" fill={STEEL} />
      <path d="M40 42l6 6-20 20c-2 2-5 2-7 0l1-1c-2-2-2-5 0-7Z" fill="#3a2a1c" />
    </g>
  ),
  file: (
    <g stroke={INK} strokeWidth="1.3" transform="rotate(-35 40 40)">
      <rect x="34" y="8" width="12" height="44" rx="2" fill="#9aa0a8" />
      <path d="M34 14l12 4M34 20l12 4M34 26l12 4M34 32l12 4M34 38l12 4M34 44l12 4" stroke="#5f646c" />
      <rect x="36" y="52" width="8" height="22" rx="3" fill="#5a3b24" />
    </g>
  ),
  madonna: (
    <g stroke={INK} strokeWidth="1.3">
      <circle cx="40" cy="20" r="11" fill="none" stroke="#e6c071" strokeWidth="2" />
      <path d="M40 18c-8 0-11 8-11 14l-6 38h34l-6-38c0-6-3-14-11-14Z" fill="#7d8a72" />
      <path d="M33 34c4 4 10 4 14 0" fill="none" stroke="#4e5a46" />
      <rect x="20" y="70" width="40" height="5" rx="1" fill="#5b5f63" />
    </g>
  ),
  stinger: (
    <g stroke={INK} strokeWidth="1.3">
      <path d="M58 16 24 64l-4-2 32-50Z" fill="#9fd06a" />
      <path d="M40 40l-8-2M34 48l-8-2M46 32l-8-2" stroke="#3f6b24" strokeWidth="2" />
      <ellipse cx="58" cy="15" rx="8" ry="5" fill="#5f8f3a" transform="rotate(-35 58 15)" />
    </g>
  ),
  buckle: (
    <g stroke={INK} strokeWidth="1.3">
      <path d="M8 34h64v16H8Z" fill="#a8743f" />
      <path d="M12 38h56M12 46h56" stroke="#e1c08a" strokeDasharray="3 3" />
      <rect x="30" y="28" width="20" height="28" rx="3" fill="none" stroke="#c9a24e" strokeWidth="4" />
      <path d="M40 28v28" stroke="#c9a24e" strokeWidth="3" />
    </g>
  ),
  retractor: (
    <g fill="none" stroke={INK} strokeWidth="1.3">
      <path d="M18 40c8-12 36-12 44 0-8 12-36 12-44 0Z" fill="#f4ece2" />
      <circle cx="40" cy="40" r="6" fill="#3b6aa0" />
      <circle cx="40" cy="40" r="2.5" fill="#111" />
      <path d="M22 30c-6-8-6-16 2-18M58 30c6-8 6-16-2-18M22 50c-6 8-6 16 2 18M58 50c6 8 6 16-2 18" stroke={STEEL} strokeWidth="3" />
    </g>
  ),
  beak: (
    <g stroke={INK} strokeWidth="1.3">
      <path d="M18 34c6-14 26-16 36-6 10 2 16 10 16 16-10-4-22-2-30 6-10 2-20-4-22-16Z" fill="#3a3530" />
      <path d="M40 50c10-6 22-6 30-4-6 6-18 10-30 8Z" fill="#2a2622" />
      <circle cx="30" cy="34" r="4" fill="#d24a3a" />
    </g>
  ),
  toggle: (
    <g fill="none" stroke={INK} strokeWidth="1.3">
      <circle cx="38" cy="44" r="20" stroke="#4a3624" strokeWidth="5" />
      <circle cx="38" cy="44" r="13" stroke="#5c4430" strokeWidth="4" />
      <rect x="52" y="18" width="20" height="7" rx="3.5" fill="#8a6b3e" transform="rotate(35 62 21)" />
    </g>
  ),
  butterfly: (
    <g stroke={INK} strokeWidth="1.3">
      <path d="M38 34C26 14 10 14 8 24c-2 10 12 16 28 14Z" fill="#6b5640" />
      <path d="M42 34c12-20 28-20 30-10 2 10-12 16-28 14Z" fill="#6b5640" />
      <path d="M38 40c-12 4-20 14-14 20 6 4 12-6 14-14ZM42 40c12 4 20 14 14 20-6 4-12-6-14-14Z" fill="#54432f" />
      <path d="M40 22v26" stroke="#2a2118" strokeWidth="3" />
      <circle cx="40" cy="56" r="11" fill="#8a4fc4" />
      <circle cx="36" cy="52" r="3" fill="#c9a3e8" stroke="none" />
    </g>
  ),
}
