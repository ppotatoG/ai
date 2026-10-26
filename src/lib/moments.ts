import { haversine, hasGeo } from './trip'
import type { Day, Leg, Moment } from './types'

const GAP_MIN = 45
const GAP_KM = 3

export function buildMoments(days: Day[]): Moment[] {
  const out: Moment[] = []
  for (const d of days) {
    let cur: Moment | null = null
    for (const it of d.items) {
      const geo = hasGeo(it) ? ([it.lat, it.lng] as [number, number]) : undefined
      const far = geo && cur?.last ? haversine(cur.last, geo) > GAP_KM : false
      const late = cur ? (it.date - cur.end) / 60000 > GAP_MIN : false
      if (!cur || far || late) {
        cur = { id: `m-${it.id}`, day: d.index, items: [], start: it.date, end: it.date, place: '', first: geo, last: geo }
        out.push(cur)
      }
      cur.items.push(it)
      cur.end = it.date
      if (geo) { cur.first ??= geo; cur.last = geo }
      if (!cur.place && it.place) cur.place = it.place
    }
  }
  return out
}

/** 장면 사이 이동 구간. 1.5km 미만은 이동으로 보지 않음 */
export function buildLegs(moments: Moment[]): Leg[] {
  const legs: Leg[] = []
  let prev: Moment | undefined
  for (const m of moments) {
    if (!m.first) continue
    if (prev?.last && haversine(prev.last, m.first) > 1.5) {
      const a = prev.last, b = m.first
      legs.push({ key: legKey(a, b), day: m.day, from: prev, to: m, a, b })
    }
    prev = m
  }
  return legs
}

export const legKey = (a: [number, number], b: [number, number]) =>
  `${a[0].toFixed(4)},${a[1].toFixed(4)}>${b[0].toFixed(4)},${b[1].toFixed(4)}`
