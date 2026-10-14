import { describe, expect, it } from 'vitest'
import { Vector3 } from 'three'
import { ROOM_SHAPES, findShape } from '../room/roomShapes'
import { lineX, lineZ, parseRoom, tileCentre, type RoomPlan } from '../room/roomLayout'
import { FACING_YAW, spawnTile } from '../avatar/placement'
import { RESTING_POSE } from '../avatar/idle'
import { addPoses } from '../avatar/pose'
import { standingWalker, angleDiff } from '../walk/walker'
import { THINGS, type ThingKind } from './things'
import {
  facingFor,
  freeActivity,
  pieceFor,
  requestThing,
  stepActivity,
  thingOf,
  thingWeight,
  type Activity,
} from './activity'
import {
  AVATAR_HEIGHT,
  DAY,
  LIE_HEIGHT,
  NIGHT,
  SIT_DROP,
  chairOut,
  lightsFor,
  nightLevel,
  sleepZs,
  steamPuffs,
  thingPose,
  thingTarget,
} from './thingPoses'

const DT = 1 / 60
const planOf = (id: 'square' | 'rectangle' | 'lshape') => parseRoom(findShape(id).rows)
const plans = ROOM_SHAPES.map((shape) => ({ shape, plan: parseRoom(shape.rows) }))
const THINGS_LIST: ThingKind[] = ['sleep', 'cook', 'bills']
const cases = plans.flatMap(({ shape, plan }) => THINGS_LIST.map((thing) => ({ room: shape.label, plan, thing })))

function startAt(plan: RoomPlan): Activity {
  const { x, z } = tileCentre(plan, spawnTile(plan))
  return freeActivity(standingWalker(x, z, FACING_YAW))
}

// Play frames until `until` says stop (or a time limit), recording each frame
function play(plan: RoomPlan, a: Activity, seconds: number, until?: (a: Activity) => boolean) {
  const frames: { a: Activity; done: ThingKind | null; time: number }[] = []
  let time = 0
  while (time < seconds) {
    const step = stepActivity(plan, a, DT)
    a = step.activity
    time += DT
    frames.push({ a, done: step.done, time })
    if (until?.(a)) break
  }
  return { a, frames }
}

describe('v2 Block 2: doing a thing', () => {
  it.each(cases)('V2B2-T1: $room: tapping the piece for "$thing" walks to its use spot', ({ plan, thing }) => {
    const a = requestThing(plan, startAt(plan), { type: 'use', thing })
    const spot = tileCentre(plan, pieceFor(plan, thing).useSpot)
    expect(a.phase.name).toBe('approach')
    const points = a.walker.route!.points
    expect(points[points.length - 1]).toEqual(spot)
  })

  it.each(cases)('V2B2-T2: $room: "$thing" only starts once there and facing the piece', ({ plan, thing }) => {
    const { frames } = play(plan, requestThing(plan, startAt(plan), { type: 'use', thing }), 20, (a) => a.phase.name === 'enter')
    const before = frames.slice(0, -1)
    for (const f of before) expect(thingWeight(f.a.phase)).toBe(0)
    const first = frames[frames.length - 1].a
    expect(first.phase.name).toBe('enter')
    const spot = tileCentre(plan, pieceFor(plan, thing).useSpot)
    expect(first.walker.x).toBeCloseTo(spot.x, 9)
    expect(first.walker.z).toBeCloseTo(spot.z, 9)
    expect(Math.abs(angleDiff(first.walker.heading, facingFor(plan, pieceFor(plan, thing))))).toBeLessThan(1e-9)
  })

  it.each(cases)('V2B2-T3: $room: "$thing" lasts its set time, counts once, and ends standing on the spot', ({ plan, thing }) => {
    const started = play(plan, requestThing(plan, startAt(plan), { type: 'use', thing }), 20, (a) => a.phase.name === 'enter').a
    const { a, frames } = play(plan, started, 20, (x) => x.phase.name === 'free')
    const { enter, hold, exit } = THINGS[thing]
    const dones = frames.filter((f) => f.done)
    expect(dones.map((f) => f.done)).toEqual([thing])
    expect(dones[0].time).toBeCloseTo(enter + hold + exit, 1) // within a frame or two
    const spot = tileCentre(plan, pieceFor(plan, thing).useSpot)
    expect(a.phase.name).toBe('free')
    expect(a.walker.x).toBeCloseTo(spot.x, 9)
    expect(a.walker.z).toBeCloseTo(spot.z, 9)
    expect(thingWeight(a.phase)).toBe(0)
  })

  it('V2B2-T4: a floor tap while busy gets up smoothly, never counts it, then walks there', () => {
    const plan = planOf('square')
    let a = play(plan, requestThing(plan, startAt(plan), { type: 'use', thing: 'cook' }), 20, (x) => x.phase.name === 'hold').a
    const goal = { col: 3, row: 6 }
    const before = thingWeight(a.phase)
    a = requestThing(plan, a, { type: 'walk', tile: goal })
    expect(a.phase.name).toBe('exit')
    expect(thingWeight(a.phase)).toBeCloseTo(before, 9) // no jump
    const { a: end, frames } = play(plan, a, 15)
    expect(frames.some((f) => f.done)).toBe(false)
    let last = before
    for (const f of frames) {
      const w = thingWeight(f.a.phase)
      expect(w).toBeLessThanOrEqual(last + 1e-9) // only ever lets go
      last = w
    }
    const spot = tileCentre(plan, goal)
    expect(end.walker.x).toBeCloseTo(spot.x, 9)
    expect(end.walker.z).toBeCloseTo(spot.z, 9)
    // cancelling while still easing in starts getting up from that same point
    let b = play(plan, requestThing(plan, startAt(plan), { type: 'use', thing: 'bills' }), 20, (x) => x.phase.name === 'enter' && x.phase.t > 0.3).a
    const mid = thingWeight(b.phase)
    b = requestThing(plan, b, { type: 'walk', tile: goal })
    expect(thingWeight(b.phase)).toBeCloseTo(mid, 9)
  })

  it('V2B2-T5: tapping another piece while busy finishes getting up, then goes and does that one', () => {
    const plan = planOf('lshape')
    let a = play(plan, requestThing(plan, startAt(plan), { type: 'use', thing: 'sleep' }), 20, (x) => x.phase.name === 'hold').a
    a = requestThing(plan, a, { type: 'use', thing: 'cook' })
    const { frames } = play(plan, a, 30)
    expect(frames.filter((f) => f.done).map((f) => f.done)).toEqual(['cook'])
    // and tapping the same piece again while doing it changes nothing
    const doing = play(plan, requestThing(plan, startAt(plan), { type: 'use', thing: 'bills' }), 20, (x) => x.phase.name === 'hold').a
    expect(requestThing(plan, doing, { type: 'use', thing: 'bills' })).toBe(doing)
  })

  it('V2B2-T6: the poses stay within what a body can do', () => {
    for (const thing of THINGS_LIST) {
      for (let t = 0; t < 3; t += 0.05) {
        const pose = thingPose(thing, t)
        for (const knee of [pose.leftLowerLeg, pose.rightLowerLeg]) if (knee) expect(knee.x).toBeGreaterThanOrEqual(0) // knees only bend back
        for (const turn of Object.values(pose)) {
          expect(Math.abs(turn.x)).toBeLessThanOrEqual(Math.PI / 2 + 1e-9)
          expect(Math.abs(turn.y)).toBeLessThanOrEqual(Math.PI / 2)
          expect(Math.abs(turn.z)).toBeLessThanOrEqual(0.5)
        }
        expect(Math.abs(pose.spine?.x ?? 0)).toBeLessThan(0.2) // a lean, not a bow
      }
    }
    // sitting: thighs level, shins straight down
    const sit = thingPose('bills', 0)
    expect(sit.leftUpperLeg!.x).toBeCloseTo(-Math.PI / 2, 9)
    expect(sit.leftLowerLeg!.x).toBeCloseTo(Math.PI / 2, 9)
    // none of a thing shown = exactly the resting pose
    const blended = addPoses(RESTING_POSE, thingPose('cook', 1.3), 0)
    for (const [bone, turn] of Object.entries(blended)) {
      const rest = RESTING_POSE[bone as keyof typeof RESTING_POSE] ?? { x: 0, y: 0, z: 0 }
      expect(turn.x).toBeCloseTo(rest.x, 12)
      expect(turn.z).toBeCloseTo(rest.z, 12)
    }
  })

  it('V2B2-T7: the room goes dark only while asleep and is back to day exactly when sleep ends', () => {
    const plan = planOf('square')
    const { frames } = play(plan, requestThing(plan, startAt(plan), { type: 'use', thing: 'sleep' }), 30)
    let sawNight = false
    for (const f of frames) {
      const night = nightLevel(thingOf(f.a.phase), thingWeight(f.a.phase))
      if (f.a.phase.name === 'hold') {
        expect(night).toBe(1)
        sawNight = true
      }
      if (f.a.phase.name === 'free' || f.a.phase.name === 'approach' || f.a.phase.name === 'turn') expect(night).toBe(0)
      if (f.done) expect(night).toBe(0) // the frame sleep ends
    }
    expect(sawNight).toBe(true)
    expect(lightsFor(0)).toEqual(DAY)
    expect(lightsFor(1).ambient).toBeCloseTo(NIGHT.ambient, 12)
    expect(lightsFor(1).sun).toBeCloseTo(NIGHT.sun, 12)
    // cooking and paying bills never dim the room; only the desk moves the chair
    for (const thing of ['cook', 'bills'] as const) expect(nightLevel(thing, 1)).toBe(0)
    expect(chairOut('bills', 1)).toBe(1)
    expect(chairOut('cook', 1)).toBe(0)
    expect(chairOut(null, 0)).toBe(0)
  })

  it.each(plans)('V2B2-T8: $shape.label: lying down fits on the bed, face up; sitting is at the desk', ({ plan }) => {
    const bed = pieceFor(plan, 'sleep')
    const lie = thingTarget(plan, 'sleep', bed)
    const along = new Vector3(0, 1, 0).applyQuaternion(lie.quaternion) // from feet towards the head
    const face = new Vector3(0, 0, 1).applyQuaternion(lie.quaternion)
    expect(face.y).toBeCloseTo(1, 9) // looking at the ceiling
    expect(along.y).toBeCloseTo(0, 9) // flat
    const head = lie.position.clone().addScaledVector(along, AVATAR_HEIGHT)
    const [x0, x1] = [lineX(plan, bed.col), lineX(plan, bed.col + bed.cols)]
    const [z0, z1] = [lineZ(plan, bed.row), lineZ(plan, bed.row + bed.rows)]
    for (const p of [lie.position, head]) {
      expect(p.x).toBeGreaterThan(x0)
      expect(p.x).toBeLessThan(x1)
      expect(p.z).toBeGreaterThan(z0)
      expect(p.z).toBeLessThan(z1)
    }
    expect(lie.position.y).toBe(LIE_HEIGHT)
    // the head is at the headboard end: nearer the wall the bed stands against than the feet are
    const wallSide = { north: (p: Vector3) => p.z - z0, south: (p: Vector3) => z1 - p.z, west: (p: Vector3) => p.x - x0, east: (p: Vector3) => x1 - p.x }[bed.back]
    expect(wallSide(head)).toBeLessThan(wallSide(lie.position))
    // sitting: over the use spot, lowered, facing the desk
    const desk = pieceFor(plan, 'bills')
    const sit = thingTarget(plan, 'bills', desk)
    const spot = tileCentre(plan, desk.useSpot)
    expect([sit.position.x, sit.position.z]).toEqual([spot.x, spot.z])
    expect(sit.position.y).toBe(SIT_DROP)
    expect(SIT_DROP).toBeLessThan(-0.25)
  })

  it('V2B2-T9: the "z"s and the steam rise and fade', () => {
    for (let t = 0; t < 4; t += 0.05) {
      for (const p of [...sleepZs(t), ...steamPuffs(t)]) {
        expect(p.opacity).toBeGreaterThanOrEqual(-1e-12)
        expect(p.opacity).toBeLessThanOrEqual(1)
        expect(p.rise).toBeGreaterThanOrEqual(0)
      }
    }
    // a "z" fades out at the top of its rise and is gone when it starts again
    const zAt = (age: number) => sleepZs(age * 2)[0]
    expect(zAt(0).opacity).toBeCloseTo(0, 9)
    expect(zAt(0.5).opacity).toBeCloseTo(1, 9)
    expect(zAt(0.9).rise).toBeGreaterThan(zAt(0.5).rise)
  })
})
