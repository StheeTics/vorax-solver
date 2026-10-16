import { renderGuide, slug } from '@/guide/render'
import guideMd from '../../OPTIMAL_PLAY.md?raw'

it('slugs headings like GitHub, so the contents links work', () => {
  expect(slug('Pest (best archetype)')).toBe('pest-best-archetype')
  expect(slug('Rules that apply to every run')).toBe('rules-that-apply-to-every-run')
})

it('renders the guide with heading ids, tables and working in-page links', () => {
  const html = renderGuide(guideMd)
  const doc = new DOMParser().parseFromString(html, 'text/html')
  expect(doc.querySelector('h1')?.textContent).toBe('Optimal Play')
  expect(doc.querySelectorAll('table').length).toBeGreaterThanOrEqual(1)
  for (const a of doc.querySelectorAll('a[href^="#"]')) {
    expect(doc.getElementById(a.getAttribute('href')!.slice(1)), a.getAttribute('href')!).not.toBeNull()
  }
})
