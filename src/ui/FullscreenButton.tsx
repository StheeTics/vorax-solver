import { useEffect, useState } from 'react'

type LockableOrientation = ScreenOrientation & { lock?: (o: 'landscape') => Promise<void> }

/**
 * Fullscreen toggle, shown only where the browser allows it (not iPhone Safari).
 * On phones it also locks to landscape, so the game shows unrotated with no browser bars.
 */
export function FullscreenButton({ className }: { className?: string }) {
  const [active, setActive] = useState(() => !!document.fullscreenElement)
  useEffect(() => {
    const onChange = () => setActive(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])
  if (!document.fullscreenEnabled) return null

  const toggle = () => {
    if (document.fullscreenElement) {
      void document.exitFullscreen?.()
      return
    }
    document.documentElement
      .requestFullscreen()
      .then(() => (screen.orientation as LockableOrientation | undefined)?.lock?.('landscape'))
      .catch(() => {})
  }

  return (
    <button className={className} style={{ display: 'grid', placeItems: 'center' }} onClick={toggle} aria-label={active ? 'Exit fullscreen' : 'Fullscreen'} title={active ? 'Exit fullscreen' : 'Fullscreen'}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {active ? (
          <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />
        ) : (
          <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
        )}
      </svg>
    </button>
  )
}
