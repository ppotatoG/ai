import type { Clip, TripData } from './data'

export const FPS = 30
const sec = (s: number) => Math.round(s * FPS)

export type Moment = TripData['moments'][number]
export type Leg = TripData['legs'][number]

export type Seg =
  | { type: 'intro'; frames: number }
  | { type: 'shot'; frames: number; clip: Clip; startFrom: number; moment: Moment; odo: number }
  | { type: 'drive'; frames: number; leg: Leg; odo: number }
  | { type: 'night'; frames: number; moment?: Moment }
  | { type: 'daycard'; frames: number; day: number }
  | { type: 'outro'; frames: number }

const hour = (t: number) => { const d = new Date(t); return d.getHours() + d.getMinutes() / 60 }
const isNight = (t: number) => hour(t) >= 19 || hour(t) < 4

/** 전체 주행거리를 config 값(예: 2000km)에 맞춰 보정. 자료가 아직 덜 모였으면 보정 안 함 */
export function kmScale(trip: TripData) {
  const routed = trip.legs.reduce((s, l) => s + l.km, 0)
  if (!trip.odometer || !routed) return 1
  const r = trip.odometer / routed
  return r > 0.8 && r < 2.2 ? r : 1
}
export const dayKm = (trip: TripData, day: number) => trip.legs.filter((l) => l.day === day).reduce((s, l) => s + l.km, 0) * kmScale(trip)
export const totalKm = (trip: TripData) => (kmScale(trip) !== 1 && trip.odometer ? trip.odometer : trip.legs.reduce((s, l) => s + l.km, 0))

interface Cand { clip: Clip; moment: Moment; len: number; max: number }

const baseLen = (c: Clip) => (c.kind === 'video' ? Math.min(Math.max((c.duration ?? 2) - 0.3, 0.6), 1.2) : 0.7)
const maxLen = (c: Clip) => (c.kind === 'video' ? Math.min((c.duration ?? 2) - 0.2, 1.8) : 0.9)

/** 예산(초)에 맞게 컷 고르기: 장면마다 최소 1컷, 많은 장면부터 덜어냄 */
function pick(cands: Cand[], budget: number): Cand[] {
  let list = [...cands]
  const total = () => list.reduce((s, c) => s + c.len, 0)
  while (total() > budget) {
    const counts = new Map<string, number>()
    list.forEach((c) => counts.set(c.moment.id, (counts.get(c.moment.id) ?? 0) + 1))
    const [mid, n] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]
    if (n <= 1) break
    // 그 장면에서 사진 먼저, 그다음 이웃과 시간이 가장 붙은 컷 제거
    const inM = list.filter((c) => c.moment.id === mid)
    let victim = inM.find((c) => c.clip.kind === 'photo')
    if (!victim) {
      let bi = 1
      for (let i = 2; i < inM.length; i++) if (inM[i].clip.date - inM[i - 1].clip.date < inM[bi].clip.date - inM[bi - 1].clip.date) bi = i
      victim = inM[bi]
    }
    list = list.filter((c) => c !== victim)
  }
  // 그래도 넘치면 길이를 줄이고, 그래도 넘치면 장면을 고르게 솎아냄
  if (total() > budget) list.forEach((c) => (c.len = Math.max(0.6, c.len * (budget / total()))))
  while (total() > budget && list.length > 1) list = list.filter((_, i) => i % 3 !== 1)
  // 남으면 영상 길이를 늘림
  let spare = budget - total()
  for (let pass = 0; pass < 4 && spare > 0.2; pass++)
    for (const c of list) {
      const add = Math.min(c.max - c.len, spare / list.length + 0.1)
      if (add > 0) { c.len += add; spare -= add }
    }
  return list
}

function odoAt(trip: TripData, t: number, base: number, day: number) {
  const k = kmScale(trip)
  const byId = new Map(trip.moments.map((m) => [m.id, m]))
  return base + trip.legs.filter((l) => l.day === day && (byId.get(l.to)?.start ?? Infinity) <= t).reduce((s, l) => s + l.km * k, 0)
}

export function episode(trip: TripData, day: number, target = 55): Seg[] {
  const last = day === trip.days.length - 1
  const clips = new Map(trip.items.map((c) => [c.id, c]))
  const moments = trip.moments.filter((m) => m.day === day)
  const base = trip.days.filter((d) => d.index < day).reduce((s, d) => s + dayKm(trip, d.index), 0)
  const drives = trip.legs.filter((l) => l.day === day && l.km > 20).sort((a, b) => b.km - a.km).slice(0, 3)
  // 그날 밤 잔 곳 = 마지막 장면. 밤에 찍은 장면이면 그 앞에 '1박' 카드, 아니면 끝에
  const camp = [...moments].reverse().find((m) => m.first)
  const nightAt = !last && camp && isNight(camp.start) ? camp : undefined

  const fixed = 2.2 + 2.0 + drives.length * 1.8 + (last ? 0 : 1.8)
  const cands: Cand[] = moments.flatMap((m) => m.items.map((id) => clips.get(id)!).map((clip) => ({ clip, moment: m, len: baseLen(clip), max: maxLen(clip) })))
  const chosen = pick(cands, target - fixed)

  const segs: Seg[] = [{ type: 'intro', frames: sec(2.2) }]
  let nightDone = false
  for (const m of moments) {
    const leg = drives.find((l) => l.to === m.id)
    if (leg) segs.push({ type: 'drive', frames: sec(1.8), leg, odo: odoAt(trip, m.start, base, day) })
    if (m === nightAt) { segs.push({ type: 'night', frames: sec(1.8), moment: m }); nightDone = true }
    for (const c of chosen.filter((x) => x.moment === m)) {
      const dur = c.clip.duration ?? 0
      const startFrom = c.clip.kind === 'video' ? Math.max(0, Math.min(0.15, dur - c.len)) + Math.max(0, (dur - c.len - 0.15) / 2) : 0
      segs.push({ type: 'shot', frames: Math.max(sec(c.len), 12), clip: c.clip, startFrom: sec(startFrom), moment: m, odo: odoAt(trip, c.clip.date, base, day) })
    }
  }
  if (!last && !nightDone) segs.push({ type: 'night', frames: sec(1.8), moment: camp })
  segs.push({ type: 'outro', frames: sec(2.0) })
  return segs
}

export function summary(trip: TripData, perDay = 9): Seg[] {
  const clips = new Map(trip.items.map((c) => [c.id, c]))
  const segs: Seg[] = [{ type: 'intro', frames: sec(3) }]
  let base = 0
  for (const d of trip.days) {
    segs.push({ type: 'daycard', frames: sec(0.9), day: d.index })
    const moments = trip.moments.filter((m) => m.day === d.index)
    const vids = moments.flatMap((m) => m.items.map((id) => ({ clip: clips.get(id)!, moment: m }))).filter((x) => x.clip.kind === 'video')
    const pool = vids.length >= perDay ? vids : moments.flatMap((m) => m.items.map((id) => ({ clip: clips.get(id)!, moment: m })))
    const step = pool.length / Math.min(perDay, pool.length)
    for (let i = 0; i < Math.min(perDay, pool.length); i++) {
      const { clip, moment } = pool[Math.floor(i * step)]
      const dur = clip.duration ?? 0
      segs.push({ type: 'shot', frames: sec(0.85), clip, startFrom: sec(Math.max(0, (dur - 0.85) / 2)), moment, odo: odoAt(trip, clip.date, base, d.index) })
    }
    const legs = trip.legs.filter((l) => l.day === d.index)
    if (legs.length) {
      const merged: Leg = { ...legs[0], key: `day-${d.index}`, km: dayKm(trip, d.index) / kmScale(trip), min: legs.reduce((s, l) => s + l.min, 0), coords: legs.flatMap((l) => l.coords), from: legs[0].from, to: legs[legs.length - 1].to }
      base += dayKm(trip, d.index)
      segs.push({ type: 'drive', frames: sec(1.6), leg: merged, odo: base })
    }
  }
  segs.push({ type: 'outro', frames: sec(3.2) })
  return segs
}

export const totalFrames = (segs: Seg[]) => segs.reduce((s, x) => s + x.frames, 0)

/** 오프닝 영상: config의 covers 지정 → 없으면 그날 3초 이상인 첫 영상 */
export function coverClip(trip: TripData, day?: number) {
  const key = day === undefined ? 'summary' : String(day)
  const byId = new Map(trip.items.map((c) => [c.id, c]))
  const chosen = trip.covers?.[key] && byId.get(trip.covers[key])
  if (chosen) return chosen
  const ids = day === undefined ? trip.items.map((c) => c.id) : trip.days[day].items
  const vids = ids.map((id) => byId.get(id)!).filter((c) => c.kind === 'video')
  return vids.find((c) => (c.duration ?? 0) >= 3) ?? vids[0]
}
