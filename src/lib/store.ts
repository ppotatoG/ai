import exifr from 'exifr'
import { createStore, del, get, set } from 'idb-keyval'
import type { MediaItem, TripMeta } from './types'

const db = createStore('trunk-diary', 'kv')
type Meta = Omit<MediaItem, 'src' | 'thumb'>

export async function loadSaved(): Promise<{ items: MediaItem[]; meta?: TripMeta } | null> {
  const list = await get<Meta[]>('items', db)
  if (!list) return null
  const items: MediaItem[] = []
  for (const m of list) {
    const blob = await get<Blob>(`blob:${m.id}`, db)
    const thumb = await get<Blob>(`thumb:${m.id}`, db)
    if (blob) items.push({ ...m, src: URL.createObjectURL(blob), thumb: thumb && URL.createObjectURL(thumb) })
  }
  return { items, meta: await get<TripMeta>('meta', db) }
}

export async function saveItems(items: MediaItem[]) {
  await set('items', items.filter((i) => !i.demo).map(({ src: _s, thumb: _t, ...m }) => m), db)
}
export const saveMeta = (meta: TripMeta) => set('meta', meta, db)
export const removeBlob = (id: string) => Promise.all([del(`blob:${id}`, db), del(`thumb:${id}`, db)])

export async function clearAll() {
  const list = (await get<Meta[]>('items', db)) ?? []
  await Promise.all(list.map((m) => removeBlob(m.id)))
  await del('items', db)
  await del('meta', db)
}

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36)

export async function importFiles(files: File[], onProgress?: (done: number, total: number) => void): Promise<{ items: MediaItem[]; skipped: string[] }> {
  const out: MediaItem[] = []
  const skipped: string[] = []
  let done = 0
  for (const file of files) {
    onProgress?.(done++, files.length)
    const isVideo = file.type.startsWith('video/')
    if (!isVideo && !file.type.startsWith('image/')) continue
    let date = file.lastModified
    let lat: number | undefined
    let lng: number | undefined
    let duration: number | undefined
    if (!isVideo) {
      try {
        const ex = await exifr.parse(file, { gps: true, pick: ['DateTimeOriginal', 'CreateDate', 'latitude', 'longitude'] })
        const d = ex?.DateTimeOriginal ?? ex?.CreateDate
        if (d instanceof Date && !isNaN(+d)) date = +d
        if (typeof ex?.latitude === 'number') { lat = ex.latitude; lng = ex.longitude }
      } catch { /* EXIF 없음 */ }
    }
    const t = isVideo ? await videoThumb(file) : await photoThumb(file)
    if (!t) { skipped.push(file.name); continue }
    duration = t.duration
    const id = uid()
    await set(`blob:${id}`, file, db)
    await set(`thumb:${id}`, t.blob, db)
    out.push({
      id, kind: isVideo ? 'video' : 'photo', src: URL.createObjectURL(file), thumb: URL.createObjectURL(t.blob),
      date, lat, lng, duration, caption: '', place: '',
    })
  }
  onProgress?.(files.length, files.length)
  return { items: out, skipped }
}

const THUMB = 720

function toBlob(src: CanvasImageSource, w: number, h: number): Promise<Blob | null> {
  const k = Math.min(1, THUMB / Math.max(w, h))
  const c = document.createElement('canvas')
  c.width = Math.round(w * k)
  c.height = Math.round(h * k)
  c.getContext('2d')!.drawImage(src, 0, 0, c.width, c.height)
  return new Promise((res) => c.toBlob(res, 'image/jpeg', 0.82))
}

/** 브라우저가 못 여는 형식(예: 크롬의 HEIC)이면 null */
async function photoThumb(file: File): Promise<{ blob: Blob; duration?: number } | null> {
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' })
    const blob = await toBlob(bmp, bmp.width, bmp.height)
    bmp.close()
    return blob && { blob }
  } catch {
    return null
  }
}

function videoThumb(file: File): Promise<{ blob: Blob; duration?: number } | null> {
  return new Promise((res) => {
    const v = document.createElement('video')
    const url = URL.createObjectURL(file)
    const done = (r: { blob: Blob; duration?: number } | null) => { URL.revokeObjectURL(url); res(r) }
    v.muted = true
    v.playsInline = true
    v.preload = 'auto'
    v.onloadedmetadata = () => { v.currentTime = Math.min(1, v.duration / 3 || 0) }
    v.onseeked = async () => {
      const blob = await toBlob(v, v.videoWidth, v.videoHeight)
      done(blob && { blob, duration: isFinite(v.duration) ? Math.round(v.duration) : undefined })
    }
    v.onerror = () => done(null)
    v.src = url
  })
}
