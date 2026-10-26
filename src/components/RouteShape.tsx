/** 구간 도로 모양을 그대로 그린 선 (지도 없이) */
export default function RouteShape({ coords, color, className, animate }: { coords: [number, number][]; color: string; className?: string; animate?: boolean }) {
  if (coords.length < 2) return null
  const lats = coords.map((c) => c[0]), lngs = coords.map((c) => c[1])
  const [la0, la1, ln0, ln1] = [Math.min(...lats), Math.max(...lats), Math.min(...lngs), Math.max(...lngs)]
  const kx = Math.cos(((la0 + la1) / 2) * (Math.PI / 180))
  const span = Math.max(la1 - la0, (ln1 - ln0) * kx, 1e-4)
  const W = 100, P = 6
  const S = W - 2 * P
  const ox = P + (S - (((ln1 - ln0) * kx) / span) * S) / 2
  const oy = P + (S - ((la1 - la0) / span) * S) / 2
  const pts = coords.map(([la, ln]) => [ox + (((ln - ln0) * kx) / span) * S, oy + ((la1 - la) / span) * S])
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}`).join('')
  const [sx, sy] = pts[0], [ex, ey] = pts[pts.length - 1]
  return (
    <svg className={className} viewBox={`0 0 ${W} ${W}`} aria-hidden>
      <path d={d} fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" pathLength={1} className={animate ? 'draw' : undefined} />
      <circle cx={sx} cy={sy} r="2.2" fill="none" stroke={color} strokeWidth="1.2" />
      <circle cx={ex} cy={ey} r="2.4" fill={color} />
    </svg>
  )
}
