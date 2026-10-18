// Shares one game window (never a whole screen or a tab) and grabs single frames of it on request.

export interface WindowShare {
  grab(): Promise<ImageData>
  stop(): void
  onEnded(fn: () => void): void
  readonly size: { width: number; height: number }
}

export class NotAWindowError extends Error {
  constructor() {
    super('Share the game window, not a whole screen or a browser tab.')
  }
}

function canvas(w: number, h: number): OffscreenCanvas | HTMLCanvasElement {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h)
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return c
}

function pixels(source: CanvasImageSource, w: number, h: number): ImageData {
  const ctx = canvas(w, h).getContext('2d') as OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D
  ctx.drawImage(source, 0, 0, w, h)
  return ctx.getImageData(0, 0, w, h)
}

/** A PNG (or JPEG) of a frame, for saving or downloading. */
export async function toPng(img: ImageData, type = 'image/png', quality?: number): Promise<Blob> {
  const c = canvas(img.width, img.height)
  ;(c.getContext('2d') as OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D).putImageData(img, 0, 0)
  if ('convertToBlob' in c) return c.convertToBlob({ type, quality })
  return new Promise((resolve, reject) => c.toBlob(b => (b ? resolve(b) : reject(new Error('Image failed'))), type, quality))
}

export async function shareWindow(md: MediaDevices = navigator.mediaDevices): Promise<WindowShare> {
  const stream = await md.getDisplayMedia({ video: { displaySurface: 'window', frameRate: 30 }, audio: false } as DisplayMediaStreamOptions)
  const track = stream.getVideoTracks()[0]
  const settings = track.getSettings() as MediaTrackSettings & { displaySurface?: string }
  if (settings.displaySurface !== 'window') {
    stream.getTracks().forEach(t => t.stop())
    throw new NotAWindowError()
  }
  const ended: (() => void)[] = []
  track.addEventListener('ended', () => ended.forEach(f => f()))

  let video: HTMLVideoElement | null = null
  const grab = async (): Promise<ImageData> => {
    const Capture = (globalThis as { ImageCapture?: new (t: MediaStreamTrack) => { grabFrame(): Promise<ImageBitmap> } }).ImageCapture
    if (Capture) {
      const bitmap = await new Capture(track).grabFrame()
      const img = pixels(bitmap, bitmap.width, bitmap.height)
      bitmap.close()
      return img
    }
    if (!video) {
      video = document.createElement('video')
      video.muted = true
      video.srcObject = stream
      await video.play()
    }
    return pixels(video, video.videoWidth, video.videoHeight)
  }

  return {
    grab,
    stop: () => stream.getTracks().forEach(t => t.stop()),
    onEnded: fn => void ended.push(fn),
    get size() {
      const s = track.getSettings()
      return { width: s.width ?? 0, height: s.height ?? 0 }
    },
  }
}
