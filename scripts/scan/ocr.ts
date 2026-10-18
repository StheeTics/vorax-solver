// The text reader for scripts: Tesseract in Node, the same engine the site loads in the browser.
import { createScheduler, createWorker, PSM } from 'tesseract.js'
import { encodePng } from './png'
import type { Img } from '../../src/solver/scan/pixels'
import type { ReadText } from '../../src/solver/scan/titles'

export async function nodeTextReader(workers = 3): Promise<{ readText: ReadText; stop: () => Promise<unknown> }> {
  const scheduler = createScheduler()
  for (let i = 0; i < workers; i++) {
    const w = await createWorker('eng')
    await w.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_BLOCK })
    scheduler.addWorker(w)
  }
  return { readText: async (img: Img) => (await scheduler.addJob('recognize', Buffer.from(encodePng(img)))).data.text, stop: () => scheduler.terminate() }
}
