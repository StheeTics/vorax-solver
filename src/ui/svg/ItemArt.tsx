import type { ItemKind } from '@/data/defs'

type Kind = ItemKind | 'instrument'

/** Card illustration per item type. */
export function ItemArt({ item, size = 76 }: { item: Kind; size?: number }) {
  return (
    <svg data-item={item} width={size} height={size} viewBox="0 0 80 80" aria-hidden="true" style={{ filter: 'drop-shadow(0 4px 6px rgb(0 0 0 / 0.6))' }}>
      <defs>
        <linearGradient id="glassG" x1="0" x2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.15" />
          <stop offset="0.3" stopColor="#fff" stopOpacity="0.45" />
          <stop offset="1" stopColor="#fff" stopOpacity="0.08" />
        </linearGradient>
        <radialGradient id="amber" cx="45%" cy="40%" r="65%">
          <stop offset="0" stopColor="#ffe08a" />
          <stop offset="0.5" stopColor="#e07a1f" />
          <stop offset="1" stopColor="#7a2b06" />
        </radialGradient>
        <linearGradient id="milk" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f4f1ea" />
          <stop offset="1" stopColor="#b9b2a3" />
        </linearGradient>
        <linearGradient id="wood" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#9a6a3a" />
          <stop offset="1" stopColor="#4a2d12" />
        </linearGradient>
        <linearGradient id="steel" x1="0" x2="1">
          <stop offset="0" stopColor="#8d929b" />
          <stop offset="0.5" stopColor="#e6e9ee" />
          <stop offset="1" stopColor="#6b7078" />
        </linearGradient>
      </defs>
      {ART[item]}
    </svg>
  )
}

const cork = (x: number, y: number, w: number) => (
  <rect x={x} y={y} width={w} height="9" rx="2" fill="#a97b4a" stroke="#3b2510" />
)

const ART: Record<Kind, JSX.Element> = {
  tincture: (
    <g stroke="#2a1608" strokeWidth="1.2">
      <path d="M33 14h14v16c10 4 16 12 16 22 0 13-10 22-23 22S17 65 17 52c0-10 6-18 16-22Z" fill="url(#amber)" />
      <path d="M33 14h14v16c10 4 16 12 16 22 0 13-10 22-23 22S17 65 17 52c0-10 6-18 16-22Z" fill="url(#glassG)" />
      {cork(31, 7, 18)}
      <ellipse cx="32" cy="46" rx="4" ry="8" fill="#fff" opacity="0.35" stroke="none" />
    </g>
  ),
  solution: (
    <g stroke="#2a2420" strokeWidth="1.2">
      <path d="M30 18h20v44c0 6-4 12-10 12s-10-6-10-12Z" fill="#d8d4cc" opacity="0.25" />
      <path d="M30 36h20v26c0 6-4 12-10 12s-10-6-10-12Z" fill="url(#milk)" />
      <path d="M30 18h20v44c0 6-4 12-10 12s-10-6-10-12Z" fill="url(#glassG)" />
      <rect x="27" y="14" width="26" height="5" rx="2" fill="#7c776f" />
      {cork(32, 6, 16)}
    </g>
  ),
  powder: (
    <g stroke="#2b1c0d" strokeWidth="1.2">
      <path d="M22 34c-6 10-6 26 4 34 8 6 20 6 28 0 10-8 10-24 4-34Z" fill="#c9b48e" />
      <path d="M22 34c4-4 10-6 18-6s14 2 18 6c-6 3-12 4-18 4s-12-1-18-4Z" fill="#e8dcc4" />
      <path d="M26 30c2-8 8-14 14-16 6 2 12 8 14 16" fill="none" stroke="#7a5a2c" strokeWidth="2.5" />
      <path d="M34 22 30 12M46 22l4-10" stroke="#7a5a2c" strokeWidth="2" />
      <circle cx="58" cy="62" r="2" fill="#e8dcc4" />
      <circle cx="63" cy="57" r="1.4" fill="#e8dcc4" />
    </g>
  ),
  ointment: (
    <g stroke="#1e1a14" strokeWidth="1.2">
      <rect x="18" y="34" width="44" height="34" rx="6" fill="#5b7a6a" />
      <rect x="18" y="34" width="44" height="34" rx="6" fill="url(#glassG)" />
      <rect x="15" y="24" width="50" height="12" rx="4" fill="#8a6b3e" />
      <rect x="26" y="44" width="28" height="14" rx="2" fill="#efe4c9" />
      <path d="M30 51h20" stroke="#8a2a1a" strokeWidth="2" />
    </g>
  ),
  pill: (
    <g stroke="#2a0a10" strokeWidth="1.2">
      <path d="M28 18h24v6c5 2 8 6 8 11v32c0 4-3 6-6 6H26c-3 0-6-2-6-6V35c0-5 3-9 8-11Z" fill="#7d1220" />
      <path d="M28 18h24v6c5 2 8 6 8 11v32c0 4-3 6-6 6H26c-3 0-6-2-6-6V35c0-5 3-9 8-11Z" fill="url(#glassG)" />
      <rect x="26" y="10" width="28" height="9" rx="2" fill="#d9d2c3" />
      <g transform="rotate(-30 40 50)">
        <rect x="28" y="44" width="24" height="11" rx="5.5" fill="#f2efe8" />
        <path d="M40 44v11" stroke="#2a0a10" />
        <rect x="40" y="44" width="12" height="11" rx="5.5" fill="#e0353f" />
      </g>
    </g>
  ),
  box: (
    <g stroke="#24150a" strokeWidth="1.3">
      <path d="M12 34h56v34H12Z" fill="url(#wood)" />
      <path d="M12 34c0-10 8-18 28-18s28 8 28 18Z" fill="#7a4f26" />
      <path d="M12 44h56M40 16v52" stroke="#c99a46" strokeWidth="3" />
      <rect x="34" y="38" width="12" height="12" rx="2" fill="#e6c071" />
      <circle cx="40" cy="44" r="2" fill="#3b2408" stroke="none" />
    </g>
  ),
  instrument: (
    <g stroke="#1f2126" strokeWidth="1.2">
      <path d="M14 70 52 32l6 6-38 38Z" fill="url(#steel)" />
      <path d="M52 32 66 14c3-3 8 2 5 5L58 38Z" fill="#5c4527" />
      <path d="M14 70 30 54" stroke="#fff" strokeOpacity="0.6" />
      <circle cx="62" cy="22" r="2" fill="#c9a24e" />
    </g>
  ),
}
