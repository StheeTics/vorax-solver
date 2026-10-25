import { act, fireEvent } from '@testing-library/react'
import { linkCardNames } from '@/guide/cardLinks'
import { attachCardPreviews, placePreview } from '@/guide/CardPreview'
import { renderGuide } from '@/guide/render'
import guideMd from '../../OPTIMAL_PLAY.md?raw'

function page(html: string) {
  const root = document.createElement('main')
  root.innerHTML = html
  document.body.append(root)
  linkCardNames(root)
  return root
}

const refs = (root: HTMLElement) => [...root.querySelectorAll('.card-ref')].map(e => e.textContent)

it('links card names, preferring the longest name and skipping generic plurals', () => {
  const root = page('<p>Potent Xenopurge Powder, Targeted Xeno-Hormone, Xeno-Hormones and <strong>Lady of the Plague Quarter</strong>.</p>')
  expect(refs(root)).toEqual(['Potent Xenopurge Powder', 'Targeted Xeno-Hormone', 'Lady of the Plague Quarter'])
  expect(root.textContent).toBe('Potent Xenopurge Powder, Targeted Xeno-Hormone, Xeno-Hormones and Lady of the Plague Quarter.')
})

it('links the cards named in the guide', () => {
  const names = refs(page(renderGuide(guideMd)))
  for (const n of ['Incubation Sac', 'Contracted Claws', 'Beak of the Twice-Born', 'Insect Attractant', 'Anesthetic Tincture - Aemberon']) {
    expect(names).toContain(n)
  }
})

it('shows the in-game card on hover and hides it on leave', () => {
  const root = page('<p>Take Incubation Sac.</p>')
  attachCardPreviews(root)
  const ref = root.querySelector('.card-ref')!
  act(() => fireEvent.mouseOver(ref))
  const preview = document.querySelector('[data-testid="card-preview"]')
  expect(preview?.textContent).toContain('Incubation Sac')
  expect(preview?.textContent).toContain('Surgical Instrument')
  act(() => fireEvent.mouseOut(ref, { relatedTarget: root }))
  expect(document.querySelector('[data-testid="card-preview"]')).toBeNull()
})

it('places the preview beside the name, or below it on narrow screens', () => {
  const size = { width: 200, height: 280 }
  expect(placePreview({ left: 100, top: 300, right: 200, bottom: 320 }, size, { width: 1200, height: 900 })).toEqual({ left: 208, top: 260 })
  expect(placePreview({ left: 100, top: 100, right: 260, bottom: 120 }, size, { width: 375, height: 800 })).toEqual({ left: 80, top: 128 })
})
