import { test, expect, type Page } from '@playwright/test'

const errors = new WeakMap<Page, string[]>()
test.beforeEach(async ({ page }) => {
  const list: string[] = []
  errors.set(page, list)
  page.on('pageerror', e => list.push(String(e)))
  page.on('console', m => m.type() === 'error' && list.push(m.text()))
})
test.afterEach(async ({ page }) => expect(errors.get(page)).toEqual([]))

test('landing leads to the Solver, and Manual gives advice', async ({ page }) => {
  await page.goto('')
  await page.getByRole('link', { name: /^Solver/ }).click()
  await expect(page.getByRole('heading', { name: 'Vorax Solver' })).toBeVisible()
  await page.getByText('Manual', { exact: true }).click()
  await page.getByLabel('Tank 1 occupied').check()
  await page.getByLabel('Card 1').selectOption('Mutagenic Powder')
  await expect(page.getByRole('region', { name: 'Advice' }).getByRole('heading', { level: 2 })).toHaveText(/^(Play|Refresh)/)
})

test('a screenshot fills the board and gives advice', async ({ page }) => {
  await page.goto('solver.html')
  await page.getByText('Screenshot', { exact: true }).click()
  await page.getByLabel('Choose a screenshot').setInputFiles('tests/fixtures/frames/board-012.png')
  await expect(page.getByLabel('Round')).toHaveValue('6')
  await expect(page.getByLabel('Card 2')).toHaveValue('Mutagenic Powder')
  await expect(page.getByRole('region', { name: 'Advice' }).getByRole('heading', { level: 2 })).toHaveText('Play Mutagenic Powder → tank 2, 4')
  await expect(page.locator('[title^="Unsure"]')).toHaveCount(0)
})

test('an unknown card points to the report box', async ({ page }) => {
  await page.goto('solver.html')
  await page.getByText('Screenshot', { exact: true }).click()
  await page.getByLabel('Choose a screenshot').setInputFiles('tests/fixtures/frames/unknown-card.png')
  await expect(page.getByText(/Card 2 isn’t one the Solver knows yet/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Copy' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Open an issue on GitHub' })).toHaveAttribute('href', /template=solver-reading\.yml/)
})
