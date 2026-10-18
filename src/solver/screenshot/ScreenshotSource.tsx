import { useEffect, useState } from 'react'
import styles from './ScreenshotSource.module.css'

/** A screenshot file's pixels. */
async function decode(file: Blob): Promise<ImageData> {
  const bitmap = await createImageBitmap(file)
  const c = document.createElement('canvas')
  c.width = bitmap.width
  c.height = bitmap.height
  const ctx = c.getContext('2d')!
  ctx.drawImage(bitmap, 0, 0)
  bitmap.close?.()
  return ctx.getImageData(0, 0, c.width, c.height)
}

export function ScreenshotSource({ onFrame }: { onFrame(img: ImageData): void }) {
  const [error, setError] = useState('')
  const take = (file: Blob | null | undefined) => {
    if (!file || !file.type.startsWith('image/')) return setError('That isn’t an image.')
    setError('')
    decode(file).then(onFrame, () => setError('That image couldn’t be read.'))
  }

  useEffect(() => {
    const onPaste = (e: Event) => {
      const items = Array.from((e as ClipboardEvent).clipboardData?.items ?? [])
      const item = items.find(i => i.kind === 'file' && i.type.startsWith('image/'))
      if (item) take(item.getAsFile())
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  })

  return (
    <section className={`panel-frame ${styles.zone}`} aria-label="Screenshot"
      onDragOver={e => e.preventDefault()} onDrop={e => (e.preventDefault(), take(e.dataTransfer.files[0]))}>
      <strong>Paste a screenshot (Ctrl+V), drop it here, or choose a file.</strong>
      <label className={`ghost-button ${styles.pick}`}>
        Choose a screenshot
        <input type="file" accept="image/*" aria-label="Choose a screenshot" onChange={e => take(e.target.files?.[0])} />
      </label>
      {error && <p className={styles.error}>{error}</p>}
    </section>
  )
}
