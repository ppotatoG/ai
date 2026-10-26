import { useEffect, useState } from 'react'
import { fetchRoute, straight } from './osrm'
import type { Leg, Route } from './types'

const CACHE = 'trunk-routes-v1'

const readCache = (): Record<string, Route> => {
  try { return JSON.parse(localStorage.getItem(CACHE) ?? '{}') } catch { return {} }
}
const writeCache = (c: Record<string, Route>) => {
  try { localStorage.setItem(CACHE, JSON.stringify(c)) } catch { /* 용량 초과 등 무시 */ }
}

/** 구간별 실제 도로 경로. 받아오는 동안은 직선 추정치 */
export function useRoutes(legs: Leg[]) {
  const [routes, setRoutes] = useState<Record<string, Route>>(() => readCache())
  const sig = legs.map((l) => l.key).join('|')

  useEffect(() => {
    let alive = true
    ;(async () => {
      const cache = readCache()
      for (const l of legs) {
        if (!alive) return
        if (cache[l.key]) continue
        try {
          cache[l.key] = await fetchRoute(l)
          writeCache(cache)
        } catch {
          continue
        }
        if (alive) setRoutes({ ...cache })
        await new Promise((r) => setTimeout(r, 350))
      }
    })()
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig])

  const get = (l: Leg): Route => routes[l.key] ?? straight(l)
  return get
}

export const fmtDrive = (min: number) => {
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  return h ? `${h}시간 ${m}분` : `${m}분`
}
