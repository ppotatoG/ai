import type { Day, MediaItem } from './types'

const pad = (n: number) => String(n).padStart(2, '0')
export const dayKey = (t: number) => {
  const d = new Date(t)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** 위치 없는 항목(주로 영상)은 ±40분 안의 가장 가까운 사진 위치를 빌려 씀 */
function fillGeo(sorted: MediaItem[]): MediaItem[] {
  const geo = sorted.filter(hasGeo)
  return sorted.map((m) => {
    if (hasGeo(m) || !geo.length) return m
    let best = geo[0]
    for (const g of geo) if (Math.abs(g.date - m.date) < Math.abs(best.date - m.date)) best = g
    if (Math.abs(best.date - m.date) > 40 * 60000) return m
    return { ...m, lat: best.lat, lng: best.lng, place: m.place || best.place, geoGuess: true }
  })
}

export function groupDays(items: MediaItem[]): Day[] {
  const sorted = fillGeo([...items].sort((a, b) => a.date - b.date))
  const map = new Map<string, MediaItem[]>()
  for (const it of sorted) {
    const k = dayKey(it.date)
    if (!map.has(k)) map.set(k, [])
    map.get(k)!.push(it)
  }
  return [...map.entries()].map(([key, list], index) => ({
    index,
    key,
    date: new Date(list[0].date),
    items: list,
  }))
}

export const hasGeo = (m: MediaItem): m is MediaItem & { lat: number; lng: number } =>
  typeof m.lat === 'number' && typeof m.lng === 'number'

/** 그날 밤 차박지 = 그날 마지막으로 위치가 찍힌 사진 */
export function campOf(day: Day) {
  const geo = day.items.filter(hasGeo)
  return geo[geo.length - 1]
}

export function haversine(a: [number, number], b: [number, number]) {
  const R = 6371
  const toRad = (x: number) => (x * Math.PI) / 180
  const dLat = toRad(b[0] - a[0])
  const dLng = toRad(b[1] - a[1])
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

// 하루의 하늘: 시간대별 하늘색
const SKY: [number, string][] = [
  [0, '#0a0f24'], [4.5, '#151b42'], [6, '#e98a7a'], [7.5, '#f3c28f'], [9, '#8cc3e6'],
  [13, '#5ea8e4'], [16, '#86b8de'], [17.6, '#f2a25c'], [18.6, '#d0566b'], [19.6, '#3b2f6b'],
  [21, '#141a3d'], [24, '#0a0f24'],
]
const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
export function skyAt(hour: number) {
  for (let i = 1; i < SKY.length; i++) {
    const [h1, c1] = SKY[i]
    const [h0, c0] = SKY[i - 1]
    if (hour <= h1) {
      const t = (hour - h0) / (h1 - h0)
      const a = hex(c0), b = hex(c1)
      return `rgb(${a.map((v, j) => Math.round(v + (b[j] - v) * t)).join(',')})`
    }
  }
  return SKY[0][1]
}
export const skyGradient = (from = 0, to = 24, steps = 12) =>
  `linear-gradient(90deg, ${Array.from({ length: steps + 1 }, (_, i) => {
    const h = from + ((to - from) * i) / steps
    return `${skyAt(h)} ${(i / steps) * 100}%`
  }).join(', ')})`

export const hourOf = (t: number) => {
  const d = new Date(t)
  return d.getHours() + d.getMinutes() / 60
}
export const isNight = (t: number) => {
  const h = hourOf(t)
  return h >= 19.5 || h < 5.5
}

const WD = ['일', '월', '화', '수', '목', '금', '토']
export const fmtDate = (d: Date) => `${d.getMonth() + 1}.${pad(d.getDate())} (${WD[d.getDay()]})`
export const fmtTime = (t: number) => {
  const d = new Date(t)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}
