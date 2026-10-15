import { test, expect, type Page } from '@playwright/test'

const errors = new WeakMap<Page, string[]>()
test.beforeEach(async ({ page }) => {
  const list: string[] = []
  errors.set(page, list)
  page.on('pageerror', e => list.push(String(e)))
  page.on('console', m => m.type() === 'error' && list.push(m.text()))
  await page.goto('')
})
test.afterEach(async ({ page }) => expect(errors.get(page)).toEqual([]))

const viewport = (page: Page) => page.viewportSize()!

async function inViewport(page: Page, selector: string) {
  const box = (await page.locator(selector).boundingBox())!
  const { width, height } = viewport(page)
  expect(box.x).toBeGreaterThanOrEqual(-1)
  expect(box.y).toBeGreaterThanOrEqual(-1)
  expect(box.x + box.width).toBeLessThanOrEqual(width + 1)
  expect(box.y + box.height).toBeLessThanOrEqual(height + 1)
  return box
}

/** Taps through the basic instrument pick into the round-1 potion hand. */
async function startGame(page: Page) {
  await page.getByRole('button', { name: 'Play' }).click()
  await page.getByTestId('card-0').click()
  await page.getByRole('button', { name: 'Confirm' }).click()
  await expect(page.getByText('Select a Potion')).toBeVisible()
}

test('the game fills the screen (rotated when the phone is upright)', async ({ page, isMobile }) => {
  const { width, height } = viewport(page)
  const box = await inViewport(page, '[data-testid=stage]')
  // letterboxed on one axis only: the stage touches both edges of the other axis
  expect(Math.max(box.width / width, box.height / height)).toBeGreaterThan(0.99)
  const rotated = await page.getByTestId('stage').getAttribute('data-rotated')
  expect(rotated).toBe(String(!!isMobile && height > width))
})

test('a round can be played by tapping', async ({ page }) => {
  await startGame(page)
  // Hands are random: a Potion Box opens into more cards instead of ending the round, so pick again.
  for (let pick = 0; pick < 3 && (await page.getByTestId('round').textContent()) === '1/13'; pick++) {
    await page.getByTestId('card-0').click()
    const target = page.locator('[data-highlight=selectable]').first()
    if (await target.count()) await target.click()
    await page.getByRole('button', { name: 'Confirm' }).click()
  }
  await expect(page.getByTestId('round')).toHaveText('2/13')
})

test('keyword tooltips open fully on screen, even near the bottom', async ({ page }) => {
  await startGame(page)
  for (let i = 0; i < 4 && (await page.locator('[data-testid^=card-] .kw').count()) === 0; i++) {
    await page.getByRole('button', { name: /refresh/i }).click()
  }
  const keyword = page.locator('[data-testid^=card-] .kw').first()
  await keyword.click()
  await expect(page.getByRole('tooltip')).toBeVisible()
  await inViewport(page, '[role=tooltip]')
  // readable on a phone: each line of tooltip text is at least ~15px tall on screen (≈12px text)
  const linePx = await page.locator('[role=tooltip] span').evaluate(el => {
    const r = el.getBoundingClientRect(); const rot = Math.abs(r.width) < Math.abs(r.height) && innerHeight > innerWidth
    return (rot ? r.width : r.height) / el.getClientRects().length
  })
  expect(linePx).toBeGreaterThan(15)
})

test('the fullscreen button is offered where the browser supports it', async ({ page }) => {
  const supported = await page.evaluate(() => document.fullscreenEnabled)
  const button = page.getByRole('button', { name: 'Fullscreen' })
  if (!supported) return expect(button).toHaveCount(0)
  await expect(button).toBeVisible()
  await inViewport(page, 'button[aria-label=Fullscreen]')
})

test('the equipped-instrument popup card grows to fit long text', async ({ page }) => {
  await page.getByRole('button', { name: 'Play' }).click()
  // equip the offered instrument with the longest description
  const lengths = await page.$$eval('[data-testid^=card-] > span', els => els.map(e => (e.textContent ?? '').length))
  await page.getByTestId(`card-${lengths.indexOf(Math.max(...lengths))}`).click()
  await page.getByRole('button', { name: 'Confirm' }).click()
  await page.locator('[data-filled=true]').first().hover()
  const popupText = page.locator('[class*=popover] [data-testid], [class*=popover] [role=button]').first().locator('> span')
  await expect(popupText).toBeVisible()
  const clipped = await popupText.evaluate(el => el.scrollHeight > el.clientHeight + 1)
  expect(clipped).toBe(false)
})
