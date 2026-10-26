import { useEffect, useState } from 'react'

export default function DropOverlay({ onFiles }: { onFiles: (f: File[]) => void }) {
  const [on, setOn] = useState(false)

  useEffect(() => {
    let depth = 0
    const hasFiles = (e: DragEvent) => e.dataTransfer?.types.includes('Files')
    const enter = (e: DragEvent) => { if (hasFiles(e)) { depth++; setOn(true) } }
    const leave = () => { depth = Math.max(0, depth - 1); if (!depth) setOn(false) }
    const over = (e: DragEvent) => { if (hasFiles(e)) e.preventDefault() }
    const drop = (e: DragEvent) => {
      if (!hasFiles(e)) return
      e.preventDefault()
      depth = 0
      setOn(false)
      onFiles([...(e.dataTransfer?.files ?? [])])
    }
    window.addEventListener('dragenter', enter)
    window.addEventListener('dragleave', leave)
    window.addEventListener('dragover', over)
    window.addEventListener('drop', drop)
    return () => {
      window.removeEventListener('dragenter', enter)
      window.removeEventListener('dragleave', leave)
      window.removeEventListener('dragover', over)
      window.removeEventListener('drop', drop)
    }
  }, [onFiles])

  if (!on) return null
  return (
    <div className="drop">
      <div className="drop-box">
        <div className="drop-van">🚐</div>
        <p>트렁크에 던져 넣으세요</p>
        <small>사진·영상 여러 개를 한 번에 — 날짜와 위치는 자동으로 읽어요</small>
      </div>
    </div>
  )
}
