export interface Clip {
  id: string
  kind: 'photo' | 'video'
  file: string
  date: number
  lat?: number
  lng?: number
  duration?: number
  w: number
  h: number
  geoGuess?: boolean
}

export interface Weather { temp: number; code: number; precip: number }

export interface TripData {
  title: string
  odometer?: number
  dayTitles: Record<string, string>
  /** EP별 오프닝 영상 ("0": 클립 id, "summary": 클립 id) */
  covers?: Record<string, string>
  items: Clip[]
  days: { index: number; key: string; date: number; items: string[] }[]
  moments: { id: string; day: number; items: string[]; start: number; end: number; place: string; first?: [number, number]; last?: [number, number]; weather?: Weather }[]
  legs: { key: string; day: number; from: string; to: string; km: number; min: number; coords: [number, number][]; straight?: boolean }[]
  regions: string[]
}
