import { checkForUpdate, watchForUpdates } from '@/ui/updateToast'

afterEach(() => { document.body.innerHTML = '' })

const live = (build: string) => vi.fn(async () => ({ build }))

it('shows a toast with a Refresh button when the live site is a newer build', async () => {
  await checkForUpdate('abc1234', live('def5678'))
  const toast = document.querySelector('[role="status"]')!
  expect(toast.textContent).toMatch(/new version/i)
  const reload = vi.fn()
  Object.defineProperty(window, 'location', { value: { ...window.location, reload }, configurable: true })
  ;(toast.querySelector('button') as HTMLButtonElement).click()
  expect(reload).toHaveBeenCalled()
})

it('shows nothing while the page is the live build', async () => {
  await checkForUpdate('abc1234', live('abc1234'))
  expect(document.querySelector('[role="status"]')).toBeNull()
})

it('shows the toast once, however many checks find the update', async () => {
  await checkForUpdate('abc1234', live('def5678'))
  await checkForUpdate('abc1234', live('def5678'))
  expect(document.querySelectorAll('[role="status"]')).toHaveLength(1)
})

it('a failed check (offline) shows nothing', async () => {
  await checkForUpdate('abc1234', async () => { throw new Error('offline') })
  expect(document.querySelector('[role="status"]')).toBeNull()
})

it('a development build never checks', () => {
  const fetchLive = live('def5678')
  watchForUpdates('dev', fetchLive)
  expect(fetchLive).not.toHaveBeenCalled()
})
