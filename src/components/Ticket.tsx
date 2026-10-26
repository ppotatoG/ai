import { shortName } from '../lib/regions'
import { tripStats, type RouteFn } from '../lib/stats'
import { fmtDate } from '../lib/trip'
import type { Day, Leg, MediaItem, TripMeta } from '../lib/types'

/** 여행 전체를 한 장의 탑승권으로 */
interface Props { meta: TripMeta; items: MediaItem[]; days: Day[]; legs: Leg[]; route: RouteFn; compact?: boolean }

export default function Ticket({ meta, items, days, legs, route, compact }: Props) {
  const places = days.flatMap((d) => d.items.map((i) => i.place)).filter(Boolean)
  const from = places[0] ?? '출발'
  const to = places[places.length - 1] ?? '도착'
  const via = [...new Set(places)].filter((p) => p !== from && p !== to)
  const { km, regions } = tripStats(items, days, legs, route, meta)
  let seed = [...meta.title].reduce((a, c) => a * 31 + c.charCodeAt(0), 7) >>> 0
  const bars = Array.from({ length: 54 }, () => {
    seed = (seed * 1664525 + 1013904223) >>> 0
    return 1 + (seed % 4)
  })

  return (
    <section className={`ticket-wrap${compact ? ' compact' : ''}`}>
      <div className="ticket">
        <div className="t-main">
          <p className="t-brand">TRUNK DIARY · BOARDING PASS</p>
          <div className="t-route">
            <div><small>FROM</small><b>{from}</b></div>
            <span className="t-arrow">🚐 ─ ─ ─ ─ ▶</span>
            <div><small>TO</small><b>{to}</b></div>
          </div>
          {via.length > 0 && <p className="t-via">VIA · {via.slice(0, 8).join(' · ')}{via.length > 8 ? ' …' : ''}</p>}
          <dl className="t-grid">
            <div><dt>PASSENGER</dt><dd>{meta.title}</dd></div>
            <div><dt>DATE</dt><dd>{days.length ? `${fmtDate(days[0].date)} – ${fmtDate(days[days.length - 1].date)}` : '-'}</dd></div>
            <div><dt>CLASS</dt><dd>{Math.max(0, days.length - 1)}N{days.length}D · 차박</dd></div>
            <div><dt>DISTANCE</dt><dd>{km.toLocaleString()} km</dd></div>
            <div><dt>FRAMES</dt><dd>{items.length}</dd></div>
            <div><dt>REGIONS</dt><dd>{regions.map(shortName).join(' ')}</dd></div>
          </dl>
        </div>
        <div className="t-stub">
          <p>ADMIT ONE</p>
          <div className="barcode">{bars.map((w, i) => <i key={i} style={{ width: w }} />)}</div>
          <p className="t-small">다음 차박도 이 좌석으로</p>
        </div>
      </div>
    </section>
  )
}
