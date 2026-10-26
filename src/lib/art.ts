// 데모용 절차적 풍경 일러스트 (SVG data URL). 외부 이미지 없이도 데모가 예쁘게 보이도록.

export type SceneKind = 'road' | 'river' | 'meadow' | 'stars' | 'sea' | 'cliff' | 'hills' | 'terrace' | 'camp' | 'tea' | 'bamboo' | 'city'

interface SceneOpts {
  kind: SceneKind
  sky: [string, string]
  sun?: { x: number; y: number; r: number; color: string } | null
  ground?: string[]
  seed?: number
  animated?: boolean
}

const W = 1200
const H = 800

function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function ridge(r: () => number, base: number, amp: number, rough: number, color: string, opacity = 1) {
  const pts: string[] = [`0,${H}`]
  let y = base
  for (let x = 0; x <= W; x += 40) {
    y += (r() - 0.5) * rough
    y = Math.max(base - amp, Math.min(base + amp, y))
    pts.push(`${x},${y.toFixed(1)}`)
  }
  pts.push(`${W},${H}`)
  return `<polygon points="${pts.join(' ')}" fill="${color}" opacity="${opacity}"/>`
}

function stars(r: () => number, n: number, maxY: number, animated: boolean) {
  let s = ''
  for (let i = 0; i < n; i++) {
    const x = r() * W
    const y = r() * maxY
    const rad = r() < 0.92 ? r() * 1.4 + 0.3 : r() * 2 + 1.4
    const op = (0.4 + r() * 0.6).toFixed(2)
    const anim = animated && r() < 0.35
      ? `<animate attributeName="opacity" values="${op};0.1;${op}" dur="${(1.5 + r() * 3).toFixed(1)}s" repeatCount="indefinite"/>`
      : ''
    s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${rad.toFixed(2)}" fill="#fff" opacity="${op}">${anim}</circle>`
  }
  return s
}

function milkyWay(r: () => number) {
  let s = `<g filter="url(#blur)" opacity="0.55" transform="rotate(-24 600 300)">`
  s += `<ellipse cx="600" cy="300" rx="760" ry="70" fill="#c9b8ff" opacity="0.35"/>`
  s += `<ellipse cx="620" cy="300" rx="560" ry="34" fill="#ffe8d2" opacity="0.35"/>`
  s += `<ellipse cx="520" cy="310" rx="320" ry="16" fill="#1b1736" opacity="0.6"/>`
  s += `</g><g transform="rotate(-24 600 300)">`
  for (let i = 0; i < 260; i++) {
    const x = r() * 1400 - 100
    const y = 300 + (r() + r() + r() - 1.5) * 90
    s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(r() * 0.9 + 0.2).toFixed(2)}" fill="#fff" opacity="${(0.3 + r() * 0.6).toFixed(2)}"/>`
  }
  return s + '</g>'
}

function van(x: number, y: number, s: number, lit: boolean) {
  // 트렁크를 연 밴 실루엣 + 실내등
  return `<g transform="translate(${x} ${y}) scale(${s})">
    ${lit ? `<ellipse cx="-40" cy="60" rx="170" ry="40" fill="#ffb35c" opacity="0.18" filter="url(#blur)"/>` : ''}
    <path d="M0 0 h160 q30 0 40 30 l16 40 h-216 z" fill="#0c0d16"/>
    <rect x="-8" y="66" width="232" height="20" rx="8" fill="#0c0d16"/>
    <circle cx="40" cy="90" r="18" fill="#05060b"/><circle cx="180" cy="90" r="18" fill="#05060b"/>
    <path d="M0 4 L-46 -30 L-40 -36 L4 -2 z" fill="#0c0d16"/>
    ${lit ? `<path d="M4 8 L-34 70 L36 70 Z" fill="#ffcf8a" opacity="0.55"/><rect x="4" y="8" width="60" height="58" fill="#ffd9a0" opacity="0.85"/>` : ''}
  </g>`
}

function tent(x: number, y: number, s: number) {
  return `<g transform="translate(${x} ${y}) scale(${s})">
    <path d="M0 0 L60 -80 L120 0 Z" fill="#1a1c2e"/>
    <path d="M60 -80 L80 0 L40 0 Z" fill="#ffb35c" opacity="0.7"/>
  </g>`
}

function fire(x: number, y: number, animated: boolean) {
  const a = animated ? `<animate attributeName="opacity" values="0.9;0.55;1;0.7;0.9" dur="1.2s" repeatCount="indefinite"/>` : ''
  return `<g>
    <circle cx="${x}" cy="${y}" r="120" fill="#ff8a3d" opacity="0.18" filter="url(#blur)">${a}</circle>
    <path d="M${x - 18} ${y + 10} Q${x - 22} ${y - 20} ${x} ${y - 46} Q${x + 24} ${y - 18} ${x + 18} ${y + 10} Z" fill="#ff9a3d">${a}</path>
    <path d="M${x - 8} ${y + 10} Q${x - 10} ${y - 8} ${x} ${y - 26} Q${x + 12} ${y - 8} ${x + 8} ${y + 10} Z" fill="#ffe08a"/>
    <rect x="${x - 30}" y="${y + 8}" width="60" height="7" rx="3" fill="#3a2418" transform="rotate(12 ${x} ${y + 10})"/>
    <rect x="${x - 30}" y="${y + 8}" width="60" height="7" rx="3" fill="#2b1a12" transform="rotate(-12 ${x} ${y + 10})"/>
  </g>`
}

function sea(r: () => number, top: number, c1: string, c2: string, glint?: string) {
  let s = `<rect x="0" y="${top}" width="${W}" height="${H - top}" fill="url(#sea)"/>
  <defs><linearGradient id="sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>`
  for (let i = 0; i < 70; i++) {
    const y = top + 6 + Math.pow(r(), 1.6) * (H - top)
    const w = 20 + r() * 120 * ((y - top) / (H - top) + 0.3)
    const x = r() * W
    s += `<rect x="${x.toFixed(0)}" y="${y.toFixed(0)}" width="${w.toFixed(0)}" height="2" rx="1" fill="${glint ?? '#ffffff'}" opacity="${(0.12 + r() * 0.3).toFixed(2)}"/>`
  }
  return s
}

export function scene(o: SceneOpts): string {
  const r = rng(o.seed ?? 7)
  const [top, bottom] = o.sky
  const g = o.ground ?? ['#2b3a55', '#1d2840', '#121a2c']
  const night = o.kind === 'stars' || o.kind === 'camp' || o.kind === 'city'
  let body = ''

  if (night) body += stars(r, o.kind === 'city' ? 60 : 220, H * 0.7, !!o.animated)
  if (o.kind === 'stars') body += milkyWay(r)
  if (o.sun) {
    body += `<circle cx="${o.sun.x}" cy="${o.sun.y}" r="${o.sun.r * 3}" fill="${o.sun.color}" opacity="0.18" filter="url(#blur)"/>`
    body += `<circle cx="${o.sun.x}" cy="${o.sun.y}" r="${o.sun.r}" fill="${o.sun.color}"/>`
  }

  switch (o.kind) {
    case 'road': {
      body += ridge(r, 470, 60, 50, g[0], 0.8) + ridge(r, 540, 40, 30, g[1])
      body += `<polygon points="560,520 640,520 1000,800 200,800" fill="#2a2d36"/>`
      for (let i = 0; i < 6; i++) {
        const t = i / 6, t2 = (i + 0.5) / 6
        const y1 = 520 + 280 * t * t, y2 = 520 + 280 * t2 * t2
        body += `<polygon points="${598 - 2 * t * 6},${y1} ${602 + 2 * t * 6},${y1} ${604 + 14 * t2},${y2} ${596 - 14 * t2},${y2}" fill="#f3d27a" opacity="0.9"/>`
      }
      break
    }
    case 'river':
      body += ridge(r, 380, 50, 40, g[0], 0.6) + ridge(r, 430, 40, 30, g[1], 0.85)
      body += sea(r, 480, '#b8c9d8', '#7d93a8')
      body += `<rect x="0" y="470" width="${W}" height="40" fill="#e8eef3" opacity="0.5" filter="url(#blur)"/>`
      body += `<g fill="${g[2]}"><rect x="880" y="330" width="14" height="190"/><circle cx="887" cy="320" r="90"/></g>`
      break
    case 'meadow':
    case 'hills':
      body += ridge(r, 360, 60, 60, g[0], 0.7)
      body += `<path d="M0 560 Q300 420 650 500 T1200 470 V800 H0 Z" fill="${g[1]}"/>`
      body += `<path d="M0 660 Q400 560 800 640 T1200 610 V800 H0 Z" fill="${g[2]}"/>`
      if (o.kind === 'meadow')
        for (let i = 0; i < 40; i++)
          body += `<ellipse cx="${(r() * W).toFixed(0)}" cy="${(560 + r() * 200).toFixed(0)}" rx="9" ry="6" fill="#f4efe6" opacity="0.95"/>`
      else
        body += `<g fill="#3a2b22"><path d="M300 520 q120 -90 240 0 z"/><path d="M620 540 q90 -70 180 0 z"/></g>`
      break
    case 'stars':
      body += ridge(r, 620, 50, 60, g[0]) + ridge(r, 700, 30, 30, g[1])
      for (let i = 0; i < 5; i++) {
        const x = 150 + i * 220
        body += `<g stroke="${g[2]}" stroke-width="4"><line x1="${x}" y1="700" x2="${x}" y2="560"/><g transform="translate(${x} 560)"><line x1="0" y1="0" x2="${-34}" y2="-12"/><line x1="0" y1="0" x2="34" y2="-12"/><line x1="0" y1="0" x2="0" y2="-38"/></g></g>`
      }
      body += van(820, 640, 0.7, true)
      break
    case 'sea':
    case 'cliff':
      body += sea(r, 470, g[0], g[1], o.sun ? o.sun.color : undefined)
      if (o.kind === 'cliff') body += `<path d="M0 300 L180 330 L260 420 L330 470 L380 800 L0 800 Z" fill="${g[2]}"/><path d="M1200 380 L1050 420 L980 520 L940 800 L1200 800Z" fill="${g[2]}" opacity="0.9"/>`
      else body += `<path d="M0 720 Q300 680 600 700 T1200 690 V800 H0 Z" fill="#e8d3a8" opacity="0.9"/>`
      break
    case 'terrace':
      body += sea(r, 380, g[0], g[1], o.sun?.color)
      for (let i = 0; i < 8; i++) {
        const y = 430 + i * 48
        body += `<path d="M${-40 + i * 20} ${y} Q${400 + r() * 100} ${y - 40} ${900 + r() * 200} ${y + 10} L1240 ${y + 30} V800 H-40 Z" fill="${i % 2 ? '#5f7a3a' : '#7a9447'}" opacity="${0.92 - i * 0.02}"/>`
        body += `<path d="M${-40 + i * 20} ${y} Q${400 + r() * 100} ${y - 40} ${900 + r() * 200} ${y + 10}" stroke="#2e3a1d" stroke-width="3" fill="none" opacity="0.5"/>`
      }
      break
    case 'camp':
      body += ridge(r, 560, 40, 50, g[0])
      body += sea(r, 600, '#151a35', '#0b0e1f', '#9aa7ff')
      body += `<rect x="0" y="690" width="${W}" height="110" fill="#1a1712"/>`
      body += van(160, 600, 0.9, true) + tent(720, 700, 1) + fire(620, 700, !!o.animated)
      break
    case 'tea':
      body += ridge(r, 330, 40, 40, g[0], 0.6)
      for (let i = 0; i < 14; i++) {
        const y = 380 + i * 32
        body += `<path d="M-50 ${y + 40} Q600 ${y - 40 - i * 4} 1250 ${y + 40}" stroke="${i % 2 ? '#2f6b3a' : '#3f8a4a'}" stroke-width="${16 + i * 2}" fill="none" stroke-linecap="round"/>`
      }
      break
    case 'bamboo':
      for (let i = 0; i < 46; i++) {
        const x = r() * W
        const w = 8 + r() * 18
        const c = ['#3f7a3a', '#5e9a48', '#2c5a2e', '#7ab060'][Math.floor(r() * 4)]
        body += `<rect x="${x.toFixed(0)}" y="-10" width="${w.toFixed(0)}" height="820" fill="${c}" opacity="${(0.6 + r() * 0.4).toFixed(2)}"/>`
        for (let k = 0; k < 6; k++) body += `<rect x="${x.toFixed(0)}" y="${(k * 140 + r() * 30).toFixed(0)}" width="${w.toFixed(0)}" height="4" fill="#1d3a1e" opacity="0.5"/>`
      }
      body += `<rect width="${W}" height="${H}" fill="url(#shaft)"/><defs><linearGradient id="shaft" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff6c8" stop-opacity="0.45"/><stop offset="0.5" stop-color="#fff6c8" stop-opacity="0"/></linearGradient></defs>`
      break
    case 'city':
      for (let i = 0; i < 26; i++) {
        const w = 40 + r() * 70
        const h = 120 + r() * 320
        const x = i * 48 - 20
        body += `<rect x="${x.toFixed(0)}" y="${(H - 120 - h).toFixed(0)}" width="${w.toFixed(0)}" height="${(h + 120).toFixed(0)}" fill="${['#141833', '#1b2042', '#0f1228'][i % 3]}"/>`
        for (let k = 0; k < 18; k++)
          if (r() < 0.4)
            body += `<rect x="${(x + 6 + r() * (w - 14)).toFixed(0)}" y="${(H - 110 - r() * h).toFixed(0)}" width="5" height="7" fill="#ffd58a" opacity="${(0.5 + r() * 0.5).toFixed(2)}"/>`
      }
      body += `<rect x="0" y="${H - 80}" width="${W}" height="80" fill="#0a0c18"/>`
      for (let i = 0; i < 30; i++) body += `<rect x="${(r() * W).toFixed(0)}" y="${(H - 60 + r() * 30).toFixed(0)}" width="${(20 + r() * 50).toFixed(0)}" height="3" fill="${r() < 0.5 ? '#ff5a5a' : '#fff2c4'}" opacity="0.8"/>`
      break
  }

  const grain = `<filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.09 0"/></filter>`
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient>
    <filter id="blur"><feGaussianBlur stdDeviation="24"/></filter>${grain}
    <radialGradient id="vig" cx="0.5" cy="0.5" r="0.75"><stop offset="0.6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.45"/></radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#sky)"/>
  ${body}
  <rect width="${W}" height="${H}" filter="url(#grain)"/>
  <rect width="${W}" height="${H}" fill="url(#vig)"/>
</svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}
