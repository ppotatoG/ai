// 사진·영상 폴더 → public/trip.json (+ public/media 하드링크)
// 실행: npm run ingest
import { execFile } from 'node:child_process'
import { existsSync, linkSync, copyFileSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { basename, extname, join, resolve } from 'node:path'
import { promisify } from 'node:util'
import exifr from 'exifr'
import { buildLegs, buildMoments } from '../src/lib/moments'
import { fetchRoute, straight } from '../src/lib/osrm'
import { provinceAt, provincesAlong, shortName } from '../src/lib/regions'
import { groupDays } from '../src/lib/trip'
import type { MediaItem, Route } from '../src/lib/types'
import type { TripData } from '../remotion/data'

const run = promisify(execFile)
const ROOT = resolve(import.meta.dirname, '..')
const config = JSON.parse(readFileSync(join(ROOT, 'trip.config.json'), 'utf8'))
const SRC = config.source.replace(/^~/, homedir())
const MEDIA = join(ROOT, 'public/media')
const CACHE_DIR = join(ROOT, '.cache')
mkdirSync(CACHE_DIR, { recursive: true })
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

function cache<T>(name: string) {
  const file = join(CACHE_DIR, `${name}.json`)
  const data: Record<string, T> = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {}
  return { data, save: () => writeFileSync(file, JSON.stringify(data)) }
}

type Raw = MediaItem & { file: string; w: number; h: number; source: string }

async function probeVideo(path: string) {
  const { stdout } = await run('ffprobe', ['-v', 'quiet', '-print_format', 'json', '-show_format', '-show_streams', path])
  const d = JSON.parse(stdout)
  const tags = d.format.tags ?? {}
  const v = d.streams.find((s: { codec_type: string }) => s.codec_type === 'video')
  const iso = tags['com.apple.quicktime.location.ISO6709'] as string | undefined
  const m = iso?.match(/^([+-][\d.]+)([+-][\d.]+)/)
  const when = tags['com.apple.quicktime.creationdate'] ?? tags.creation_time
  return {
    date: Date.parse(String(when).replace(/([+-]\d{2})(\d{2})$/, '$1:$2')),
    lat: m ? Number(m[1]) : undefined,
    lng: m ? Number(m[2]) : undefined,
    duration: Number(d.format.duration),
    w: v?.width ?? 1080,
    h: v?.height ?? 1920,
  }
}

async function probePhoto(path: string) {
  const ex = await exifr.parse(path, { gps: true, pick: ['DateTimeOriginal', 'CreateDate', 'latitude', 'longitude', 'ExifImageWidth', 'ExifImageHeight', 'Make'] }).catch(() => null)
  if (!ex?.Make) return null // 카메라 정보 없는 이미지(스크린샷 등)는 제외
  const d = ex.DateTimeOriginal ?? ex.CreateDate
  return { date: +d, lat: ex.latitude, lng: ex.longitude, w: ex.ExifImageWidth ?? 1080, h: ex.ExifImageHeight ?? 1440 }
}

async function placeName(lat: number, lng: number) {
  const c = cache<string>('places')
  const key = `${lat.toFixed(3)},${lng.toFixed(3)}`
  if (c.data[key] !== undefined) return c.data[key]
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=14&accept-language=ko`
    const res = await fetch(url, { headers: { 'User-Agent': 'trunk-diary/0.1 (personal travel video project)' } })
    const j = await res.json()
    const a = j.address ?? {}
    const city = a.city ?? a.county ?? a.town ?? ''
    const local = a.village ?? a.town ?? a.suburb ?? a.quarter ?? a.neighbourhood ?? ''
    const prov = provinceAt(lat, lng)
    c.data[key] = [prov ? shortName(prov) : '', city, local !== city ? local : ''].filter(Boolean).join(' ')
  } catch {
    c.data[key] = ''
  }
  c.save()
  await sleep(1100) // Nominatim 이용 정책: 초당 1회
  return c.data[key]
}

interface Wx { temp: number; code: number; precip: number }
async function weather(lat: number, lng: number, t: number): Promise<Wx | undefined> {
  const c = cache<Record<string, Wx>>('weather')
  const day = new Date(t).toLocaleDateString('sv-SE')
  const key = `${lat.toFixed(1)},${lng.toFixed(1)},${day}`
  if (!c.data[key]) {
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&hourly=temperature_2m,weather_code,precipitation&timezone=Asia%2FSeoul&start_date=${day}&end_date=${day}`
      const j = await (await fetch(url)).json()
      const hours: Record<string, Wx> = {}
      j.hourly.time.forEach((h: string, i: number) => {
        hours[h.slice(11, 13)] = { temp: j.hourly.temperature_2m[i], code: j.hourly.weather_code[i], precip: j.hourly.precipitation[i] }
      })
      c.data[key] = hours
      c.save()
    } catch {
      return undefined
    }
  }
  return c.data[key]?.[String(new Date(t).getHours()).padStart(2, '0')]
}

async function main() {
  console.log(`📂 ${SRC}`)
  const files = readdirSync(SRC).filter((f) => /\.(mov|mp4|m4v|jpe?g|heic)$/i.test(f) && !config.exclude.includes(f)).sort()
  const raws: Raw[] = []
  const seen = new Map<string, string>()
  for (const f of files) {
    const path = join(SRC, f)
    const isVideo = /\.(mov|mp4|m4v)$/i.test(f)
    const meta = isVideo ? await probeVideo(path) : await probePhoto(path)
    if (!meta || isNaN(meta.date)) { console.log(`  건너뜀 ${f}`); continue }
    // "IMG_1 (1).MOV" 같은 사본: 같은 시각·같은 종류면 하나만
    const dupKey = `${isVideo}-${Math.round(meta.date / 1000)}`
    if (seen.has(dupKey)) { console.log(`  중복 ${f} = ${seen.get(dupKey)}`); continue }
    seen.set(dupKey, f)
    const id = basename(f, extname(f)).replace(/\W+/g, '_')
    raws.push({ id, kind: isVideo ? 'video' : 'photo', src: '', file: `media/${id}${extname(f).toLowerCase()}`, source: path, caption: '', place: '', ...meta })
  }
  console.log(`🎞  ${raws.length}개 (영상 ${raws.filter((r) => r.kind === 'video').length}, 사진 ${raws.filter((r) => r.kind === 'photo').length})`)

  // 미디어 하드링크 (같은 디스크면 용량 추가 없음)
  rmSync(MEDIA, { recursive: true, force: true })
  mkdirSync(MEDIA, { recursive: true })
  for (const r of raws) {
    const dest = join(ROOT, 'public', r.file)
    try { linkSync(r.source, dest) } catch { copyFileSync(r.source, dest) }
  }

  const days = groupDays(raws)
  const moments = buildMoments(days)
  const legs = buildLegs(moments)

  console.log(`🗺  장소 이름 ${moments.length}곳`)
  const places = cache<string>('places')
  for (const m of moments) if (m.first) m.place = await placeName(m.first[0], m.first[1])
  void places

  console.log(`🛣  도로 경로 ${legs.length}구간`)
  const rc = cache<Route>('routes')
  const routes: Record<string, Route> = {}
  for (const l of legs) {
    if (!rc.data[l.key]) {
      try { rc.data[l.key] = await fetchRoute(l); rc.save() } catch { /* 직선 대체 */ }
      await sleep(300)
    }
    routes[l.key] = rc.data[l.key] ?? straight(l)
  }

  console.log('🌦  날씨')
  const wx: Record<string, Wx | undefined> = {}
  for (const m of moments) if (m.first) wx[m.id] = await weather(m.first[0], m.first[1], m.start)

  const byId = new Map(days.flatMap((d) => d.items).map((i) => [i.id, i as Raw]))
  const trip: TripData = {
    title: config.title,
    odometer: config.odometer,
    dayTitles: config.dayTitles,
    items: [...byId.values()].map(({ id, kind, file, date, lat, lng, duration, w, h, geoGuess }) => ({ id, kind, file, date, lat, lng, duration, w, h, geoGuess })),
    days: days.map((d) => ({ index: d.index, key: d.key, date: +d.date, items: d.items.map((i) => i.id) })),
    moments: moments.map((m) => ({ id: m.id, day: m.day, items: m.items.map((i) => i.id), start: m.start, end: m.end, place: m.place, first: m.first, last: m.last, weather: wx[m.id] })),
    legs: legs.map((l) => ({ key: l.key, day: l.day, from: l.from.id, to: l.to.id, ...routes[l.key] })),
    regions: provincesAlong([...legs.flatMap((l) => routes[l.key].coords), ...moments.flatMap((m) => (m.first ? [m.first] : []))]).map(shortName),
  }
  writeFileSync(join(ROOT, 'public/trip.json'), JSON.stringify(trip))
  for (const d of trip.days) {
    const ms = trip.moments.filter((m) => m.day === d.index)
    const km = trip.legs.filter((l) => l.day === d.index).reduce((s, l) => s + l.km, 0)
    console.log(`  DAY ${d.index + 1} ${d.key}  ${d.items.length}컷  ${Math.round(km)}km  ${ms.map((m) => m.place.split(' ').slice(-1)[0]).filter(Boolean).join(' → ')}`)
  }
  console.log(`✅ public/trip.json  (시·도 ${trip.regions.join(' ')})  ${statSync(join(ROOT, 'public/trip.json')).size} bytes`)
}

main()
