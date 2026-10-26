import type { CSSProperties } from 'react'
import Media, { fmtDur } from './Media'
import RouteShape from './RouteShape'
import { moonOf } from '../lib/moon'
import { fmtDrive } from '../lib/routing'
import { dayColor, dayDrive, type RouteFn } from '../lib/stats'
import { fmtDate, fmtTime, hourOf, skyAt } from '../lib/trip'
import type { Day, Leg, MediaItem, Moment } from '../lib/types'

interface Props {
  day: Day
  last: boolean
  moments: Moment[]
  legs: Leg[]
  route: RouteFn
  title: string
  note: string
  onTitle: (t: string) => void
  onNote: (t: string) => void
  onOpen: (id: string) => void
}

/** 저녁 이후 시작한 장면은 '밤' 지면으로 */
const isNightMoment = (m: Moment) => hourOf(m.start) >= 19 || hourOf(m.start) < 4

function Frame({ item, onOpen, className }: { item: MediaItem; onOpen: (id: string) => void; className?: string }) {
  return (
    <figure className={`fig ${className ?? ''}`}>
      <button className="fig-img" onClick={() => onOpen(item.id)}>
        <Media item={item} />
        {item.kind === 'video' && <span className="vbadge">▶ {fmtDur(item.duration)}</span>}
      </button>
      {item.caption && <figcaption>{item.caption}</figcaption>}
    </figure>
  )
}

function MomentBlock({ m, onOpen, dark, flip }: { m: Moment; onOpen: (id: string) => void; dark?: boolean; flip?: boolean }) {
  const [lead, ...rest] = m.items
  const n = m.items.length
  if (n === 1)
    return (
      <article className={`moment solo${flip ? ' flip' : ''}${dark ? ' dark' : ''}`}>
        <div className="solo-text">
          <header className="m-head">
            <span className="m-time">{fmtTime(m.start)}</span>
            <span className="m-place">{m.place || '이름 없는 곳'}</span>
          </header>
          {lead.caption && <p className="solo-cap">{lead.caption}</p>}
        </div>
        <Frame item={{ ...lead, caption: '' }} onOpen={onOpen} className="lead" />
      </article>
    )
  return (
    <article className={`moment n${Math.min(n, 4)}${dark ? ' dark' : ''}`}>
      <header className="m-head">
        <span className="m-time">{fmtTime(m.start)}{m.end - m.start > 10 * 60000 ? `–${fmtTime(m.end)}` : ''}</span>
        <span className="m-place">{m.place || '이름 없는 곳'}</span>
        <span className="m-count">{n > 1 ? `${n}컷` : ''}</span>
      </header>
      <Frame item={lead} onOpen={onOpen} className="lead" />
      {rest.length > 0 && (
        <div className="m-grid">
          {rest.map((it, i) => <Frame key={it.id} item={it} onOpen={onOpen} className={i % 7 === 3 ? 'wide' : ''} />)}
        </div>
      )}
    </article>
  )
}

function DriveBand({ leg, route }: { leg: Leg; route: RouteFn }) {
  const r = route(leg)
  const depart = leg.from.end
  const arrive = leg.to.start
  const from = hourOf(depart), to = hourOf(arrive) < from ? hourOf(arrive) + 24 : hourOf(arrive)
  const stops = Array.from({ length: 7 }, (_, i) => `${skyAt((from + ((to - from) * i) / 6) % 24)} ${(i / 6) * 100}%`).join(', ')
  return (
    <div className="drive" style={{ '--sky': `linear-gradient(90deg, ${stops})` } as CSSProperties}>
      <div className="drive-ends">
        <p><small>{fmtTime(depart)}</small>{leg.from.place || '출발'}</p>
        <p><small>{fmtTime(arrive)}</small>{leg.to.place || '도착'}</p>
      </div>
      <RouteShape coords={r.coords} color={dayColor(leg.day)} className="drive-shape" />
      <div className="drive-num">
        <b>{Math.round(r.km).toLocaleString()}<i>km</i></b>
        <small>🚐 {fmtDrive(r.min)} 주행{r.straight ? ' · 추정' : ''}</small>
      </div>
      <div className="drive-sky" />
    </div>
  )
}

export default function DayArticle({ day, last, moments, legs, route, title, note, onTitle, onNote, onOpen }: Props) {
  const atNight = (m: Moment) => !last && isNightMoment(m)
  const dayMoments = moments.filter((m) => !atNight(m))
  const nightMoments = moments.filter(atNight)
  const legTo = (m: Moment) => legs.find((l) => l.to.id === m.id)
  const dd = dayDrive(day.index, legs, route)
  const camp = [...moments].reverse().find((m) => m.first)
  const moon = moonOf(day.date)
  const lead = moments[0]?.items.find((i) => i.kind === 'photo')

  const flow = (list: Moment[], dark?: boolean) =>
    list.map((m, k) => {
      const l = legTo(m)
      return (
        <div key={m.id}>
          {l && <DriveBand leg={l} route={route} />}
          <MomentBlock m={m} onOpen={onOpen} dark={dark} flip={k % 2 === 1} />
        </div>
      )
    })

  return (
    <section className="day" id={`day-${day.index}`} style={{ '--c': dayColor(day.index) } as CSSProperties}>
      <header className="opener">
        <div className="op-text">
          <p className="kicker">DAY {String(day.index + 1).padStart(2, '0')} — {fmtDate(day.date)}</p>
          <input className="op-title" value={title} placeholder="이 날의 제목" onChange={(e) => onTitle(e.target.value)} />
          <p className="standfirst">
            {moments[0]?.place || '출발'}에서 {moments.at(-1)?.place || '도착'}까지,
            {' '}<b>{Math.round(dd.km).toLocaleString()}km</b>를 {fmtDrive(dd.min)} 동안 달렸다.
            {' '}{moments.length}개의 장면, {day.items.length}컷.
          </p>
          <div className="op-day-no">{day.index + 1}</div>
        </div>
        {lead && (
          <button className="op-img" onClick={() => onOpen(lead.id)}>
            <img src={lead.src} alt="" />
          </button>
        )}
      </header>

      <div className="flow">{flow(dayMoments)}</div>

      {!last && (
        <div className="night">
          <div className="night-stars" aria-hidden />
          <header className="night-head">
            <div className="night-no">{day.index + 1}<small>박</small></div>
            <div className="night-info">
              <p className="kicker light">NIGHT {day.index + 1}</p>
              <p className="night-place">{camp?.place || '차박지'}</p>
              <p className="night-moon">{moon.emoji} {moon.name} · 월령 {moon.age}일</p>
              <textarea className="night-note" value={note} rows={2} placeholder="그 밤의 기록 — 기온, 소리, 먹은 것…" onChange={(e) => onNote(e.target.value)} />
            </div>
          </header>
          <div className="flow">{flow(nightMoments, true)}</div>
        </div>
      )}
    </section>
  )
}
