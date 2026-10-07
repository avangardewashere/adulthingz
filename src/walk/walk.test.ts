import { describe, expect, it } from 'vitest'
import { ROOM_SHAPES, findShape } from '../room/roomShapes'
import { corners, freeTiles, isFree, lineX, lineZ, parseRoom, tileAt, tileCentre, type Tile } from '../room/roomLayout'
import {
  AVATAR_RADIUS,
  clearLine,
  distance,
  findPath,
  fits,
  octile,
  pathLength,
  planWalk,
  pointAlong,
  smoothPath,
} from './path'
import { WALK, angleDiff, standingWalker, startRoute, stepWalker, turnToward, type Walker } from './walker'
import { BOB, SWING, bobAt, stepsPerSecond, walkPose } from './walkCycle'
import { addPoses } from '../avatar/pose'
import { RESTING_POSE } from '../avatar/idle'
import { spawnTile } from '../avatar/placement'
import { isTap } from '../lib/tap'

const planOf = (id: 'square' | 'rectangle' | 'lshape') => parseRoom(findShape(id).rows)
const plans = ROOM_SHAPES.map((shape) => ({ shape, plan: parseRoom(shape.rows) }))

// Every point along a walk, 2 cm apart
function samples(points: { x: number; z: number }[]) {
  const out = []
  const length = pathLength(points)
  for (let d = 0; d <= length; d += 0.02) out.push(pointAlong(points, d))
  out.push(pointAlong(points, length))
  return out
}

describe('Block 3: tap to walk', () => {
  it('B3-T1: a tap point maps to the tile under it; no floor means no tile', () => {
    const square = planOf('square') // 4 × 4 m, centred on 0
    expect(tileAt(square, 0.1, 0.1)).toEqual({ col: 4, row: 4 })
    expect(tileAt(square, -1.9, -1.9)).toEqual({ col: 0, row: 0 })
    expect(tileAt(square, 1.99, 1.99)).toEqual({ col: 7, row: 7 })
    expect(tileAt(square, 2.1, 0)).toBeNull() // past the right wall
    const l = planOf('lshape')
    const inCutOut = tileCentre(l, { col: 8, row: 7 })
    expect(tileAt(l, inCutOut.x, inCutOut.z)).toBeNull()
  })

  // Square and rectangle: from the start tile. L-shape: from EVERY tile to every tile, because
  // only routes that pass its inside corner can catch a diagonal step cutting that corner.
  const routes = plans.flatMap(({ shape, plan }) =>
    (shape.id === 'lshape' ? freeTiles(plan) : [spawnTile(plan)]).map((from) => ({ shape, plan, from })),
  )
  it.each(routes)('B3-T2: $shape.label from $from.col,$from.row: a path to every free tile, on free floor only', ({ plan, from }) => {
    for (const to of freeTiles(plan)) {
      const path = findPath(plan, from, to)!
      expect(path, `to ${to.col},${to.row}`).not.toBeNull()
      expect(path[0]).toEqual(from)
      expect(path[path.length - 1]).toEqual(to)
      for (let i = 1; i < path.length; i++) {
        const [a, b] = [path[i - 1], path[i]]
        const dc = b.col - a.col
        const dr = b.row - a.row
        expect(isFree(plan, b.col, b.row)).toBe(true) // floor with no furniture
        expect(Math.max(Math.abs(dc), Math.abs(dr))).toBe(1) // one step to a neighbour
        if (dc !== 0 && dr !== 0) {
          // a diagonal step never slips past a corner
          expect(isFree(plan, a.col + dc, a.row) && isFree(plan, a.col, a.row + dr)).toBe(true)
        }
      }
    }
  })

  it('B3-T3: paths are the shortest: tile steps match the best possible, open floor is one straight line', () => {
    const square = planOf('square')
    const cost = (path: Tile[]) =>
      path.slice(1).reduce((sum, t, i) => sum + (t.col !== path[i].col && t.row !== path[i].row ? Math.SQRT2 : 1), 0)
    // (from the front-left to the back-right: clear of the bed, desk and kitchenette)
    const path = findPath(square, { col: 2, row: 7 }, { col: 7, row: 3 })!
    expect(cost(path)).toBeCloseTo(octile(5, 4), 9)
    // smoothed, it's a straight walk from the first tile centre to the last
    const start = tileCentre(square, { col: 2, row: 7 })
    const walk = smoothPath(square, start, path)
    expect(walk).toHaveLength(2)
    expect(pathLength(walk)).toBeCloseTo(distance(start, tileCentre(square, { col: 7, row: 3 })), 9)
  })

  it('B3-T4: in the L-shape the walk goes round the inside corner, never through it', () => {
    const l = planOf('lshape')
    const start = tileCentre(l, { col: 10, row: 2 }) // back of the right arm
    const goal = { col: 2, row: 8 } // front of the left arm
    const walk = planWalk(l, start, goal)!
    expect(walk).not.toBeNull()
    // a straight line would clip the corner, so the walk must bend
    expect(clearLine(l, start, tileCentre(l, goal))).toBe(false)
    expect(walk.length).toBeGreaterThan(2)
    const [elbow] = corners(l).inside
    const corner = { x: lineX(l, elbow.col), z: lineZ(l, elbow.row) }
    for (const p of samples(walk)) {
      expect(fits(l, p.x, p.z), `body fits at ${p.x.toFixed(2)}, ${p.z.toFixed(2)}`).toBe(true)
      expect(distance(p, corner)).toBeGreaterThanOrEqual(AVATAR_RADIUS - 1e-9)
    }
    // and smoothing made it shorter than stepping tile by tile
    const tiles = findPath(l, { col: 10, row: 2 }, goal)!
    expect(pathLength(walk)).toBeLessThan(pathLength(tiles.map((t) => tileCentre(l, t))))
  })

  it.each(plans)('B3-T4b: $shape.label: every walk from the start tile keeps the body on the floor', ({ plan }) => {
    const start = tileCentre(plan, spawnTile(plan))
    for (const goal of freeTiles(plan)) {
      const walk = planWalk(plan, start, goal)
      if (!walk) continue // the start tile itself
      for (const p of samples(walk)) expect(fits(plan, p.x, p.z), `to ${goal.col},${goal.row}`).toBe(true)
    }
  })

  it('B3-T5: no way there gives no walk, and tapping your own tile gives no walk', () => {
    const split = parseRoom(['##..##'])
    expect(findPath(split, { col: 0, row: 0 }, { col: 5, row: 0 })).toBeNull()
    expect(planWalk(split, tileCentre(split, { col: 0, row: 0 }), { col: 5, row: 0 })).toBeNull()
    const square = planOf('square')
    expect(planWalk(square, tileCentre(square, { col: 3, row: 3 }), { col: 3, row: 3 })).toBeNull()
    expect(findPath(square, { col: 3, row: 3 }, { col: 9, row: 9 })).toBeNull() // off the floor
    expect(findPath(square, { col: 3, row: 3 }, { col: 0, row: 0 })).toBeNull() // onto the bed
  })

  it('B3-T6: the walker arrives exactly, at walking speed, and turns the short way at a steady rate', () => {
    const dt = 1 / 60
    const points = [
      { x: 0, z: 0 },
      { x: 2, z: 0 },
    ] // heading +x = π/2
    let w: Walker = startRoute(standingWalker(0, 0, Math.PI / 2), points)
    // facing the way: covers 1.2 m in a second
    for (let i = 0; i < 60; i++) w = stepWalker(w, dt).walker
    expect(w.route!.travelled).toBeCloseTo(WALK.speed, 6)
    expect(w.blend).toBe(1)
    // keeps going until it stops exactly on the end point, reporting arrival once
    let arrivals = 0
    for (let i = 0; i < 120; i++) {
      const next = stepWalker(w, dt)
      if (next.arrived) arrivals++
      w = next.walker
    }
    expect(arrivals).toBe(1)
    expect(w.route).toBeNull()
    expect(w.x).toBe(2)
    expect(w.z).toBe(0)
    // legs settle back to standing within the blend time
    for (let i = 0; i < Math.ceil(WALK.blendSeconds / dt) + 1; i++) w = stepWalker(w, dt).walker
    expect(w.blend).toBe(0)

    // starting while facing away: turns first (barely moves), never faster than the turn rate
    let back: Walker = startRoute(standingWalker(0, 0, -Math.PI / 2), points)
    const first = stepWalker(back, dt).walker
    expect(first.route!.travelled).toBeCloseTo(WALK.speed * WALK.slowestWhileTurning * dt, 9)
    for (let i = 0; i < 30; i++) {
      const next = stepWalker(back, dt).walker
      expect(Math.abs(angleDiff(back.heading, next.heading))).toBeLessThanOrEqual(WALK.turnRate * dt + 1e-9)
      back = next
    }
    expect(Math.abs(angleDiff(back.heading, Math.PI / 2))).toBeLessThan(1e-9) // facing the way now
    // the short way round: from 170° to −170° is a 20° turn, not 340°
    const from = (170 * Math.PI) / 180
    expect(turnToward(from, (-170 * Math.PI) / 180, 0.1)).toBeCloseTo(from + 0.1, 9)
  })

  it('B3-T7: the walk cycle: legs alternate, arms swing against them, knees only bend forward', () => {
    for (let i = 0; i < 100; i++) {
      const phase = i / 100
      const pose = walkPose(phase)
      expect(pose.leftUpperLeg!.x).toBeCloseTo(-pose.rightUpperLeg!.x, 12)
      // each arm swings opposite to the leg on its own side (forward = negative x)
      expect(Math.sign(pose.leftUpperArm!.x)).toBe(-Math.sign(pose.leftUpperLeg!.x))
      expect(pose.leftLowerLeg!.x).toBeGreaterThanOrEqual(0)
      expect(pose.rightLowerLeg!.x).toBeGreaterThanOrEqual(0)
      expect(Math.abs(pose.leftUpperLeg!.x)).toBeLessThanOrEqual(SWING.leg)
      expect(bobAt(phase)).toBeLessThanOrEqual(0)
      expect(bobAt(phase)).toBeGreaterThanOrEqual(-BOB)
    }
    // repeats every stride
    expect(walkPose(1).leftUpperLeg!.x).toBeCloseTo(walkPose(0).leftUpperLeg!.x, 12)
    // the knee bends while that leg swings forward (phase 0: left leg passing, moving forward)
    expect(walkPose(0).leftLowerLeg!.x).toBe(SWING.knee)
    expect(walkPose(0).rightLowerLeg!.x).toBe(0)
    // a person's pace: 1.6 to 2.2 steps a second
    expect(stepsPerSecond(WALK.speed)).toBeGreaterThanOrEqual(1.6)
    expect(stepsPerSecond(WALK.speed)).toBeLessThanOrEqual(2.2)
  })

  it('B3-T7b: blending: no walk shown = exactly the resting pose', () => {
    const blended = addPoses(RESTING_POSE, walkPose(0.3), 0)
    for (const [bone, t] of Object.entries(blended)) {
      const rest = RESTING_POSE[bone as keyof typeof RESTING_POSE] ?? { x: 0, y: 0, z: 0 }
      expect(t.x).toBeCloseTo(rest.x, 12)
      expect(t.y).toBeCloseTo(rest.y, 12)
      expect(t.z).toBeCloseTo(rest.z, 12)
    }
  })

  it('B3-T8: a press that moves under 6 px is a tap; more is a camera drag', () => {
    expect(isTap(0)).toBe(true)
    expect(isTap(5)).toBe(true)
    expect(isTap(6)).toBe(false)
    expect(isTap(12)).toBe(false)
  })
})
