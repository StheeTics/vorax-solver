import { ISSUES_URL } from './links'

export function IssueLink({ className }: { className?: string }) {
  return (
    <a className={className} href={ISSUES_URL} target="_blank" rel="noopener noreferrer">
      Report an issue
    </a>
  )
}
