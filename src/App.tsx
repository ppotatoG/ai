import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Cover from './components/Cover'
import Contents from './components/Contents'
import DayArticle from './components/DayArticle'
import Lightbox from './components/Lightbox'
import Player from './components/Player'
import Ticket from './components/Ticket'
import DropOverlay from './components/DropOverlay'
import { DEMO_META, demoItems } from './lib/demo'
import { buildLegs, buildMoments } from './lib/moments'
import { useRoutes } from './lib/routing'
import { clearAll, importFiles, loadSaved, removeBlob, saveItems, saveMeta } from './lib/store'
import { groupDays } from './lib/trip'
import type { MediaItem, TripMeta } from './lib/types'

const EMPTY_META: TripMeta = { title: '길 위의 3박 4일', dayTitles: {}, nightNotes: {} }

export default function App() {
  const [items, setItems] = useState<MediaItem[]>([])
  const [meta, setMeta] = useState<TripMeta>(DEMO_META)
  const [isDemo, setIsDemo] = useState(true)
  const [ready, setReady] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)
  const [playing, setPlaying] = useState(false)
  const [pinId, setPinId] = useState<string | null>(null)
  const [progress, setProgress] = useState<[number, number] | null>(null)
  const [toast, setToast] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const mapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadSaved()
      .then((saved) => {
        if (saved && saved.items.length) {
          setItems(saved.items)
          setMeta(saved.meta ?? EMPTY_META)
          setIsDemo(false)
        } else setItems(demoItems())
      })
      .catch(() => setItems(demoItems()))
      .finally(() => setReady(true))
  }, [])

  useEffect(() => {
    if (!ready || isDemo) return
    saveItems(items)
    saveMeta(meta)
  }, [items, meta, isDemo, ready])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 6000)
    return () => clearTimeout(t)
  }, [toast])

  const days = useMemo(() => groupDays(items), [items])
  const moments = useMemo(() => buildMoments(days), [days])
  const legs = useMemo(() => buildLegs(moments), [moments])
  const route = useRoutes(legs)
  const sorted = useMemo(() => days.flatMap((d) => d.items), [days])

  const addFiles = useCallback(async (files: File[]) => {
    if (!files.length) return
    setProgress([0, files.length])
    try {
      const { items: added, skipped } = await importFiles(files, (a, b) => setProgress([a, b]))
      if (skipped.length)
        setToast(`${skipped.length}개는 이 브라우저에서 열 수 없어 건너뛰었어요 (${skipped.slice(0, 3).join(', ')}${skipped.length > 3 ? ' …' : ''}). HEIC라면 사파리에서 올리거나 JPG로 내보내 주세요.`)
      if (!added.length) return
      if (isDemo) {
        setIsDemo(false)
        setMeta(EMPTY_META)
        setItems(added)
      } else setItems((prev) => [...prev, ...added])
    } finally {
      setProgress(null)
    }
  }, [isDemo])

  const update = useCallback((id: string, patch: Partial<MediaItem>) => {
    setItems((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)))
  }, [])

  const remove = useCallback((id: string) => {
    setItems((prev) => prev.filter((m) => m.id !== id))
    removeBlob(id)
    setOpenId(null)
  }, [])

  const reset = async () => {
    if (!confirm('올린 사진과 기록을 모두 지우고 데모로 돌아갈까요?')) return
    await clearAll()
    setItems(demoItems())
    setMeta(DEMO_META)
    setIsDemo(true)
  }

  useEffect(() => {
    if (!pinId) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setPinId(null)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [pinId])

  const patchMeta = (p: Partial<TripMeta>) => setMeta((m) => ({ ...m, ...p }))
  const openItem = sorted.find((m) => m.id === openId)
  const pinItem = items.find((m) => m.id === pinId)
  const upload = () => fileRef.current?.click()

  return (
    <>
      <nav className="topbar">
        <a className="brand" href="#top">TRUNK DIARY</a>
        <div className="day-nav">
          <a href="#contents">목차</a>
          {days.map((d) => <a key={d.key} href={`#day-${d.index}`}>DAY {d.index + 1}</a>)}
        </div>
        <div className="actions">
          {isDemo ? <span className="demo-badge">데모</span> : <button className="ghost" onClick={reset}>초기화</button>}
          <button className="ghost" onClick={upload} disabled={!!progress}>
            {progress ? `싣는 중 ${progress[0]}/${progress[1]}` : '＋ 올리기'}
          </button>
          <button className="primary" onClick={() => setPlaying(true)} disabled={!items.length}>▶ 재생</button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*,video/*"
          multiple
          hidden
          onChange={(e) => { addFiles([...(e.target.files ?? [])]); e.target.value = '' }}
        />
      </nav>

      <Cover meta={meta} items={sorted} days={days} legs={legs} route={route} isDemo={isDemo} onMeta={patchMeta} onPlay={() => setPlaying(true)} onUpload={upload} />

      <div ref={mapRef}>
        {pinItem && (
          <div className="pin-banner">
            지도를 눌러 <b>{pinItem.place || '이 사진'}</b>의 위치를 지정하세요
            <button onClick={() => setPinId(null)}>취소</button>
          </div>
        )}
        <Contents
          days={days}
          meta={meta}
          moments={moments}
          legs={legs}
          route={route}
          onOpen={setOpenId}
          pinMode={!!pinId}
          onPick={(lat, lng) => { if (pinId) { update(pinId, { lat, lng }); setPinId(null) } }}
        />
      </div>

      {days.map((d) => (
        <DayArticle
          key={d.key}
          day={d}
          last={d.index === days.length - 1}
          moments={moments.filter((m) => m.day === d.index)}
          legs={legs}
          route={route}
          title={meta.dayTitles[d.index] ?? ''}
          note={meta.nightNotes[d.index] ?? ''}
          onTitle={(t) => patchMeta({ dayTitles: { ...meta.dayTitles, [d.index]: t } })}
          onNote={(t) => patchMeta({ nightNotes: { ...meta.nightNotes, [d.index]: t } })}
          onOpen={setOpenId}
        />
      ))}

      {!!items.length && <Ticket meta={meta} items={sorted} days={days} legs={legs} route={route} />}

      <footer className="foot">사진은 이 브라우저 안에만 저장돼요 · 행정구역 경계 통계청(southkorea-maps) · 경로 © OpenStreetMap, OSRM</footer>

      {openItem && (
        <Lightbox
          item={openItem}
          list={sorted}
          isCover={meta.coverId === openItem.id}
          onNav={setOpenId}
          onClose={() => setOpenId(null)}
          onChange={(p) => update(openItem.id, p)}
          onDelete={isDemo ? undefined : () => remove(openItem.id)}
          onPin={() => { setOpenId(null); setPinId(openItem.id); mapRef.current?.scrollIntoView({ behavior: 'smooth' }) }}
          onCover={() => patchMeta({ coverId: openItem.id })}
        />
      )}
      {playing && <Player days={days} meta={meta} items={sorted} moments={moments} legs={legs} route={route} onClose={() => setPlaying(false)} />}
      {toast && <div className="toast" onClick={() => setToast('')}>{toast}</div>}
      <DropOverlay onFiles={addFiles} />
    </>
  )
}
