import { Composition } from 'remotion'
import { Short } from './Short'
import { episode, FPS, summary, totalFrames } from './edl'
import type { TripData } from './data'
import tripJson from '../public/trip.json'

const trip = tripJson as unknown as TripData

export function Root() {
  const eps = trip.days.map((d) => ({ id: `EP${String(d.index + 1).padStart(2, '0')}`, day: d.index, segs: episode(trip, d.index) }))
  const sum = summary(trip)
  return (
    <>
      {eps.map((e) => (
        <Composition key={e.id} id={e.id} component={Short} width={1080} height={1920} fps={FPS} durationInFrames={totalFrames(e.segs)} defaultProps={{ trip, segs: e.segs, day: e.day }} />
      ))}
      <Composition id="SUMMARY" component={Short} width={1080} height={1920} fps={FPS} durationInFrames={totalFrames(sum)} defaultProps={{ trip, segs: sum }} />
    </>
  )
}
