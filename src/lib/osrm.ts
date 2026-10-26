import { haversine } from './trip'
import type { Leg, Route } from './types'

const OSRM = 'https://router.project-osrm.org/route/v1/driving'

export const straight = (l: Leg): Route => {
  const km = haversine(l.a, l.b) * 1.3
  return { km, min: (km / 75) * 60, coords: [l.a, l.b], straight: true }
}

export async function fetchRoute(l: Leg): Promise<Route> {
  const url = `${OSRM}/${l.a[1]},${l.a[0]};${l.b[1]},${l.b[0]}?overview=simplified&geometries=geojson`
  const res = await fetch(url)
  if (!res.ok) throw new Error(String(res.status))
  const json = await res.json()
  const r = json.routes?.[0]
  if (!r) throw new Error('no route')
  return {
    km: r.distance / 1000,
    min: r.duration / 60,
    coords: (r.geometry.coordinates as [number, number][]).map(([lng, lat]) => [lat, lng]),
  }
}
