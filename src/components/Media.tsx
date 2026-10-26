import { useRef } from 'react'
import type { MediaItem } from '../lib/types'

/** 목록용 썸네일. 영상은 마우스를 올리면 재생 */
export default function Media({ item, full }: { item: MediaItem; full?: boolean }) {
  const v = useRef<HTMLVideoElement>(null)
  const poster = item.thumb ?? item.src
  if (item.kind === 'photo' || item.demo) return <img src={full ? item.src : poster} alt={item.caption || item.place} loading="lazy" draggable={false} />
  return (
    <video
      ref={v}
      src={item.src}
      poster={item.thumb}
      muted
      loop
      playsInline
      preload="none"
      onMouseEnter={() => v.current?.play().catch(() => {})}
      onMouseLeave={() => v.current?.pause()}
    />
  )
}

export const fmtDur = (s?: number) => (s ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : '')
