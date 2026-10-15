import type { Archetype } from '@/engine/types'

interface IconProps {
  size?: number
  className?: string
}

export function HeartIcon({ size = 14, className }: IconProps) {
  return (
    <svg data-icon="heart" className={className} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ verticalAlign: '-0.15em' }}>
      <defs>
        <radialGradient id="heart-g" cx="40%" cy="35%" r="70%">
          <stop offset="0" stopColor="#ff9a9a" />
          <stop offset="0.45" stopColor="#e3232f" />
          <stop offset="1" stopColor="#6d0710" />
        </radialGradient>
      </defs>
      <path d="M12 21.5 3.6 13.4A5.3 5.3 0 0 1 12 6.6a5.3 5.3 0 0 1 8.4 6.8Z" fill="url(#heart-g)" stroke="#2b0306" strokeWidth="1" />
      <path d="M8 8.6c-1.5.3-2.6 1.6-2.6 3" stroke="#ffd0d0" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.7" />
    </svg>
  )
}

/** Quantity: a small swarm of curled grubs piled diagonally (as in-game), light grey on dark gaps. */
export function QuantityIcon({ size = 14, className }: IconProps) {
  // one curled grub: fat head end, tapering curled tail
  const grub = 'M0 0c3.6-2.2 7.4-.6 7.2 2.6-.2 2.6-3.4 3.4-5.4 2.2.6 1.6 2.8 2 3.6 1.2-1.2 2.2-5 2-6.4-.4C-1.8 3.8-1.4 1.2 0 0Z'
  return (
    <svg data-icon="quantity" data-shape="swarm" className={className} width={size * 1.1} height={size} viewBox="0 0 22 20" aria-hidden="true" style={{ verticalAlign: '-0.15em' }}>
      <g fill="#e2e4ea" stroke="#14161c" strokeWidth="0.9" strokeLinejoin="round">
        {[[3, 3, -20], [11, 2, 10], [4, 10, 15], [12, 10, -10]].map(([x, y, r], i) => (
          <path key={i} data-part="grub" d={grub} transform={`translate(${x} ${y}) rotate(${r} 3.5 3) scale(1.05)`} fill={i === 1 ? '#ffffff' : '#e2e4ea'} />
        ))}
      </g>
    </svg>
  )
}

/** At-a-glance archetype colors (icons everywhere; names on cards). */
export const ARCHETYPE_COLORS: Record<Archetype, string> = {
  pest: '#b07cff',
  boneSentry: '#f2c94c',
  aemberon: '#4f9dff',
  agito: '#ff4d4d',
}

const ARCHETYPE_GLYPHS: Record<Archetype, JSX.Element> = {
  // moth wings
  pest: (
    <path d="M12 7v10M12 9c-2-4-7-4-7 0 0 3 4 4 7 3m0-3c2-4 7-4 7 0 0 3-4 4-7 3m0 0c-2 1-5 2-4 5m4-5c2 1 5 2 4 5" fill="none" strokeWidth="1.6" strokeLinecap="round" />
  ),
  // horns
  aemberon: (
    <path d="M7 6c-1 3 0 6 2 7m8-7c1 3 0 6-2 7M9 13a3 3 0 0 0 6 0M8.5 17h7" fill="none" strokeWidth="1.8" strokeLinecap="round" />
  ),
  // skull
  boneSentry: (
    <g fill="none" strokeWidth="1.6" strokeLinecap="round">
      <path d="M7 12a5 5 0 1 1 10 0v2.5l-1.5 1v2h-7v-2L7 14.5Z" />
      <circle cx="10" cy="12" r="1.2" />
      <circle cx="14" cy="12" r="1.2" />
    </g>
  ),
  // eye
  agito: (
    <g fill="none" strokeWidth="1.6">
      <path d="M4.5 12c4-5.5 11-5.5 15 0-4 5.5-11 5.5-15 0Z" />
      <circle cx="12" cy="12" r="2.3" />
    </g>
  ),
}

export function ArchetypeIcon({ archetype, size = 14, className }: IconProps & { archetype: Archetype }) {
  const color = ARCHETYPE_COLORS[archetype]
  return (
    <svg data-icon="archetype" data-archetype={archetype} className={className} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ verticalAlign: '-0.18em' }}>
      <circle cx="12" cy="12" r="11" fill="#14090b" stroke={color} strokeWidth="1.4" />
      <g stroke={color}>{ARCHETYPE_GLYPHS[archetype]}</g>
    </svg>
  )
}

export function DiceIcon({ size = 22, className }: IconProps) {
  return (
    <svg data-icon="dice" className={className} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="4" fill="#f3e6c8" stroke="#6b4c1c" strokeWidth="1.4" />
      {[[8, 8], [16, 8], [12, 12], [8, 16], [16, 16]].map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1.7" fill="#4a2e0c" />
      ))}
    </svg>
  )
}

export function InstrumentIcon({ size = 18, className }: IconProps) {
  return (
    <svg data-icon="instrument" className={className} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ verticalAlign: '-0.2em' }}>
      <path d="M3 21 14.5 9.5l2 2L5 23Z" fill="#c9ccd3" stroke="#2a2c31" strokeWidth="0.8" />
      <path d="M14.5 9.5 20 4c1-1 2.5.5 1.5 1.5L16.5 11.5Z" fill="#8a6a3a" stroke="#2a1d0a" strokeWidth="0.8" />
    </svg>
  )
}
