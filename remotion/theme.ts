import { loadFont as loadBlack } from '@remotion/google-fonts/BlackHanSans'
import { loadFont as loadNoto } from '@remotion/google-fonts/NotoSansKR'
import { loadFont as loadMono } from '@remotion/google-fonts/SpaceMono'

export const fonts = {
  title: loadBlack().fontFamily,
  sans: loadNoto('normal', { weights: ['500', '900'] }).fontFamily,
  mono: loadMono('normal', { weights: ['400', '700'] }).fontFamily,
}

// 핀터레스트 Cool Blue + 디카 날짜 스탬프 주황
export const C = {
  ink: '#05070d',
  night: '#070b18',
  blue: '#9fd3ff',
  blueDeep: '#1d3b66',
  stamp: '#ff8a1f',
  lcd: '#ffb347',
  white: '#f5f7fa',
}

export const DAY_COLORS = ['#ff8a1f', '#9fd3ff', '#c4ff7a', '#ff7ab8', '#ffe27a', '#7af0e0']
export const dayColor = (i: number) => DAY_COLORS[i % DAY_COLORS.length]

// 숏폼 앱 UI에 가리지 않는 안전 영역 (1080×1920 기준)
export const SAFE = { top: 210, bottom: 430, left: 64, right: 150 }

const WD = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
const pad = (n: number) => String(n).padStart(2, '0')
export const stampDate = (t: number) => { const d = new Date(t); return `'${String(d.getFullYear()).slice(2)} ${pad(d.getMonth() + 1)} ${pad(d.getDate())}` }
export const stampTime = (t: number) => { const d = new Date(t); return `${pad(d.getHours())}:${pad(d.getMinutes())}` }
export const weekday = (t: number) => WD[new Date(t).getDay()]
export const mdDate = (t: number) => { const d = new Date(t); return `${d.getMonth() + 1}.${pad(d.getDate())}` }

/** WMO 날씨 코드 → 아이콘 */
export function wxIcon(code?: number) {
  if (code === undefined) return ''
  if (code === 0) return '☀︎'
  if (code <= 3) return '☁︎'
  if (code <= 48) return '〰'
  if (code <= 67 || (code >= 80 && code <= 82)) return '☂︎'
  if (code <= 77 || code === 85 || code === 86) return '❄︎'
  return '⚡︎'
}
export const isRainy = (code?: number, precip?: number) => (precip ?? 0) > 0.15 || (code !== undefined && ((code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95))

/** "서울 서울특별시 당산2동" → ["서울", "당산2동"] */
const tokens = (p: string) => {
  const t = p.split(' ').filter(Boolean).map((x) => x.replace(/(특별자치시|특별시|광역시)$/, ''))
  return t.filter((x, i) => t.indexOf(x) === i)
}
/** 도 이름은 빼고 시·군 + 동네 */
export const shortPlace = (p: string) => { const t = tokens(p); return (t.length > 2 ? t.slice(1) : t).join(' ') }
/** 시·군 (서울·부산 같은 광역시는 그 이름) */
export const cityOf = (p: string) => { const t = tokens(p); return t.length > 2 ? t[1] : t[0] ?? '' }
