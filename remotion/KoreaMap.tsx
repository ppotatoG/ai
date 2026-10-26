import { useMemo } from 'react'
import { PROVINCES, shortName } from '../src/lib/regions'

type LL = [number, number]

export interface MapLine { coords: LL[]; color: string; progress?: number; width?: number; dim?: boolean }

interface Props {
  width: number
  height: number
  /** 화면에 맞출 영역 (lat/lng 좌표들) */
  fit: LL[]
  pad?: number
  lines: MapLine[]
  van?: LL
  lit?: string[]
  labels?: boolean
}

/** 시·도 경계를 직접 그린 지도. 타일 없이 렌더링되어 영상 렌더에 안전 */
export function KoreaMap({ width, height, fit, pad = 0.18, lines, van, lit = [], labels }: Props) {
  const proj = useMemo(() => {
    const lats = fit.map((p) => p[0]), lngs = fit.map((p) => p[1])
    let [la0, la1, ln0, ln1] = [Math.min(...lats), Math.max(...lats), Math.min(...lngs), Math.max(...lngs)]
    const kx = Math.cos((((la0 + la1) / 2) * Math.PI) / 180)
    // 최소 범위 (가까운 구간도 너무 확대되지 않게)
    const minSpan = 0.35
    if (la1 - la0 < minSpan) { const c = (la0 + la1) / 2; la0 = c - minSpan / 2; la1 = c + minSpan / 2 }
    if ((ln1 - ln0) * kx < minSpan) { const c = (ln0 + ln1) / 2; ln0 = c - minSpan / 2 / kx; ln1 = c + minSpan / 2 / kx }
    const spanX = (ln1 - ln0) * kx, spanY = la1 - la0
    const k = Math.min((width * (1 - pad * 2)) / spanX, (height * (1 - pad * 2)) / spanY)
    const cx = (ln0 + ln1) / 2, cy = (la0 + la1) / 2
    return (p: LL) => [width / 2 + (p[1] - cx) * kx * k, height / 2 - (p[0] - cy) * k] as [number, number]
  }, [fit, width, height, pad])

  const provinces = useMemo(
    () =>
      PROVINCES.features.map((f) => {
        const polys = (f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates) as [number, number][][][]
        const d = polys.map((poly) => poly.map((ring) => ring.map(([lng, lat], i) => `${i ? 'L' : 'M'}${proj([lat, lng]).map((n) => n.toFixed(1)).join(' ')}`).join('') + 'Z').join('')).join('')
        const ring = polys[0][0]
        const c = ring.reduce((s, [lng, lat]) => [s[0] + lat / ring.length, s[1] + lng / ring.length], [0, 0]) as LL
        return { name: f.properties.name, d, c: proj(c) }
      }),
    [proj],
  )

  const path = (coords: LL[], progress = 1) => {
    const n = Math.max(2, Math.ceil(coords.length * progress))
    return coords.slice(0, n).map((p, i) => `${i ? 'L' : 'M'}${proj(p).map((v) => v.toFixed(1)).join(' ')}`).join('')
  }

  return (
    <svg width={width} height={height} style={{ position: 'absolute', inset: 0 }}>
      {provinces.map((p) => (
        <path key={p.name} d={p.d} fill={lit.includes(shortName(p.name)) ? 'rgba(159,211,255,0.13)' : 'rgba(255,255,255,0.035)'} stroke="rgba(159,211,255,0.35)" strokeWidth={1.4} />
      ))}
      {labels && provinces.filter((p) => lit.includes(shortName(p.name))).map((p) => (
        <text key={p.name} x={p.c[0]} y={p.c[1]} fill="rgba(159,211,255,0.6)" fontSize={26} textAnchor="middle" fontFamily="sans-serif" letterSpacing={4}>{shortName(p.name)}</text>
      ))}
      {lines.map((l, i) => (
        <g key={i} opacity={l.dim ? 0.35 : 1}>
          <path d={path(l.coords, l.progress)} fill="none" stroke={l.color} strokeWidth={(l.width ?? 7) * 3} strokeLinecap="round" strokeLinejoin="round" opacity={0.18} />
          <path d={path(l.coords, l.progress)} fill="none" stroke={l.color} strokeWidth={l.width ?? 7} strokeLinecap="round" strokeLinejoin="round" />
        </g>
      ))}
      {van && (() => {
        const [x, y] = proj(van)
        return (
          <g transform={`translate(${x} ${y})`}>
            <circle r={34} fill="#fff" opacity={0.15} />
            <text fontSize={56} textAnchor="middle" dominantBaseline="central" transform="scale(-1 1)">🚐</text>
          </g>
        )
      })()}
    </svg>
  )
}

/** 경로 위 진행률 지점 */
export function along(coords: LL[], t: number): LL {
  if (coords.length < 2) return coords[0]
  const seg: number[] = [0]
  for (let i = 1; i < coords.length; i++) seg.push(seg[i - 1] + Math.hypot(coords[i][0] - coords[i - 1][0], coords[i][1] - coords[i - 1][1]))
  const d = seg[seg.length - 1] * Math.min(1, Math.max(0, t))
  let i = seg.findIndex((s) => s >= d)
  if (i < 1) i = 1
  const k = (d - seg[i - 1]) / (seg[i] - seg[i - 1] || 1)
  const a = coords[i - 1], b = coords[i]
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]
}
