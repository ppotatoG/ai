import { AbsoluteFill, Img, interpolate, OffthreadVideo, random, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion'
import { KoreaMap, along } from './KoreaMap'
import { SevenSeg } from './SevenSeg'
import { C, SAFE, cityOf, dayColor, fonts, isRainy, mdDate, shortPlace, stampDate, stampTime, weekday, wxIcon } from './theme'
import type { Clip, TripData } from './data'
import { dayKm, kmScale, totalKm, type Leg, type Moment } from './edl'
import { moonOf } from '../src/lib/moon'

const W = 1080, H = 1920
const pad4 = (n: number) => String(Math.round(n)).padStart(4, ' ')
const fmtMin = (m: number) => `${Math.floor(m / 60)}h ${String(Math.round(m % 60)).padStart(2, '0')}m`

/* ── 공통 질감 ───────────────────────── */

export function Grain({ strength = 0.12 }: { strength?: number }) {
  const f = useCurrentFrame()
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <svg width={W} height={H} style={{ position: 'absolute', inset: 0, mixBlendMode: 'overlay', opacity: strength * 3 }}>
        <filter id="g"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={f % 12} /><feColorMatrix type="saturate" values="0" /></filter>
        <rect width={W} height={H} filter="url(#g)" />
      </svg>
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse 85% 70% at 50% 45%, transparent 55%, rgba(0,0,0,0.55) 100%)' }} />
    </AbsoluteFill>
  )
}

export function Rain({ heavy = 1 }: { heavy?: number }) {
  const f = useCurrentFrame()
  const drops = Array.from({ length: Math.round(110 * heavy) }, (_, i) => {
    const x = random(`x${i}`) * (W + 300) - 150
    const speed = 55 + random(`s${i}`) * 45
    const y = ((random(`y${i}`) * (H + 400) + f * speed) % (H + 400)) - 200
    const len = 50 + random(`l${i}`) * 70
    return <line key={i} x1={x} y1={y} x2={x - len * 0.18} y2={y + len} stroke="rgba(200,225,255,0.45)" strokeWidth={1.6 + random(`w${i}`) * 1.4} strokeLinecap="round" />
  })
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <AbsoluteFill style={{ background: 'linear-gradient(rgba(20,40,70,0.28), rgba(10,20,40,0.12))' }} />
      <svg width={W} height={H}>{drops}</svg>
    </AbsoluteFill>
  )
}

/** 디카 날짜 스탬프 */
function Stamp({ t }: { t: number }) {
  return (
    <div style={{ position: 'absolute', right: SAFE.right + 10, bottom: SAFE.bottom, textAlign: 'right' }}>
      <div style={{ fontFamily: fonts.mono, fontWeight: 700, fontSize: 46, color: C.stamp, letterSpacing: 2, textShadow: `0 0 10px ${C.stamp}, 0 0 2px #000` }}>{stampDate(t)}</div>
      <div style={{ fontFamily: fonts.mono, fontWeight: 700, fontSize: 34, color: C.stamp, opacity: 0.85, textShadow: `0 0 8px ${C.stamp}` }}>{stampTime(t)}</div>
    </div>
  )
}

/** 화면 위 정보: EP·장소·날씨·누적 주행거리 */
function HUD({ ep, moment, odo, t, enter }: { ep: number; moment: Moment; odo: number; t: number; enter: number }) {
  const wx = moment.weather
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', left: SAFE.left, top: SAFE.top, transform: `translateY(${(1 - enter) * -20}px)`, opacity: enter }}>
        <div style={{ display: 'inline-block', fontFamily: fonts.mono, fontWeight: 700, fontSize: 28, color: C.ink, background: dayColor(ep - 1), padding: '6px 14px', borderRadius: 999, letterSpacing: 2 }}>EP.{String(ep).padStart(2, '0')}</div>
        {moment.place && (
          <div style={{ marginTop: 14, fontFamily: fonts.sans, fontWeight: 900, fontSize: 52, color: C.white, textShadow: '0 2px 18px rgba(0,0,0,0.7)', letterSpacing: -1 }}>
            📍 {shortPlace(moment.place)}
          </div>
        )}
      </div>
      {wx && (
        <div style={{ position: 'absolute', right: SAFE.left, top: SAFE.top, fontFamily: fonts.mono, fontWeight: 700, fontSize: 40, color: C.white, textShadow: '0 2px 12px rgba(0,0,0,0.7)', opacity: enter }}>
          {wxIcon(wx.code)} {Math.round(wx.temp)}°
        </div>
      )}
      <div style={{ position: 'absolute', left: SAFE.left, bottom: SAFE.bottom, display: 'flex', alignItems: 'center', gap: 14 }}>
        <span style={{ fontFamily: fonts.mono, fontWeight: 700, fontSize: 24, color: C.lcd, letterSpacing: 3 }}>ODO</span>
        <SevenSeg text={pad4(odo)} height={44} color={C.lcd} />
        <span style={{ fontFamily: fonts.mono, fontSize: 24, color: C.lcd }}>km</span>
      </div>
      <Stamp t={t} />
    </AbsoluteFill>
  )
}

/* ── 컷 ─────────────────────────────── */

export function Shot({ clip, startFrom, moment, odo, ep, frames, momentStart }: { clip: Clip; startFrom: number; moment: Moment; odo: number; ep: number; frames: number; momentStart: boolean }) {
  const f = useCurrentFrame()
  const src = staticFile(clip.file)
  const isPhoto = clip.kind === 'photo'
  const enter = momentStart ? spring({ frame: f, fps: 30, config: { damping: 18 } }) : 1
  // 사진: 플래시 + 천천히 밀기 / 영상: 아주 약한 줌
  const scale = isPhoto ? interpolate(f, [0, frames], [1.08, 1.0]) : interpolate(f, [0, frames], [1.0, 1.03])
  const flash = isPhoto ? interpolate(f, [0, 2, 6], [0.85, 0.5, 0], { extrapolateRight: 'clamp' }) : 0
  const vol = (vf: number) => interpolate(vf, [0, 3, frames - 4, frames], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const grade = 'contrast(1.06) saturate(1.08) brightness(1.02)'
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <AbsoluteFill style={{ transform: `scale(${scale})`, filter: grade }}>
        {isPhoto
          ? <Img src={src} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <OffthreadVideo src={src} startFrom={startFrom} volume={vol} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
      </AbsoluteFill>
      {isRainy(moment.weather?.code, moment.weather?.precip) && <Rain heavy={Math.min(1.6, 0.6 + (moment.weather?.precip ?? 0.5))} />}
      <AbsoluteFill style={{ background: 'linear-gradient(rgba(0,0,0,0.35), transparent 22%, transparent 70%, rgba(0,0,0,0.5))' }} />
      <HUD ep={ep} moment={moment} odo={odo} t={clip.date} enter={enter} />
      <AbsoluteFill style={{ background: '#fff', opacity: flash }} />
    </AbsoluteFill>
  )
}

/* ── 인트로: 계기판 ───────────────────── */

export function Intro({ trip, day }: { trip: TripData; day?: number }) {
  const f = useCurrentFrame()
  const { fps } = useVideoConfig()
  const isSummary = day === undefined
  const d = isSummary ? trip.days[0] : trip.days[day]
  const moments = trip.moments.filter((m) => isSummary || m.day === day)
  const km = isSummary ? totalKm(trip) : dayKm(trip, day)
  const roll = interpolate(f, [8, fps * 1.8], [0, km], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: (t) => 1 - (1 - t) ** 3 })
  const pop = spring({ frame: f, fps, config: { damping: 14 } })
  const from = cityOf(moments.find((m) => m.place)?.place ?? '')
  const to = cityOf([...moments].reverse().find((m) => m.place)?.place ?? '')
  const title = isSummary ? trip.title : trip.dayTitles[String(day)] || (from && to && from !== to ? `${from} → ${to}` : from)
  const nights = trip.days.length - 1
  const color = isSummary ? C.lcd : dayColor(day)
  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 40%, ${C.blueDeep} 0%, ${C.night} 70%)`, alignItems: 'center', justifyContent: 'center', color: C.white }}>
      <div style={{ position: 'absolute', top: SAFE.top, fontFamily: fonts.mono, fontSize: 30, letterSpacing: 10, color: C.blue, opacity: pop }}>TRUNK DIARY</div>
      <div style={{ transform: `scale(${0.85 + pop * 0.15})`, opacity: pop, textAlign: 'center' }}>
        <div style={{ fontFamily: fonts.title, fontSize: isSummary ? 150 : 210, lineHeight: 1, color, textShadow: `0 0 40px ${color}66` }}>
          {isSummary ? `${nights}박 ${trip.days.length}일` : `EP.${String(day + 1).padStart(2, '0')}`}
        </div>
        <div style={{ marginTop: 36, fontFamily: fonts.sans, fontWeight: 900, fontSize: 64, letterSpacing: -1 }}>{title}</div>
        <div style={{ marginTop: 16, fontFamily: fonts.mono, fontSize: 34, color: C.blue, letterSpacing: 4 }}>{mdDate(d.date)} {weekday(d.date)}</div>
      </div>
      <div style={{ position: 'absolute', bottom: SAFE.bottom + 40, display: 'flex', alignItems: 'flex-end', gap: 20, padding: '28px 40px', borderRadius: 28, background: 'rgba(0,0,0,0.45)', border: '2px solid rgba(255,179,71,0.25)' }}>
        <span style={{ fontFamily: fonts.mono, fontWeight: 700, fontSize: 30, color: C.lcd, letterSpacing: 4, paddingBottom: 6 }}>{isSummary ? 'ODO' : 'TRIP'}</span>
        <SevenSeg text={pad4(roll)} height={150} color={C.lcd} />
        <span style={{ fontFamily: fonts.mono, fontWeight: 700, fontSize: 36, color: C.lcd, paddingBottom: 6 }}>km</span>
      </div>
      <Grain strength={0.08} />
    </AbsoluteFill>
  )
}

/* ── 주행 장면: 지도 위를 달리는 밴 ─────── */

export function Drive({ trip, leg, odo, frames, places }: { trip: TripData; leg: Leg; odo: number; frames: number; places: [string, string] }) {
  const f = useCurrentFrame()
  const t = interpolate(f, [6, frames - 8], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: (x) => (x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2) })
  const k = kmScale(trip)
  const km = leg.km * k
  const dayLegs = trip.legs.filter((l) => l.day === leg.day)
  const before = trip.legs.filter((l) => l.day < leg.day)
  const fit = dayLegs.flatMap((l) => l.coords)
  const enter = spring({ frame: f, fps: 30, config: { damping: 20 } })
  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 45%, #10203a 0%, ${C.night} 75%)` }}>
      <KoreaMap
        width={W}
        height={H}
        fit={fit}
        pad={0.16}
        lit={trip.regions}
        lines={[
          ...before.map((l) => ({ coords: l.coords, color: dayColor(l.day), width: 5, dim: true })),
          ...dayLegs.filter((l) => l.key !== leg.key).map((l) => ({ coords: l.coords, color: dayColor(l.day), width: 5, dim: true })),
          { coords: leg.coords, color: dayColor(leg.day), progress: t, width: 9 },
        ]}
        van={along(leg.coords, t)}
      />
      <div style={{ position: 'absolute', left: SAFE.left, right: SAFE.left, top: SAFE.top, opacity: enter }}>
        <div style={{ fontFamily: fonts.sans, fontWeight: 900, fontSize: 58, color: C.white, letterSpacing: -1 }}>{places[0]} <span style={{ color: dayColor(leg.day) }}>→</span> {places[1]}</div>
        <div style={{ marginTop: 10, fontFamily: fonts.mono, fontSize: 32, color: C.blue }}>🚐 {fmtMin(leg.min)} DRIVE{leg.straight ? ' (est.)' : ''}</div>
      </div>
      <div style={{ position: 'absolute', left: SAFE.left, bottom: SAFE.bottom, display: 'flex', alignItems: 'flex-end', gap: 16 }}>
        <span style={{ fontFamily: fonts.mono, fontWeight: 700, fontSize: 30, color: dayColor(leg.day), paddingBottom: 8 }}>+</span>
        <SevenSeg text={pad4(km * t)} height={130} color={dayColor(leg.day)} />
        <span style={{ fontFamily: fonts.mono, fontWeight: 700, fontSize: 34, color: dayColor(leg.day), paddingBottom: 8 }}>km</span>
      </div>
      <div style={{ position: 'absolute', right: SAFE.right, bottom: SAFE.bottom + 10, fontFamily: fonts.mono, fontSize: 26, color: C.lcd, opacity: 0.8 }}>ODO {Math.round(odo - km + km * t)}</div>
      <Grain strength={0.07} />
    </AbsoluteFill>
  )
}

/* ── 밤 카드 ──────────────────────────── */

export function Night({ day, moment, frames }: { day: number; moment?: Moment; frames: number }) {
  const f = useCurrentFrame()
  const pop = spring({ frame: f - 4, fps: 30, config: { damping: 16 } })
  const date = moment?.start ?? Date.now()
  const moon = moonOf(new Date(date))
  const fade = interpolate(f, [frames - 6, frames], [1, 0], { extrapolateLeft: 'clamp' })
  const stars = Array.from({ length: 160 }, (_, i) => {
    const tw = 0.4 + 0.6 * Math.abs(Math.sin(f / (8 + random(`t${i}`) * 14) + random(`p${i}`) * 6))
    return <circle key={i} cx={random(`x${i}`) * W} cy={random(`y${i}`) * H * 0.8} r={0.8 + random(`r${i}`) * 2.2} fill="#fff" opacity={tw * (0.4 + random(`o${i}`) * 0.6)} />
  })
  return (
    <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 20%, #1a2550 0%, #05060f 70%)', alignItems: 'center', justifyContent: 'center', opacity: fade }}>
      <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }}>{stars}</svg>
      <div style={{ textAlign: 'center', transform: `translateY(${(1 - pop) * 40}px)`, opacity: pop }}>
        <div style={{ fontSize: 110 }}>{moon.emoji}</div>
        <div style={{ fontFamily: fonts.title, fontSize: 260, lineHeight: 1.05, color: C.lcd, textShadow: `0 0 60px ${C.lcd}88` }}>{day + 1}박</div>
        {moment?.place && <div style={{ fontFamily: fonts.sans, fontWeight: 900, fontSize: 60, color: C.white, marginTop: 10 }}>⛺ {shortPlace(moment.place)}</div>}
        <div style={{ fontFamily: fonts.mono, fontSize: 32, color: C.blue, marginTop: 22, letterSpacing: 2 }}>
          {stampTime(date)} · {moon.name}{moment?.weather ? ` · ${Math.round(moment.weather.temp)}°` : ''}
        </div>
      </div>
      <Grain strength={0.08} />
    </AbsoluteFill>
  )
}

/* ── 요약본: 하루 구분 카드 ────────────── */

export function DayCard({ trip, day }: { trip: TripData; day: number }) {
  const f = useCurrentFrame()
  const d = trip.days[day]
  const x = interpolate(f, [0, 6], [60, 0], { extrapolateRight: 'clamp' })
  return (
    <AbsoluteFill style={{ background: dayColor(day), justifyContent: 'center', padding: SAFE.left }}>
      <div style={{ transform: `translateX(${x}px)` }}>
        <div style={{ fontFamily: fonts.title, fontSize: 230, lineHeight: 1, color: C.ink }}>EP.{String(day + 1).padStart(2, '0')}</div>
        <div style={{ fontFamily: fonts.mono, fontWeight: 700, fontSize: 44, color: C.ink, marginTop: 20 }}>{mdDate(d.date)} {weekday(d.date)} · {Math.round(dayKm(trip, day))}km</div>
      </div>
    </AbsoluteFill>
  )
}

/* ── 엔딩 ─────────────────────────────── */

export function Outro({ trip, day, frames }: { trip: TripData; day?: number; frames: number }) {
  const f = useCurrentFrame()
  const pop = spring({ frame: f, fps: 30, config: { damping: 15 } })
  const isSummary = day === undefined
  const isLast = day === trip.days.length - 1
  const allLines = trip.legs.map((l) => ({ coords: l.coords, color: dayColor(l.day), width: 6, progress: isSummary ? interpolate(f, [0, frames * 0.6], [0, 1], { extrapolateRight: 'clamp' }) : 1 }))
  const fit = trip.legs.flatMap((l) => l.coords)
  if (!isSummary && !isLast) {
    const next = trip.days[day + 1]
    const nextPlace = cityOf(trip.moments.find((m) => m.day === day + 1 && m.place)?.place ?? '')
    return (
      <AbsoluteFill style={{ background: C.night, alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', opacity: pop, transform: `scale(${0.9 + pop * 0.1})` }}>
          <div style={{ fontFamily: fonts.mono, fontSize: 36, letterSpacing: 12, color: C.blue }}>NEXT</div>
          <div style={{ fontFamily: fonts.title, fontSize: 200, color: dayColor(day + 1), lineHeight: 1.1 }}>EP.{String(day + 2).padStart(2, '0')}</div>
          <div style={{ fontFamily: fonts.sans, fontWeight: 900, fontSize: 56, color: C.white }}>{nextPlace} · {mdDate(next.date)}</div>
          <div style={{ fontFamily: fonts.mono, fontSize: 30, color: C.lcd, marginTop: 40 }}>ODO {Math.round(trip.days.filter((x) => x.index <= day).reduce((s, x) => s + dayKm(trip, x.index), 0))} / {Math.round(totalKm(trip))} km</div>
        </div>
        <Grain strength={0.08} />
      </AbsoluteFill>
    )
  }
  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 45%, #10203a 0%, ${C.night} 75%)` }}>
      {fit.length > 1 && <KoreaMap width={W} height={H} fit={fit} pad={0.12} lit={trip.regions} lines={allLines} labels />}
      <div style={{ position: 'absolute', left: SAFE.left, right: SAFE.left, top: SAFE.top, opacity: pop }}>
        <div style={{ fontFamily: fonts.title, fontSize: 120, color: C.white, lineHeight: 1 }}>FIN.</div>
        <div style={{ fontFamily: fonts.mono, fontSize: 34, color: C.blue, marginTop: 16 }}>{trip.days.length - 1}N{trip.days.length}D · {trip.regions.length} REGIONS · {trip.items.length} CLIPS</div>
      </div>
      <div style={{ position: 'absolute', left: SAFE.left, bottom: SAFE.bottom, display: 'flex', alignItems: 'flex-end', gap: 18, opacity: pop }}>
        <span style={{ fontFamily: fonts.mono, fontWeight: 700, fontSize: 30, color: C.lcd, paddingBottom: 8 }}>ODO</span>
        <SevenSeg text={pad4(totalKm(trip))} height={140} color={C.lcd} />
        <span style={{ fontFamily: fonts.mono, fontWeight: 700, fontSize: 34, color: C.lcd, paddingBottom: 8 }}>km</span>
      </div>
      <Grain strength={0.07} />
    </AbsoluteFill>
  )
}
