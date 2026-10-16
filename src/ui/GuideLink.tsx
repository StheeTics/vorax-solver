import { GUIDE_URL } from './links'

/** Opens the Optimal Play guide in a new tab, so a run in progress isn't lost. */
export function GuideLink({ className }: { className?: string }) {
  return (
    <a className={className} href={GUIDE_URL} target="_blank" rel="noopener noreferrer">
      Optimal Play
    </a>
  )
}
