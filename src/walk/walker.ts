import { pathLength, pointAlong, type Point } from './path'
import { STRIDE_LENGTH } from './walkCycle'

// Moves the avatar along a route, one frame at a time. Plain maths: the tests step it
// with a fake clock, AvatarModel.tsx steps it with the real one.

export const WALK = {
  speed: 1.2, // m/s, a relaxed indoor stroll
  blendSeconds: 0.2, // how long the legs take to go from standing to walking, and back
  turnRate: 9, // rad/s, fastest turn: about a half-turn in a third of a second
  slowestWhileTurning: 0.2, // speed share when facing the wrong way, so it turns before it walks
} as const

export interface Route {
  points: Point[]
  travelled: number // metres along the points so far
  length: number
}

export interface Walker {
  x: number
  z: number
  heading: number // which way the avatar faces (see headingOf)
  blend: number // 0 standing … 1 walking: how much of the walk pose is shown
  phase: number // 0…1 position in the stride (see walkCycle.ts)
  route: Route | null
}

export function standingWalker(x: number, z: number, heading: number): Walker {
  return { x, z, heading, blend: 0, phase: 0, route: null }
}

export function startRoute(walker: Walker, points: Point[]): Walker {
  return { ...walker, route: { points, travelled: 0, length: pathLength(points) } }
}

// The difference between two headings, the short way round: −π … π
export function angleDiff(from: number, to: number) {
  const d = (to - from) % (2 * Math.PI)
  if (d > Math.PI) return d - 2 * Math.PI
  if (d <= -Math.PI) return d + 2 * Math.PI
  return d
}

// Turn from `current` towards `target`, by at most `maxStep`
export function turnToward(current: number, target: number, maxStep: number) {
  const d = angleDiff(current, target)
  return Math.abs(d) <= maxStep ? target : current + Math.sign(d) * maxStep
}

// One frame, dt seconds long. `arrived` is true on the one frame the route ends.
export function stepWalker(walker: Walker, dt: number): { walker: Walker; arrived: boolean } {
  const { route } = walker
  if (!route) {
    return { walker: { ...walker, blend: Math.max(0, walker.blend - dt / WALK.blendSeconds) }, arrived: false }
  }

  // Facing the wrong way? Mostly turn, barely move (no moonwalking)
  const ahead = pointAlong(route.points, route.travelled).heading
  const facing = Math.max(WALK.slowestWhileTurning, Math.cos(angleDiff(walker.heading, ahead)))
  const step = WALK.speed * facing * dt
  const travelled = Math.min(route.length, route.travelled + step)
  const p = pointAlong(route.points, travelled)
  const done = travelled >= route.length

  return {
    walker: {
      x: p.x,
      z: p.z,
      heading: turnToward(walker.heading, p.heading, WALK.turnRate * dt),
      blend: Math.min(1, walker.blend + dt / WALK.blendSeconds),
      // the legs cycle in step with the distance covered, so the feet keep up with the body
      phase: (walker.phase + step / STRIDE_LENGTH) % 1,
      route: done ? null : { ...route, travelled },
    },
    arrived: done,
  }
}
