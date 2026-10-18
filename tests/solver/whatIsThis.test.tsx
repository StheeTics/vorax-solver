import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { WhatIsThis } from '@/solver/board/WhatIsThis'

const added: [string, unknown][] = []
vi.mock('@/solver/scan/localRefs', () => ({ addLocalRef: async (k: string, f: unknown) => void added.push([k, f]) }))

it('naming an unknown card saves its art under that name and asks for a recheck', async () => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ putImageData() {} } as unknown as CanvasRenderingContext2D)
  const frame = new ImageData(3440, 1440)
  const onNamed = vi.fn()
  render(<WhatIsThis problem={{ kind: 'unknownArt', field: 'hand1', crop: { x: 1700, y: 960, w: 230, h: 340 } }} phase="potion" frame={frame} onNamed={onNamed} onSkip={() => {}} />)
  expect(screen.getByText('What is card 2?')).toBeTruthy()
  fireEvent.change(screen.getByLabelText('Card 2 is'), { target: { value: 'Green Bile Solution' } })
  await waitFor(() => expect(onNamed).toHaveBeenCalled())
  expect(added[0][0]).toBe('potion:Green Bile Solution')
  expect(added[0][1]).toHaveProperty('hist')
})
