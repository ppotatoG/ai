export type MediaKind = 'photo' | 'video'

export interface MediaItem {
  id: string
  kind: MediaKind
  /** 원본 object URL (업로드) 또는 data URL (데모) */
  src: string
  /** 목록·지도용 작은 이미지. 없으면 src 사용 */
  thumb?: string
  /** 촬영 시각 (ms) */
  date: number
  lat?: number
  lng?: number
  caption: string
  place: string
  demo?: boolean
  /** 위치 없는 사진·영상에 앞뒤 사진 위치를 빌려온 경우 */
  geoGuess?: boolean
  /** 영상 길이 (초) */
  duration?: number
}

export interface TripMeta {
  title: string
  dayTitles: Record<number, string>
  nightNotes: Record<number, string>
  /** 직접 입력한 총 주행거리 (km) */
  odometer?: number
  coverId?: string
}

export interface Day {
  index: number
  key: string
  date: Date
  items: MediaItem[]
}

/** 시간·거리상 붙어 있는 사진 묶음 = 한 장면 */
export interface Moment {
  id: string
  day: number
  items: MediaItem[]
  start: number
  end: number
  place: string
  first?: [number, number]
  last?: [number, number]
}

/** 두 장면 사이를 달린 구간 */
export interface Leg {
  key: string
  day: number
  from: Moment
  to: Moment
  a: [number, number]
  b: [number, number]
}

export interface Route {
  km: number
  min: number
  coords: [number, number][]
  /** 도로 경로를 못 받아 직선으로 대체 */
  straight?: boolean
}
