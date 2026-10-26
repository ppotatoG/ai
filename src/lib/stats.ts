import { provincesAlong } from './regions'
import type { Day, Leg, MediaItem, Route, TripMeta } from './types'

export type RouteFn = (l: Leg) => Route

export function tripStats(items: MediaItem[], days: Day[], legs: Leg[], route: RouteFn, meta: TripMeta) {
  const routed = legs.reduce((s, l) => s + route(l).km, 0)
  const min = legs.reduce((s, l) => s + route(l).min, 0)
  const coords = [...legs.flatMap((l) => route(l).coords), ...items.flatMap((i) => (typeof i.lat === 'number' ? [[i.lat, i.lng!] as [number, number]] : []))]
  return {
    regions: provincesAlong(coords),
    km: meta.odometer ?? Math.round(routed),
    routedKm: Math.round(routed),
    driveMin: min,
    nights: Math.max(0, days.length - 1),
    photos: items.filter((i) => i.kind === 'photo').length,
    videos: items.filter((i) => i.kind === 'video').length,
  }
}

export const dayDrive = (day: number, legs: Leg[], route: RouteFn) => {
  const ls = legs.filter((l) => l.day === day)
  return { km: ls.reduce((s, l) => s + route(l).km, 0), min: ls.reduce((s, l) => s + route(l).min, 0) }
}

const DAY_COLORS = ['#c8401e', '#1f5fa8', '#2f7d4a', '#7a3fd1', '#b8860b', '#0e7c86']
export const dayColor = (i: number) => DAY_COLORS[i % DAY_COLORS.length]
