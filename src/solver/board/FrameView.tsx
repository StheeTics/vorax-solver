import { useEffect, useRef } from 'react'

/** The last picture the Solver read, drawn scaled down to fit. */
export function FrameView({ frame }: { frame: ImageData }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current
    const ctx = c?.getContext('2d')
    if (!c || !ctx) return
    c.width = frame.width
    c.height = frame.height
    ctx.putImageData(frame, 0, 0)
  }, [frame])
  return <canvas ref={ref} aria-label="Last picture" style={{ width: '100%', height: 'auto', borderRadius: 6 }} />
}
