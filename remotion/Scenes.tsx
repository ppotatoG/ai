import { AbsoluteFill, Img, interpolate, OffthreadVideo, staticFile, useCurrentFrame } from 'remotion'
import { KoreaMap, along } from './KoreaMap'
import { C, SAFE, cityOf, fonts, mdDate, shortPlace, stampDate, stampTime, weekday } from './theme'
import type { Clip, TripData } from './data'
import { dayKm, kmScale, totalKm, type Leg, type Moment } from './edl'

const W = 1080, H = 1920
const fmtMin = (m: number) => `${Math.floor(m / 60)}h ${String(Math.round(m % 60)).padStart(2, '0')}m`
const fadeIn = (f: number, at = 0, len = 8) => interpolate(f, [at, at + len], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

/** 작은 글씨 한 줄 */
const label = { fontFamily: fonts.sans, fontWeight: 500, color: C.white, textShadow: '0 1px 12px rgba(0,0,0,0.45)', letterSpacing: 1 } as const
const mono = { fontFamily: fonts.mono, color: C.white, letterSpacing: 3 } as const

export function Grain() {
  const f = useCurrentFrame()
  return (
    <svg width={W} height={H} style={{ position: 'absolute', inset: 0, mixBlendMode: 'overlay', opacity: 0.18, pointerEvents: 'none' }}>
      <filter id="g"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={f % 8} /><feColorMatrix type="saturate" values="0" /></filter>
      <rect width={W} height={H} filter="url(#g)" />
    </svg>
  )
}

/** 디카 날짜 스탬프 — 화면에 상시 남는 유일한 정보 */
function Stamp({ t }: { t: number }) {
  return (
    <div style={{ position: 'absolute', right: SAFE.right, bottom: SAFE.bottom, fontFamily: fonts.mono, fontSize: 34, color: C.stamp, opacity: 0.92, letterSpacing: 2, textShadow: `0 0 6px ${C.stamp}aa` }}>
      {stampDate(t)}
    </div>
  )
}

/* ── 컷 ─────────────────────────────── */

export function Shot({ clip, startFrom, moment, frames, momentStart }: { clip: Clip; startFrom: number; moment: Moment; odo: number; ep: number; frames: number; momentStart: boolean }) {
  const f = useCurrentFrame()
  const src = staticFile(clip.file)
  const isPhoto = clip.kind === 'photo'
  const scale = isPhoto ? interpolate(f, [0, frames], [1.05, 1.0]) : 1
  const vol = (vf: number) => interpolate(vf, [0, 3, frames - 4, frames], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  // 장면이 바뀔 때만 장소·시각이 잠깐 떴다 사라짐
  const tag = momentStart ? Math.min(fadeIn(f, 3, 6), interpolate(f, [frames - 6, frames], [1, 0], { extrapolateLeft: 'clamp' })) : 0
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      <AbsoluteFill style={{ transform: `scale(${scale})` }}>
        {isPhoto
          ? <Img src={src} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <OffthreadVideo src={src} startFrom={startFrom} volume={vol} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
      </AbsoluteFill>
      {tag > 0 && moment.place && (
        <div style={{ position: 'absolute', left: SAFE.left, bottom: SAFE.bottom, opacity: tag }}>
          <div style={{ ...mono, fontSize: 24, opacity: 0.85 }}>{stampTime(moment.start)}</div>
          <div style={{ ...label, fontSize: 40, marginTop: 6 }}>{shortPlace(moment.place)}</div>
        </div>
      )}
      <Stamp t={clip.date} />
      <Grain />
    </AbsoluteFill>
  )
}

/* ── 인트로: 첫 영상 위 작은 글씨 세 줄 ─── */

export function Intro({ trip, day, cover }: { trip: TripData; day?: number; cover?: Clip }) {
  const f = useCurrentFrame()
  const isSummary = day === undefined
  const d = isSummary ? trip.days[0] : trip.days[day]
  const moments = trip.moments.filter((m) => isSummary || m.day === day)
  const from = cityOf(moments.find((m) => m.place)?.place ?? '')
  const to = cityOf([...moments].reverse().find((m) => m.place)?.place ?? '')
  const km = Math.round(isSummary ? totalKm(trip) : dayKm(trip, day))
  const title = isSummary ? trip.title : trip.dayTitles[String(day)] || (from && to && from !== to ? `${from} → ${to}` : from)
  const top = isSummary ? `${trip.days.length - 1}N ${trip.days.length}D` : `EP.${String(day + 1).padStart(2, '0')}`
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      {cover && (
        <AbsoluteFill style={{ opacity: 0.55 }}>
          {cover.kind === 'video'
            ? <OffthreadVideo src={staticFile(cover.file)} muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <Img src={staticFile(cover.file)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
        </AbsoluteFill>
      )}
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <div style={{ ...mono, fontSize: 26, opacity: fadeIn(f, 4) }}>{top}</div>
        <div style={{ ...label, fontSize: 64, fontWeight: 500, marginTop: 22, opacity: fadeIn(f, 10), letterSpacing: -0.5 }}>{title}</div>
        <div style={{ ...mono, fontSize: 24, marginTop: 22, opacity: fadeIn(f, 16) * 0.8 }}>{mdDate(d.date)} {weekday(d.date)}  ·  {km.toLocaleString()} KM</div>
      </AbsoluteFill>
      <Grain />
    </AbsoluteFill>
  )
}

/* ── 주행: 검은 바탕, 얇은 흰 선 ─────────── */

export function Drive({ trip, leg, frames, places }: { trip: TripData; leg: Leg; odo: number; frames: number; places: [string, string] }) {
  const f = useCurrentFrame()
  const t = interpolate(f, [4, frames - 6], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: (x) => (x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2) })
  const km = leg.km * kmScale(trip)
  const prior = trip.legs.filter((l) => l.day < leg.day || (l.day === leg.day && trip.legs.indexOf(l) < trip.legs.indexOf(leg)))
  const fit = trip.legs.filter((l) => l.day === leg.day).flatMap((l) => l.coords)
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      <KoreaMap
        width={W}
        height={H}
        fit={fit.length > 1 ? fit : leg.coords}
        pad={0.2}
        minimal
        lines={[
          ...prior.map((l) => ({ coords: l.coords, color: 'rgba(255,255,255,0.28)', width: 2.5 })),
          { coords: leg.coords, color: '#fff', progress: t, width: 4 },
        ]}
        dot={along(leg.coords, t)}
      />
      <div style={{ position: 'absolute', left: SAFE.left, top: SAFE.top, opacity: fadeIn(f, 2) }}>
        <div style={{ ...label, fontSize: 40 }}>{places[0]} → {places[1]}</div>
        <div style={{ ...mono, fontSize: 24, marginTop: 10, opacity: 0.7 }}>{fmtMin(leg.min)}</div>
      </div>
      <div style={{ position: 'absolute', left: SAFE.left, bottom: SAFE.bottom, ...mono, fontSize: 30 }}>+{Math.round(km * t).toLocaleString()} KM</div>
      <Grain />
    </AbsoluteFill>
  )
}

/* ── 밤 ──────────────────────────────── */

export function Night({ day, moment, frames }: { day: number; moment?: Moment; frames: number }) {
  const f = useCurrentFrame()
  const o = Math.min(fadeIn(f, 0, 10), interpolate(f, [frames - 8, frames], [1, 0], { extrapolateLeft: 'clamp' }))
  return (
    <AbsoluteFill style={{ background: '#000', alignItems: 'center', justifyContent: 'center', textAlign: 'center', opacity: o }}>
      <div style={{ ...mono, fontSize: 26, opacity: 0.7 }}>NIGHT {day + 1}</div>
      {moment?.place && <div style={{ ...label, fontSize: 52, marginTop: 20 }}>{shortPlace(moment.place)}</div>}
      {moment && <div style={{ ...mono, fontSize: 24, marginTop: 18, opacity: 0.6 }}>{stampTime(moment.start)}{moment.weather ? `  ·  ${Math.round(moment.weather.temp)}°C` : ''}</div>}
      <Grain />
    </AbsoluteFill>
  )
}

/* ── 요약본: 하루 구분 ─────────────────── */

export function DayCard({ trip, day }: { trip: TripData; day: number }) {
  const f = useCurrentFrame()
  const d = trip.days[day]
  return (
    <AbsoluteFill style={{ background: '#000', alignItems: 'center', justifyContent: 'center', textAlign: 'center', opacity: fadeIn(f, 0, 5) }}>
      <div style={{ ...mono, fontSize: 30 }}>EP.{String(day + 1).padStart(2, '0')}</div>
      <div style={{ ...mono, fontSize: 22, marginTop: 14, opacity: 0.6 }}>{mdDate(d.date)} {weekday(d.date)}  ·  {Math.round(dayKm(trip, day))} KM</div>
    </AbsoluteFill>
  )
}

/* ── 엔딩 ─────────────────────────────── */

export function Outro({ trip, day, frames }: { trip: TripData; day?: number; frames: number }) {
  const f = useCurrentFrame()
  const isSummary = day === undefined
  const isLast = day === trip.days.length - 1
  if (!isSummary && !isLast) {
    const next = trip.days[day + 1]
    const nextPlace = cityOf(trip.moments.find((m) => m.day === day + 1 && m.place)?.place ?? '')
    return (
      <AbsoluteFill style={{ background: '#000', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <div style={{ ...mono, fontSize: 24, opacity: fadeIn(f, 2) * 0.6 }}>NEXT</div>
        <div style={{ ...mono, fontSize: 34, marginTop: 14, opacity: fadeIn(f, 6) }}>EP.{String(day + 2).padStart(2, '0')}</div>
        <div style={{ ...label, fontSize: 44, marginTop: 18, opacity: fadeIn(f, 10) }}>{nextPlace}, {mdDate(next.date)}</div>
        <Grain />
      </AbsoluteFill>
    )
  }
  const t = interpolate(f, [0, frames * 0.6], [0, 1], { extrapolateRight: 'clamp' })
  const fit = trip.legs.flatMap((l) => l.coords)
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      {fit.length > 1 && <KoreaMap width={W} height={H} fit={fit} pad={0.14} minimal lines={trip.legs.map((l) => ({ coords: l.coords, color: '#fff', width: 3, progress: t }))} />}
      <div style={{ position: 'absolute', left: SAFE.left, bottom: SAFE.bottom, opacity: fadeIn(f, 10) }}>
        <div style={{ ...mono, fontSize: 30 }}>{Math.round(totalKm(trip)).toLocaleString()} KM</div>
        <div style={{ ...mono, fontSize: 22, marginTop: 10, opacity: 0.6 }}>{trip.days.length - 1}N {trip.days.length}D  ·  {trip.regions.length} REGIONS  ·  {trip.items.length} CLIPS</div>
      </div>
      <Grain />
    </AbsoluteFill>
  )
}
