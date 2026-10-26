import { useEffect, useRef } from 'react'
import L from 'leaflet'
import { provincesAlong, PROVINCES, shortName } from '../lib/regions'
import { dayColor, type RouteFn } from '../lib/stats'
import type { Day, Leg, Moment } from '../lib/types'

interface Props {
  days: Day[]
  moments: Moment[]
  legs: Leg[]
  route: RouteFn
  onOpen: (id: string) => void
  pinMode: boolean
  onPick: (lat: number, lng: number) => void
}

export default function RouteMap({ days, moments, legs, route, onOpen, pinMode, onPick }: Props) {
  const el = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map>()
  const layer = useRef<L.LayerGroup>()
  const base = useRef<L.GeoJSON>()
  const fitted = useRef('')
  const pick = useRef(onPick)
  pick.current = onPick
  const pinRef = useRef(pinMode)
  pinRef.current = pinMode

  useEffect(() => {
    const m = L.map(el.current!, { zoomControl: false, scrollWheelZoom: false, attributionControl: false, zoomSnap: 0.25 }).setView([36.3, 127.9], 7)
    base.current = L.geoJSON(PROVINCES as never, { style: { color: '#cfc6b4', weight: 1, fillColor: '#faf7f1', fillOpacity: 1 }, interactive: false }).addTo(m)
    L.control.zoom({ position: 'bottomright' }).addTo(m)
    m.on('click', (e) => pinRef.current && pick.current(e.latlng.lat, e.latlng.lng))
    map.current = m
    layer.current = L.layerGroup().addTo(m)
    return () => { m.remove() }
  }, [])

  useEffect(() => { el.current?.classList.toggle('picking', pinMode) }, [pinMode])

  const routeSig = legs.map((l) => `${l.key}:${route(l).straight ? 0 : 1}`).join('|')

  useEffect(() => {
    const m = map.current!
    const g = layer.current!
    g.clearLayers()

    // 지나간 시·도는 색을 입히고 이름 표시
    const visited = new Set(provincesAlong([...legs.flatMap((l) => route(l).coords), ...moments.flatMap((x) => (x.first ? [x.first] : []))]))
    base.current?.eachLayer((ly) => {
      const f = (ly as L.GeoJSON & { feature: { properties: { name: string } } }).feature
      const on = visited.has(f.properties.name)
      ;(ly as L.Path).setStyle({ fillColor: on ? '#efe4cf' : '#faf7f1' })
      if (on) L.marker((ly as L.Polygon).getBounds().getCenter(), { icon: L.divIcon({ html: `<span class="prov">${shortName(f.properties.name)}</span>`, className: '', iconSize: [40, 14], iconAnchor: [20, 7] }), interactive: false }).addTo(g)
    })

    const path: L.LatLng[] = []
    for (const l of legs) {
      const r = route(l)
      L.polyline(r.coords, { color: dayColor(l.day), weight: 4, opacity: 0.9, dashArray: r.straight ? '2 8' : undefined, lineCap: 'round', interactive: false }).addTo(g)
      path.push(...r.coords.map(([a, b]) => L.latLng(a, b)))
    }

    // 장면마다 핀 하나 (대표 사진 + 장 수)
    const campIds = new Set(days.slice(0, -1).map((d) => moments.filter((x) => x.day === d.index && x.last).at(-1)?.id))
    for (const mo of moments) {
      if (!mo.first) continue
      const lead = mo.items.find((i) => i.kind === 'photo') ?? mo.items[0]
      const node = document.createElement('div')
      node.className = `pin${campIds.has(mo.id) ? ' camp' : ''}`
      node.style.setProperty('--c', dayColor(mo.day))
      const img = document.createElement('img')
      img.src = lead.thumb ?? lead.src
      node.appendChild(img)
      if (mo.items.length > 1) {
        const n = document.createElement('span')
        n.textContent = String(mo.items.length)
        node.appendChild(n)
      }
      if (campIds.has(mo.id)) {
        const c = document.createElement('em')
        c.textContent = `${mo.day + 1}박`
        node.appendChild(c)
      }
      L.marker(mo.first, { icon: L.divIcon({ html: node, className: '', iconSize: [44, 44], iconAnchor: [22, 22] }) })
        .on('click', () => onOpen(lead.id))
        .bindTooltip(`DAY ${mo.day + 1} · ${mo.place || '이름 없는 곳'}`, { direction: 'top', offset: [0, -22], className: 'tip' })
        .addTo(g)
    }

    // 경로를 달리는 밴
    let raf = 0
    if (path.length > 1 && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const van = L.marker(path[0], { icon: L.divIcon({ html: '<div class="van-pin">🚐</div>', className: '', iconSize: [26, 26], iconAnchor: [13, 13] }), interactive: false, zIndexOffset: 1000 }).addTo(g)
      const acc = [0]
      for (let i = 1; i < path.length; i++) acc.push(acc[i - 1] + path[i - 1].distanceTo(path[i]))
      const total = acc[acc.length - 1]
      const t0 = performance.now()
      let i = 1
      const tick = (now: number) => {
        const d = (((now - t0) / 30000) % 1) * total
        if (d < acc[i - 1]) i = 1
        while (i < acc.length - 1 && acc[i] < d) i++
        const k = (d - acc[i - 1]) / (acc[i] - acc[i - 1] || 1)
        const a = path[i - 1], b = path[i]
        van.setLatLng([a.lat + (b.lat - a.lat) * k, a.lng + (b.lng - a.lng) * k])
        raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
    }

    const pts = moments.flatMap((x) => (x.first ? [x.first] : []))
    const sig = pts.map((p) => p.join()).join('|')
    if (pts.length && fitted.current !== sig) {
      fitted.current = sig
      m.fitBounds(L.latLngBounds(pts).pad(0.12), { maxZoom: 11 })
    }
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moments, routeSig, onOpen])

  return <div ref={el} className="map" />
}
