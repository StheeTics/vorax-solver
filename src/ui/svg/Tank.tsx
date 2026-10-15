import type { ReactNode } from 'react'
import type { Rarity } from '@/engine/types'
import styles from './Tank.module.css'

interface Props {
  empty: boolean
  glow?: Rarity
  highlighted?: 'selectable' | 'selected'
  children?: ReactNode
}

/** Gothic iron incubation capsule with glowing red glass; children render inside the glass. */
export function Tank({ empty, glow, highlighted, children }: Props) {
  const cls = [styles.tank, highlighted && styles[highlighted], empty && styles.empty].filter(Boolean).join(' ')
  return (
    <div className={cls} data-glow={glow} data-highlight={highlighted}>
      <div className={styles.glass}>
        <div className={styles.liquid} />
        <div className={styles.bubbles}>
          {[12, 30, 55, 72, 88].map((left, i) => (
            <span key={left} style={{ left: `${left}%`, animationDelay: `${i * 1.1}s`, animationDuration: `${5 + (i % 3)}s` }} />
          ))}
        </div>
        <div className={styles.occupant}>{children}</div>
        <div className={styles.shine} />
      </div>
      <svg className={styles.frame} viewBox="0 0 200 330" aria-hidden="true">
        <defs>
          <linearGradient id="iron" x1="0" x2="1">
            <stop offset="0" stopColor="#141316" />
            <stop offset="0.35" stopColor="#4a484e" />
            <stop offset="0.55" stopColor="#2c2b30" />
            <stop offset="1" stopColor="#0e0d10" />
          </linearGradient>
          <linearGradient id="iron-v" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#57545b" />
            <stop offset="1" stopColor="#151417" />
          </linearGradient>
        </defs>
        {/* crown: spires */}
        <g fill="url(#iron-v)" stroke="#07060a" strokeWidth="1.5">
          <path d="M100 0 108 26H92Z" />
          <path d="M62 10 70 34H56Z" />
          <path d="M138 10 144 34H130Z" />
          <path d="M34 26 42 46H28Z" />
          <path d="M166 26 172 46H158Z" />
        </g>
        {/* crown: arched cap */}
        <path d="M18 64C18 34 58 22 100 22S182 34 182 64V76H18Z" fill="url(#iron)" stroke="#07060a" strokeWidth="2" />
        <path d="M30 70C34 46 64 36 100 36S166 46 170 70" fill="none" stroke="#6b686f" strokeWidth="1.5" opacity="0.7" />
        <circle cx="100" cy="50" r="7" fill="#6e0b14" stroke="#1a0205" strokeWidth="2" />
        {/* side pillars */}
        <rect x="10" y="70" width="18" height="198" rx="4" fill="url(#iron)" stroke="#07060a" strokeWidth="2" />
        <rect x="172" y="70" width="18" height="198" rx="4" fill="url(#iron)" stroke="#07060a" strokeWidth="2" />
        {[100, 170, 240].map(y => (
          <g key={y} fill="#5e5b62" stroke="#07060a">
            <rect x="6" y={y} width="26" height="10" rx="2" />
            <rect x="168" y={y} width="26" height="10" rx="2" />
          </g>
        ))}
        {/* base */}
        <path d="M14 262H186L196 300H4Z" fill="url(#iron)" stroke="#07060a" strokeWidth="2" />
        <path d="M0 300H200V318L186 330H14L0 318Z" fill="url(#iron-v)" stroke="#07060a" strokeWidth="2" />
        <path d="M40 300 52 282H148L160 300" fill="none" stroke="#6b686f" strokeWidth="1.2" opacity="0.6" />
      </svg>
      <div className={styles.ring} />
    </div>
  )
}
