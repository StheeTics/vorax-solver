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

const INK = '#14090b'

/** Frameless glyphs based on the in-game archetype icons. */
const ARCHETYPE_GLYPHS: Record<Archetype, { shape: string; art: JSX.Element }> = {
  // purple bug eyeball: a curled shell around a glossy eye
  pest: {
    shape: 'bug-eye',
    art: (
      <g stroke={INK} strokeWidth="1.2" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10.4" fill="#b07cff" fillOpacity="0.25" stroke="none" />
        <circle cx="12" cy="12" r="9.4" fill="#9466d8" />
        <circle cx="12.6" cy="12.6" r="4.4" fill="#1e1030" />
        <path d="M4.6 10.4a7.6 7.6 0 0 1 6-6.2" fill="none" stroke="#efe2ff" strokeWidth="2.6" strokeLinecap="round" />
        <path d="M8.2 12.6a4.4 4.4 0 0 1 2-3.8" fill="none" stroke="#c8a6ff" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M7.2 14.8c-1.4.4-2.6 0-3.2-.8" fill="none" stroke="#5b3a9a" strokeWidth="1.2" strokeLinecap="round" />
      </g>
    ),
  },
  // blue swirling vortex with a dark core
  aemberon: {
    shape: 'vortex',
    art: (
      <g strokeLinecap="round">
        <circle cx="12" cy="12" r="9.6" fill="#4f9dff" stroke={INK} strokeWidth="1.2" />
        <path d="M12 3.4c5 0 8.2 4 7.4 8M20.6 12c0 5-4 8.2-8 7.4M12 20.6c-5 0-8.2-4-7.4-8M3.4 12c0-5 4-8.2 8-7.4" fill="none" stroke="#bfe0ff" strokeWidth="1.5" />
        <path d="M12 7.2c3 0 4.8 2.2 4.4 4.6M16.8 12c0 3-2.2 4.8-4.6 4.4M12 16.8c-3 0-4.8-2.2-4.4-4.6M7.2 12c0-3 2.2-4.8 4.6-4.4" fill="none" stroke="#1d3f8a" strokeWidth="1.6" />
        <circle cx="12" cy="12" r="2.6" fill="#0a1430" />
      </g>
    ),
  },
  // red eye (as in-game): almond eye with short lash rays above and below, on a round red glow
  agito: {
    shape: 'red-eye',
    art: (
      <g strokeLinejoin="round" strokeLinecap="round">
        <circle cx="12" cy="12" r="10.4" fill="#ff4d4d" fillOpacity="0.3" />
        <g stroke="#ff4d4d" strokeWidth="1.5">
          <path d="M12 2.6v3.4M7.4 3.8l1.4 3.2M16.6 3.8l-1.4 3.2M3.8 7l2.4 2M20.2 7l-2.4 2" />
          <path d="M12 21.4V18M7.4 20.2l1.4-3.2M16.6 20.2l-1.4-3.2M3.8 17l2.4-2M20.2 17l-2.4-2" />
        </g>
        <path d="M2 12c4.6-6 15.4-6 20 0-4.6 6-15.4 6-20 0Z" fill="#ffd9d2" stroke={INK} strokeWidth="1.1" />
        <circle cx="12" cy="12" r="4" fill="#e8283a" stroke="#7a0a14" strokeWidth="0.9" />
        <path d="M9.6 12h4.8" stroke="#3a0408" strokeWidth="1.6" />
        <circle cx="10.6" cy="10.6" r="0.9" fill="#ffffff" />
      </g>
    ),
  },
  // yellow knight helmet with a crowned crest and a visor slit
  boneSentry: {
    shape: 'helmet',
    art: (
      <g stroke={INK} strokeWidth="1.2" strokeLinejoin="round">
        <path d="M4.4 8.6 6.2 3l3 3.4L12 2.4l2.8 4 3-3.4 1.8 5.6Z" fill="#f2c94c" />
        <path d="M4.4 8.6h15.2v7.6c0 2.6-3.4 5.4-7.6 5.4s-7.6-2.8-7.6-5.4Z" fill="#f2c94c" />
        <path d="M7.4 12.2h9.2v2.4H7.4Z" fill="#3a2a08" />
        <path d="M12 14.6v5.4" stroke="#a07a1c" />
      </g>
    ),
  },
}

export function ArchetypeIcon({ archetype, size = 14, className }: IconProps & { archetype: Archetype }) {
  const glyph = ARCHETYPE_GLYPHS[archetype]
  return (
    <svg data-icon="archetype" data-archetype={archetype} data-shape={glyph.shape} className={className} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ verticalAlign: '-0.18em', overflow: 'visible' }}>
      {glyph.art}
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
