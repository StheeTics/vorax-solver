// Dev server only: encodes a board's picture and sends it with its read to the dev server (slowReads.ts), off the
// page's thread: a 3440x1440 PNG takes seconds to encode, which there held up the next board's card names.
self.onmessage = async (e: MessageEvent<{ id: number; url: string; base: string; width: number; height: number; data: ArrayBuffer; json: string }>) => {
  const { id, url, base, width, height, data, json } = e.data
  try {
    const c = new OffscreenCanvas(width, height)
    c.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(data), width, height), 0, 0)
    const png = await c.convertToBlob({ type: 'image/png' })
    await fetch(`${url}${base}.png`, { method: 'POST', body: png })
    await fetch(`${url}${base}.json`, { method: 'POST', body: json })
    self.postMessage({ id, ok: true })
  } catch (err) {
    self.postMessage({ id, ok: false, error: String(err) })
  }
}
