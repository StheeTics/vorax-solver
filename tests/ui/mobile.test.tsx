import { render, screen, fireEvent } from '@testing-library/react'
import { Stage } from '@/ui/Stage'
import { FullscreenButton } from '@/ui/FullscreenButton'

function setViewport(w: number, h: number, touch: boolean) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: w })
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: h })
  window.matchMedia = ((q: string) => ({ matches: touch && q.includes('coarse'), media: q, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia
}

describe('Stage', () => {
  it('rotates on a touch screen held upright', () => {
    setViewport(390, 844, true)
    render(<Stage><div>game</div></Stage>)
    const stage = screen.getByTestId('stage')
    expect(stage.getAttribute('data-rotated')).toBe('true')
    expect(stage.style.transform).toContain('rotate(90deg)')
  })
  it('does not rotate on desktop', () => {
    setViewport(1326, 837, false)
    render(<Stage><div>game</div></Stage>)
    expect(screen.getByTestId('stage').getAttribute('data-rotated')).toBe('false')
  })
})

describe('FullscreenButton', () => {
  afterEach(() => { delete (document as { fullscreenEnabled?: boolean }).fullscreenEnabled })
  it('is hidden when the browser cannot go fullscreen (e.g. iPhone Safari)', () => {
    Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, value: false })
    render(<FullscreenButton />)
    expect(screen.queryByRole('button', { name: /fullscreen/i })).toBeNull()
  })
  it('requests fullscreen when tapped', () => {
    Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, value: true })
    const request = vi.fn(() => Promise.resolve())
    document.documentElement.requestFullscreen = request
    render(<FullscreenButton />)
    fireEvent.click(screen.getByRole('button', { name: /fullscreen/i }))
    expect(request).toHaveBeenCalledTimes(1)
  })
})
