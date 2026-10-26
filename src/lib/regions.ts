import provinces from '../data/provinces.json'

type Ring = [number, number][]
interface Feature { properties: { name: string }; geometry: { type: string; coordinates: unknown } }

export const PROVINCES = provinces as unknown as { type: 'FeatureCollection'; features: Feature[] }

const SHORT: Record<string, string> = {
  서울특별시: '서울', 부산광역시: '부산', 대구광역시: '대구', 인천광역시: '인천', 광주광역시: '광주', 대전광역시: '대전',
  울산광역시: '울산', 세종특별자치시: '세종', 경기도: '경기', 강원도: '강원', 충청북도: '충북', 충청남도: '충남',
  전라북도: '전북', 전라남도: '전남', 경상북도: '경북', 경상남도: '경남', 제주특별자치도: '제주',
}
export const shortName = (n: string) => SHORT[n] ?? n

const polys = PROVINCES.features.map((f) => ({
  name: f.properties.name,
  rings: (f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates) as Ring[][],
}))

function inRing([x, y]: [number, number], ring: Ring) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

export function provinceAt(lat: number, lng: number) {
  for (const p of polys) for (const poly of p.rings) if (inRing([lng, lat], poly[0]) && !poly.slice(1).some((h) => inRing([lng, lat], h))) return p.name
  return undefined
}

/** 경로 좌표가 지나간 시·도 (방문 순서대로) */
export function provincesAlong(coords: [number, number][]) {
  const seen: string[] = []
  const step = Math.max(1, Math.floor(coords.length / 400))
  for (let i = 0; i < coords.length; i += step) {
    const n = provinceAt(coords[i][0], coords[i][1])
    if (n && !seen.includes(n)) seen.push(n)
  }
  return seen
}
