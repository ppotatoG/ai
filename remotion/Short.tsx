import type React from 'react'
import { AbsoluteFill, Series } from 'remotion'
import { DayCard, Drive, Intro, Night, Outro, Shot } from './Scenes'
import { cityOf } from './theme'
import type { TripData } from './data'
import type { Seg } from './edl'

/** EDL(컷 목록)을 그대로 이어 붙이는 세로 숏폼 */
export function Short({ trip, segs, day }: { trip: TripData; segs: Seg[]; day?: number }) {
  const byId = new Map(trip.moments.map((m) => [m.id, m]))
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      <Series>
        {segs.map((s, i) => {
          const prev = segs[i - 1]
          let el: React.ReactNode = null
          if (s.type === 'intro') el = <Intro trip={trip} day={day} />
          else if (s.type === 'shot')
            el = <Shot clip={s.clip} startFrom={s.startFrom} moment={s.moment} odo={s.odo} ep={s.moment.day + 1} frames={s.frames} momentStart={!(prev?.type === 'shot' && prev.moment.id === s.moment.id)} />
          else if (s.type === 'drive')
            el = <Drive trip={trip} leg={s.leg} odo={s.odo} frames={s.frames} places={[cityOf(byId.get(s.leg.from)?.place ?? ''), cityOf(byId.get(s.leg.to)?.place ?? '')]} />
          else if (s.type === 'night') el = <Night day={day ?? 0} moment={s.moment} frames={s.frames} />
          else if (s.type === 'daycard') el = <DayCard trip={trip} day={s.day} />
          else if (s.type === 'outro') el = <Outro trip={trip} day={day} frames={s.frames} />
          return <Series.Sequence key={i} durationInFrames={s.frames}>{el}</Series.Sequence>
        })}
      </Series>
    </AbsoluteFill>
  )
}
