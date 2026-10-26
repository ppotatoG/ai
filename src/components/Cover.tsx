import { useState } from 'react'
import { fmtDrive } from '../lib/routing'
import { tripStats, type RouteFn } from '../lib/stats'
import { campOf, fmtDate } from '../lib/trip'
import type { Day, Leg, MediaItem, TripMeta } from '../lib/types'

interface Props {
  meta: TripMeta
  items: MediaItem[]
  days: Day[]
  legs: Leg[]
  route: RouteFn
  isDemo: boolean
  onMeta: (p: Partial<TripMeta>) => void
  onPlay: () => void
  onUpload: () => void
}

export default function Cover({ meta, items, days, legs, route, isDemo, onMeta, onPlay, onUpload }: Props) {
  const s = tripStats(items, days, legs, route, meta)
  const photos = items.filter((i) => i.kind === 'photo')
  const cover = items.find((i) => i.id === meta.coverId) ?? photos[Math.floor(photos.length * 0.4)] ?? items[0]
  const [editKm, setEditKm] = useState(false)
  const year = days[0]?.date.getFullYear()
  const season = days[0] ? ['겨울', '겨울', '봄', '봄', '봄', '여름', '여름', '여름', '가을', '가을', '가을', '겨울'][days[0].date.getMonth()] : ''
  const camps = days.slice(0, -1).map((d) => campOf(d)?.place).filter(Boolean)

  return (
    <header className="cover" id="top">
      {cover && <img className="cover-img" src={cover.src} alt="" />}
      <div className="cover-shade" />

      <div className="masthead">
        <p className="issue"><span>VOL.01</span><span>{year} {season}호</span><span>{s.nights}박 {days.length}일 전국 차박 특집</span></p>
        <h1>TRUNK DIARY</h1>
      </div>

      <div className="cover-lines">
        <div className="odo" onClick={() => setEditKm(true)} title="눌러서 실제 주행거리 입력">
          {editKm ? (
            <input
              autoFocus
              type="number"
              defaultValue={s.km}
              onBlur={(e) => { const v = Number(e.target.value); onMeta({ odometer: v > 0 ? v : undefined }); setEditKm(false) }}
              onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
            />
          ) : (
            <b>{s.km.toLocaleString()}</b>
          )}
          <span>km</span>
        </div>
        <input className="cover-title" value={meta.title} onChange={(e) => onMeta({ title: e.target.value })} aria-label="여행 제목" spellCheck={false} />
        <p className="cover-sub">
          {days.length ? `${fmtDate(days[0].date)} — ${fmtDate(days[days.length - 1].date)}` : ''} · 운전 약 {fmtDrive(s.driveMin)} · {s.regions.length}개 시·도 · 사진 {s.photos} · 영상 {s.videos}
        </p>
        {camps.length > 0 && (
          <ol className="cover-camps">
            {camps.map((c, i) => <li key={i}><em>{i + 1}박</em>{c}</li>)}
          </ol>
        )}
        <div className="cover-cta">
          <button className="primary big" onClick={onPlay} disabled={!items.length}>▶ 여행 다시 보기</button>
          <button className="ghost big light" onClick={onUpload}>{isDemo ? '내 사진·영상 올리기' : '사진 더 싣기'}</button>
        </div>
        {isDemo && <p className="hint">지금은 예시 여행이에요. 사진을 통째로 끌어다 놓으면 날짜·위치로 장면과 주행 구간이 자동으로 나뉘어요.</p>}
        {!meta.odometer && !isDemo && <p className="hint">사진 위치로 계산한 거리예요. 숫자를 누르면 실제 주행거리로 바꿀 수 있어요.</p>}
      </div>
    </header>
  )
}
