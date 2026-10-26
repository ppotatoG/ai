import { useEffect } from 'react'
import { fmtDate, fmtTime, hasGeo } from '../lib/trip'
import type { MediaItem } from '../lib/types'

interface Props {
  item: MediaItem
  list: MediaItem[]
  isCover: boolean
  onCover: () => void
  onNav: (id: string) => void
  onClose: () => void
  onChange: (p: Partial<MediaItem>) => void
  onDelete?: () => void
  onPin: () => void
}

export default function Lightbox({ item, list, isCover, onCover, onNav, onClose, onChange, onDelete, onPin }: Props) {
  const idx = list.findIndex((m) => m.id === item.id)
  const go = (d: number) => {
    const n = list[(idx + d + list.length) % list.length]
    if (n) onNav(n.id)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName.match(/INPUT|TEXTAREA/)) return
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') go(1)
      if (e.key === 'ArrowLeft') go(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <div className="lightbox" onClick={onClose}>
      <div className="lb-body" onClick={(e) => e.stopPropagation()}>
        <div className="lb-media">
          {item.kind === 'video' && !item.demo
            ? <video key={item.id} src={item.src} controls autoPlay playsInline />
            : <img src={item.src} alt={item.caption} />}
          <button className="lb-arrow l" onClick={() => go(-1)} aria-label="이전">‹</button>
          <button className="lb-arrow r" onClick={() => go(1)} aria-label="다음">›</button>
        </div>
        <aside className="lb-side">
          <p className="lb-when">{fmtDate(new Date(item.date))} · {fmtTime(item.date)}</p>
          <label>장소<input value={item.place} placeholder="어디였나요?" onChange={(e) => onChange({ place: e.target.value })} /></label>
          <label>한 줄 기록<textarea rows={3} value={item.caption} placeholder="그 순간의 한 줄" onChange={(e) => onChange({ caption: e.target.value })} /></label>
          <label>촬영 시각
            <input
              type="datetime-local"
              value={toLocalInput(item.date)}
              onChange={(e) => e.target.value && onChange({ date: new Date(e.target.value).getTime() })}
            />
          </label>
          <p className="lb-geo">{hasGeo(item) ? `📍 ${item.lat.toFixed(4)}, ${item.lng.toFixed(4)}${item.geoGuess ? ' (앞뒤 사진으로 추정)' : ''}` : '📍 위치 정보 없음'}</p>
          <div className="lb-actions">
            <button className="ghost" onClick={onPin}>{hasGeo(item) ? '위치 바꾸기' : '지도에서 위치 지정'}</button>
            {item.kind === 'photo' && <button className="ghost" onClick={onCover} disabled={isCover}>{isCover ? '표지 사진' : '표지로 쓰기'}</button>}
            {onDelete && <button className="danger" onClick={() => confirm('이 사진을 지울까요?') && onDelete()}>삭제</button>}
          </div>
          <p className="lb-count">{idx + 1} / {list.length}</p>
        </aside>
        <button className="lb-close" onClick={onClose} aria-label="닫기">✕</button>
      </div>
    </div>
  )
}

function toLocalInput(t: number) {
  const d = new Date(t)
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}
