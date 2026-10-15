import type { VialTier } from '@/engine/rewards'

const FILL: Record<Exclude<VialTier, 'rainbow'>, [string, string]> = {
  white: ['#f4f1ea', '#9c968c'],
  purple: ['#d6a6ff', '#7a2fd0'],
  red: ['#ff8a8a', '#c0101e'],
}

/** Antidote vial, tinted by reward tier. */
export function Vial({ tier, size = 26 }: { tier: VialTier; size?: number }) {
  const id = `vial-${tier}`
  return (
    <svg data-tier={tier} width={size * 0.6} height={size} viewBox="0 0 12 20" aria-label={`${tier} vial`} role="img">
      <defs>
        {tier === 'rainbow' ? (
          <linearGradient id={id} x1="0" y1="0" x2="0.4" y2="1">
            <stop offset="0" stopColor="#ff5a5a" />
            <stop offset="0.25" stopColor="#ffd84a" />
            <stop offset="0.5" stopColor="#4cff8a" />
            <stop offset="0.75" stopColor="#4fb0ff" />
            <stop offset="1" stopColor="#c45bff" />
          </linearGradient>
        ) : (
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={FILL[tier][0]} />
            <stop offset="1" stopColor={FILL[tier][1]} />
          </linearGradient>
        )}
      </defs>
      <g transform="rotate(25 6 10)">
        <rect x="3.5" y="1" width="5" height="3" rx="1" fill="#3a2a1a" />
        <path d="M3 4h6v11a3 3 0 0 1-6 0Z" fill={`url(#${id})`} stroke="#1a0a0c" strokeWidth="0.8" />
        <path d="M4.3 6v7" stroke="#fff" strokeOpacity="0.55" strokeWidth="0.9" strokeLinecap="round" />
      </g>
    </svg>
  )
}
