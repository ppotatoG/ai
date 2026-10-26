import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import RouteShape from './RouteShape'
import Ticket from './Ticket'
import { moonOf } from '../lib/moon'
import { fmtDrive } from '../lib/routing'
import { dayColor, type RouteFn } from '../lib/stats'
import { fmtDate, fmtTime, hasGeo, hourOf } from '../lib/trip'
import type { Day, Leg, MediaItem, Moment, TripMeta } from '../lib/types'

type Slide =
  | { kind: 'title'; day: Day }
  | { kind: 'media'; day: number; item: MediaItem }
  | { kind: 'drive'; day: number; leg: Leg }
  | { kind: 'night'; day: Day; place: string }
  | { kind: 'end' }

const dayOf = (s: Slide) => (s.kind === 'end' ? -1 : typeof s.day === 'number' ? s.day : s.day.index)

const durOf = (s: Slide) =>
  s.kind === 'title' ? 3000 : s.kind === 'night' ? 3400 : s.kind === 'drive' ? 3800 : s.kind === 'end' ? Infinity
    : s.item.kind === 'video' ? Math.min((s.item.duration ?? 8) * 1000, s.item.demo ? 7000 : 20000) : 4200

interface Props { days: Day[]; meta: TripMeta; items: MediaItem[]; moments: Moment[]; legs: Leg[]; route: RouteFn; onClose: () => void }

export default function Player({ days, meta, items, moments, legs, route, onClose }: Props) {
  const slides = useMemo<Slide[]>(() => {
    const out: Slide[] = []
    for (const day of days) {
      const last = day.index === days.length - 1
      out.push({ kind: 'title', day })
      const ms = moments.filter((m) => m.day === day.index)
      let nightShown = false
      for (const m of ms) {
        const night = !last && (hourOf(m.start) >= 19 || hourOf(m.start) < 4)
        const leg = legs.find((l) => l.to.id === m.id)
        if (leg && route(leg).km > 15) out.push({ kind: 'drive', day: day.index, leg })
        if (night && !nightShown) {
          nightShown = true
          out.push({ kind: 'night', day, place: [...ms].reverse().find((x) => x.first)?.place ?? '' })
        }
        m.items.forEach((item) => out.push({ kind: 'media', day: day.index, item }))
      }
      if (!last && !nightShown) out.push({ kind: 'night', day, place: [...ms].reverse().find((x) => x.first)?.place ?? '' })
    }
    out.push({ kind: 'end' })
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days, moments, legs])

  const [i, setI] = useState(0)
  const [paused, setPaused] = useState(false)
  const [progress, setProgress] = useState(0)
  const elapsed = useRef(0)
  const video = useRef<HTMLVideoElement>(null)
  const s = slides[i]
  const realVideo = s.kind === 'media' && s.item.kind === 'video' && !s.item.demo

  const go = useCallback((d: number) => setI((x) => Math.max(0, Math.min(slides.length - 1, x + d))), [slides.length])

  useEffect(() => { elapsed.current = 0; setProgress(0) }, [i])

  useEffect(() => {
    let raf = 0
    let last = performance.now()
    const dur = durOf(s)
    const tick = (now: number) => {
      const dt = now - last
      last = now
      if (!paused) {
        elapsed.current += dt
        const v = video.current
        const p = realVideo && v?.duration ? v.currentTime / Math.min(v.duration, dur / 1000) : elapsed.current / dur
        setProgress(Math.min(1, p))
        if (p >= 1) { go(1); return }
      }
      raf = requestAnimationFrame(tick)
    }
    if (isFinite(dur)) raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [s, paused, realVideo, go])

  useEffect(() => {
    if (!video.current) return
    if (paused) video.current.pause()
    else video.current.play().catch(() => {})
  }, [paused, i])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowRight') go(1)
      else if (e.key === 'ArrowLeft') go(-1)
      else if (e.key === ' ') { e.preventDefault(); setPaused((p) => !p) }
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [go, onClose])

  // 다음 사진 미리 불러오기
  useEffect(() => {
    const n = slides[i + 1]
    if (n?.kind === 'media' && n.item.kind === 'photo') new Image().src = n.item.src
  }, [i, slides])

  const here: [number, number] | undefined =
    s.kind === 'media' && hasGeo(s.item) ? [s.item.lat, s.item.lng] : s.kind === 'drive' ? s.leg.b : undefined
  const ken = useMemo(() => ({ '--kx': `${(Math.random() - 0.5) * 5}%`, '--ky': `${(Math.random() - 0.5) * 5}%`, '--ks': Math.random() < 0.5 ? 1.1 : 1.0, '--ke': Math.random() < 0.5 ? 1.0 : 1.1 }), [i])

  return (
    <div className="player" onClick={() => setPaused((p) => !p)}>
      <div className="bars" onClick={(e) => e.stopPropagation()}>
        {days.map((d) => {
          const idx = slides.map((sl, k) => [sl, k] as const).filter(([sl]) => dayOf(sl) === d.index)
          const first = idx[0]?.[1] ?? 0
          const lastK = idx.at(-1)?.[1] ?? 0
          const p = i > lastK ? 1 : i < first ? 0 : (i - first + progress) / (lastK - first + 1)
          return (
            <button key={d.key} className="seg" style={{ '--c': dayColor(d.index) } as CSSProperties} onClick={() => setI(first)}>
              <i style={{ transform: `scaleX(${p})` }} />
              <span>DAY {d.index + 1}</span>
            </button>
          )
        })}
      </div>

      <div className={`slide s-${s.kind}`} key={i}>
        {s.kind === 'title' && (
          <div className="card title-card" style={{ '--c': dayColor(s.day.index) } as CSSProperties}>
            <p className="tc-no">DAY {String(s.day.index + 1).padStart(2, '0')}</p>
            <h2>{meta.dayTitles[s.day.index] || fmtDate(s.day.date)}</h2>
            <p className="tc-date">{fmtDate(s.day.date)}</p>
          </div>
        )}
        {s.kind === 'drive' && <DriveSlide leg={s.leg} route={route} />}
        {s.kind === 'night' && (
          <div className="card night-card">
            <div className="night-stars" />
            <p className="nc-moon">{moonOf(s.day.date).emoji}</p>
            <h2>{s.day.index + 1}박</h2>
            <p className="nc-place">{s.place || '차박지'}</p>
            {meta.nightNotes[s.day.index] && <p className="nc-note">{meta.nightNotes[s.day.index]}</p>}
          </div>
        )}
        {s.kind === 'media' && (
          <>
            {!realVideo && <div className="bg-blur" style={{ backgroundImage: `url("${s.item.thumb ?? s.item.src}")` }} />}
            {realVideo
              ? <video ref={video} className="fg" src={s.item.src} autoPlay playsInline onEnded={() => go(1)} />
              : <img className="fg ken" src={s.item.src} alt="" style={{ ...ken, animationDuration: `${durOf(s) + 800}ms`, animationPlayState: paused ? 'paused' : 'running' } as CSSProperties} />}
            <div className="p-meta">
              <span style={{ color: dayColor(s.day) }}>DAY {s.day + 1}</span>
              <span>{fmtTime(s.item.date)}</span>
              {s.item.place && <span>{s.item.place}</span>}
            </div>
            {s.item.caption && <p className="p-cap">{s.item.caption}</p>}
          </>
        )}
        {s.kind === 'end' && (
          <div className="card end-card" onClick={(e) => e.stopPropagation()}>
            <Ticket meta={meta} items={items} days={days} legs={legs} route={route} compact />
            <div className="end-actions">
              <button className="primary" onClick={() => setI(0)}>처음부터</button>
              <button className="ghost light" onClick={onClose}>닫기</button>
            </div>
          </div>
        )}
      </div>

      {s.kind !== 'end' && <MiniMap legs={legs} route={route} here={here} />}
      {paused && s.kind !== 'end' && <div className="paused">❚❚</div>}
      <button className="p-close" onClick={(e) => { e.stopPropagation(); onClose() }} aria-label="닫기">✕</button>
      <button className="p-nav l" onClick={(e) => { e.stopPropagation(); go(-1) }} aria-label="이전">‹</button>
      <button className="p-nav r" onClick={(e) => { e.stopPropagation(); go(1) }} aria-label="다음">›</button>
    </div>
  )
}

function DriveSlide({ leg, route }: { leg: Leg; route: RouteFn }) {
  const r = route(leg)
  const [km, setKm] = useState(0)
  useEffect(() => {
    let raf = 0
    const t0 = performance.now()
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / 2600)
      setKm(Math.round(r.km * (1 - (1 - k) ** 3)))
      if (k < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [r.km])
  return (
    <div className="card drive-card" style={{ '--c': dayColor(leg.day) } as CSSProperties}>
      <RouteShape coords={r.coords} color={dayColor(leg.day)} className="dc-shape" animate />
      <div className="dc-text">
        <p className="dc-route"><span>{leg.from.place || '출발'}</span><i>→</i><span>{leg.to.place || '도착'}</span></p>
        <p className="dc-km">{km.toLocaleString()}<small>km</small></p>
        <p className="dc-time">{fmtTime(leg.from.end)} 출발 · {fmtDrive(r.min)} · {fmtTime(leg.to.start)} 도착</p>
      </div>
    </div>
  )
}

/** 재생 중 우측 상단 전체 경로 + 현재 위치 */
function MiniMap({ legs, route, here }: { legs: Leg[]; route: RouteFn; here?: [number, number] }) {
  const all = legs.flatMap((l) => route(l).coords)
  if (all.length < 2) return null
  const lats = all.map((p) => p[0]), lngs = all.map((p) => p[1])
  const [la0, la1, ln0, ln1] = [Math.min(...lats), Math.max(...lats), Math.min(...lngs), Math.max(...lngs)]
  const span = Math.max(la1 - la0, (ln1 - ln0) * 0.8, 0.01)
  const xy = ([la, ln]: [number, number]) => [10 + (((ln - ln0) * 0.8) / span) * 100, 10 + ((la1 - la) / span) * 100]
  return (
    <svg className="minimap" viewBox="0 0 120 120">
      {legs.map((l) => (
        <polyline key={l.key} points={route(l).coords.map((c) => xy(c).join(',')).join(' ')} fill="none" stroke={dayColor(l.day)} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      ))}
      {here && (() => { const [x, y] = xy(here); return <><circle cx={x} cy={y} r="6" fill="#fff" opacity="0.3" className="pulse" /><circle cx={x} cy={y} r="3" fill="#fff" /></> })()}
    </svg>
  )
}
