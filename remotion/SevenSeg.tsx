// 자동차 계기판 LCD 숫자 (7-segment)
const SEGS: Record<string, string> = {
  '0': 'abcdef', '1': 'bc', '2': 'abged', '3': 'abgcd', '4': 'fgbc', '5': 'afgcd', '6': 'afgedc', '7': 'abc', '8': 'abcdefg', '9': 'abcdfg', '-': 'g', ' ': '',
}
const W = 60, H = 100, T = 11
const shape: Record<string, string> = {
  a: `M${T} 0 H${W - T} L${W - T * 1.6} ${T} H${T * 1.6} Z`,
  d: `M${T} ${H} H${W - T} L${W - T * 1.6} ${H - T} H${T * 1.6} Z`,
  g: `M${T * 0.8} ${H / 2} L${T * 1.6} ${H / 2 - T / 2} H${W - T * 1.6} L${W - T * 0.8} ${H / 2} L${W - T * 1.6} ${H / 2 + T / 2} H${T * 1.6} Z`,
  f: `M0 ${T} L${T} ${T * 1.6} V${H / 2 - T * 0.7} L0 ${H / 2 - T * 0.2} Z`,
  e: `M0 ${H / 2 + T * 0.2} L${T} ${H / 2 + T * 0.7} V${H - T * 1.6} L0 ${H - T} Z`,
  b: `M${W} ${T} L${W - T} ${T * 1.6} V${H / 2 - T * 0.7} L${W} ${H / 2 - T * 0.2} Z`,
  c: `M${W} ${H / 2 + T * 0.2} L${W - T} ${H / 2 + T * 0.7} V${H - T * 1.6} L${W} ${H - T} Z`,
}

export function SevenSeg({ text, height = 100, color, ghost = 0.09, glow = true }: { text: string; height?: number; color: string; ghost?: number; glow?: boolean }) {
  const chars = [...text]
  const gap = 16
  const width = chars.reduce((s, ch) => s + (ch === '.' || ch === ':' ? 18 : W + gap), 0)
  let x = 0
  return (
    <svg width={(width * height) / H} height={height} viewBox={`-4 -4 ${width + 8} ${H + 8}`} style={{ overflow: 'visible', filter: glow ? `drop-shadow(0 0 ${height / 10}px ${color})` : undefined }}>
      <g transform="skewX(-6)">
        {chars.map((ch, i) => {
          const x0 = x
          if (ch === '.' || ch === ':') {
            x += 18
            return ch === '.'
              ? <circle key={i} cx={x0 + 4} cy={H - 6} r={6} fill={color} />
              : <g key={i} fill={color}><circle cx={x0 + 4} cy={H * 0.3} r={6} /><circle cx={x0 + 4} cy={H * 0.7} r={6} /></g>
          }
          x += W + gap
          const on = SEGS[ch] ?? ''
          return (
            <g key={i} transform={`translate(${x0} 0)`}>
              {Object.entries(shape).map(([k, d]) => (
                <path key={k} d={d} fill={color} opacity={on.includes(k) ? 1 : ghost} />
              ))}
            </g>
          )
        })}
      </g>
    </svg>
  )
}
