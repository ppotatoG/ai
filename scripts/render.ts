// 모든 편(EP01… + SUMMARY)을 out/*.mp4로 렌더링. 특정 편만: npm run render -- EP01
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const trip = JSON.parse(readFileSync('public/trip.json', 'utf8'))
const all = [...trip.days.map((d: { index: number }) => `EP${String(d.index + 1).padStart(2, '0')}`), 'SUMMARY']
const ids = process.argv.slice(2).length ? process.argv.slice(2) : all

for (const id of ids) {
  console.log(`\n🎬 ${id}`)
  const r = spawnSync('npx', ['remotion', 'render', 'remotion/index.ts', id, `out/${id}.mp4`, '--codec=h264', '--crf=18', '--concurrency=50%'], { stdio: 'inherit' })
  if (r.status !== 0) process.exit(r.status ?? 1)
}
console.log('\n✅ out/ 폴더를 확인하세요')
