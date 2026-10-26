const SYNODIC = 29.530588853
const REF_NEW_MOON = Date.UTC(2000, 0, 6, 18, 14)
const PHASES = ['🌑', '🌒', '🌓', '🌔', '🌕', '🌖', '🌗', '🌘']
const NAMES = ['그믐·삭', '초승달', '상현달', '차오르는 달', '보름달', '기우는 달', '하현달', '그믐달']

/** 그날 밤(21시 기준)의 달 */
export function moonOf(date: Date) {
  const d = new Date(date)
  d.setHours(21, 0, 0, 0)
  const age = ((((d.getTime() - REF_NEW_MOON) / 86400000) % SYNODIC) + SYNODIC) % SYNODIC
  const i = Math.floor((age / SYNODIC) * 8 + 0.5) % 8
  return { emoji: PHASES[i], name: NAMES[i], age: Math.round(age) }
}
