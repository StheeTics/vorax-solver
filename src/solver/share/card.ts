// A card the Solver couldn't name ("not recognised") is shared like a named icon, so it can be added for everyone
// (the live-data workflow opens an issue for each new one): its printed title as read, which pick it was, and a
// small JPEG of the card's face alone, never the screen. Only with sharing on, from the published site, and once
// per card in this page.
import type { Rect } from '../types'
import { ENDPOINT, sendingAllowed } from './endpoint'
import { loadShare } from './shareStore'

interface Deps { on: boolean; allowed: boolean; endpoint: string; post: typeof fetch }

/** The picture's height in pixels: the card's name and art stay readable, a few kilobytes. */
const PICTURE_H = 240
const sent = new Set<string>()

export interface NewCard { phase: string; text: string; picture?: string }

export async function shareCard(card: NewCard, deps: Deps = { on: loadShare(), allowed: sendingAllowed(), endpoint: ENDPOINT, post: (...a) => fetch(...a) }): Promise<void> {
  if (!deps.on || !deps.allowed || (!card.text && !card.picture)) return
  // the same card on the next boards is sent once: by its title's first line, else its picture
  const key = `${card.phase}|${card.text.split('\n')[0].trim().toLowerCase() || card.picture?.slice(-200)}`
  if (sent.has(key)) return
  sent.add(key)
  const body = JSON.stringify({ uid: crypto.randomUUID(), phase: card.phase, text: card.text.slice(0, 400), ...(card.picture ? { picture: card.picture } : {}) })
  try {
    await deps.post(`${deps.endpoint}/v1/cards`, { method: 'POST', headers: { 'content-type': 'application/json' }, body, keepalive: true })
  } catch {
    // not shared: the player can still report it
  }
}

/** A small JPEG of the card at `crop` in the picture read, or nothing where there's no canvas. */
export function cardPicture(img: ImageData, crop: Rect): string | undefined {
  if (typeof document === 'undefined') return undefined
  try {
    const x = Math.max(0, Math.round(crop.x)), y = Math.max(0, Math.round(crop.y))
    const w = Math.min(img.width - x, Math.round(crop.w)), h = Math.min(img.height - y, Math.round(crop.h))
    if (w <= 0 || h <= 0) return undefined
    const full = document.createElement('canvas')
    full.width = img.width
    full.height = img.height
    full.getContext('2d')!.putImageData(img, 0, 0)
    const k = Math.min(1, PICTURE_H / h)
    const out = document.createElement('canvas')
    out.width = Math.round(w * k)
    out.height = Math.round(h * k)
    out.getContext('2d')!.drawImage(full, x, y, w, h, 0, 0, out.width, out.height)
    return out.toDataURL('image/jpeg', 0.75)
  } catch {
    return undefined
  }
}
