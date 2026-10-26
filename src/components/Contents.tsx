import type React from 'react'
import RouteMap from './RouteMap'
import { fmtDrive } from '../lib/routing'
import { dayColor, dayDrive, type RouteFn } from '../lib/stats'
import { fmtDate } from '../lib/trip'
import type { Day, Leg, Moment, TripMeta } from '../lib/types'

interface Props {
  days: Day[]
  meta: TripMeta
  moments: Moment[]
  legs: Leg[]
  route: RouteFn
  onOpen: (id: string) => void
  pinMode: boolean
  onPick: (lat: number, lng: number) => void
}

export default function Contents({ days, meta, moments, legs, route, onOpen, pinMode, onPick }: Props) {
  const loading = legs.some((l) => route(l).straight)
  return (
    <section className="contents" id="contents">
      <div className="toc">
        <p className="kicker">CONTENTS</p>
        <h2>목차</h2>
        <ol>
          {days.map((d) => {
            const dd = dayDrive(d.index, legs, route)
            const places = [...new Set(moments.filter((m) => m.day === d.index).map((m) => m.place).filter(Boolean))]
            return (
              <li key={d.key} style={{ '--c': dayColor(d.index) } as React.CSSProperties}>
                <a href={`#day-${d.index}`}>
                  <span className="toc-no">{String(d.index + 1).padStart(2, '0')}</span>
                  <span className="toc-body">
                    <b>{meta.dayTitles[d.index] || fmtDate(d.date)}</b>
                    <small>{places.join(' · ') || '장소 미입력'}</small>
                  </span>
                  <span className="toc-km">{Math.round(dd.km)}<i>km</i><small>{fmtDrive(dd.min)}</small></span>
                </a>
              </li>
            )
          })}
        </ol>
        <p className="toc-note">{loading ? '실제 도로 경로를 불러오는 중… (점선은 임시 직선)' : '사진 위치를 실제 도로로 이은 경로예요.'}</p>
      </div>
      <div className="toc-map">
        <RouteMap days={days} moments={moments} legs={legs} route={route} onOpen={onOpen} pinMode={pinMode} onPick={onPick} />
      </div>
    </section>
  )
}
