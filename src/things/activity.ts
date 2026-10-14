import { tileCentre, type RoomPlan, type Tile } from '../room/roomLayout'
import type { Piece } from '../room/furniture'
import { headingOf, planWalk } from '../walk/path'
import { WALK, angleDiff, startRoute, stepWalker, turnToward, type Walker } from '../walk/walker'
import { FURNITURE_FOR, THINGS, smooth, type ThingKind } from './things'

// What the avatar is up to, one frame at a time. Plain maths: the tests drive it with a fake
// clock, AvatarModel.tsx with the real one. The walker (v1) still does all the walking.
//
//   free ──tap a piece──▶ approach ──arrived──▶ turn ──facing it──▶ enter ─▶ hold ─▶ exit ─▶ free
//                                                                    (eases in) (does it) (eases out)
// Tapping the floor or another piece while busy: walking or turning stop at once; once the
// pose has started, the avatar gets up first (exit), then goes. Only a thing that runs to
// the end counts as done.

export type Request = { type: 'walk'; tile: Tile } | { type: 'use'; thing: ThingKind }

export type Phase =
  | { name: 'free' }
  | { name: 'approach'; thing: ThingKind }
  | { name: 'turn'; thing: ThingKind }
  | { name: 'enter'; thing: ThingKind; t: number }
  | { name: 'hold'; thing: ThingKind; t: number }
  // `from` = how far into the pose it was when it started getting up (1 after a full hold)
  | { name: 'exit'; thing: ThingKind; t: number; from: number; finished: boolean }

export interface Activity {
  walker: Walker
  phase: Phase
  queued: Request | null // what to do once it has got up
}

export function freeActivity(walker: Walker): Activity {
  return { walker, phase: { name: 'free' }, queued: null }
}

export function pieceFor(plan: RoomPlan, thing: ThingKind): Piece {
  const piece = plan.furniture.find((p) => p.kind === FURNITURE_FOR[thing])
  if (!piece) throw new Error(`This room has no ${FURNITURE_FOR[thing]}`)
  return piece
}

// The heading that looks from the use spot straight at the piece
export function facingFor(plan: RoomPlan, piece: Piece) {
  const step = { north: [0, -1], south: [0, 1], west: [-1, 0], east: [1, 0] }[piece.useSide]
  // the use spot is on `useSide` of the piece, so the piece lies the opposite way
  const into = { col: piece.useSpot.col - step[0], row: piece.useSpot.row - step[1] }
  return headingOf(tileCentre(plan, piece.useSpot), tileCentre(plan, into))
}

// How much of the thing's pose is showing: 0 standing … 1 fully in it
export function thingWeight(phase: Phase) {
  if (phase.name === 'enter') return smooth(phase.t / THINGS[phase.thing].enter)
  if (phase.name === 'hold') return 1
  if (phase.name === 'exit') return phase.from * (1 - smooth(phase.t / THINGS[phase.thing].exit))
  return 0
}

export function thingOf(phase: Phase): ThingKind | null {
  return phase.name === 'free' ? null : phase.thing
}

// Start doing a request from a standing (or walking) start
function begin(plan: RoomPlan, a: Activity, req: Request): Activity {
  if (req.type === 'walk') {
    const points = planWalk(plan, a.walker, req.tile)
    return { walker: points ? startRoute(a.walker, points) : a.walker, phase: { name: 'free' }, queued: null }
  }
  const piece = pieceFor(plan, req.thing)
  const points = planWalk(plan, a.walker, piece.useSpot)
  if (!points) {
    // already standing on the use spot: stop any walk and turn to face it
    return { walker: { ...a.walker, route: null }, phase: { name: 'turn', thing: req.thing }, queued: null }
  }
  return { walker: startRoute(a.walker, points), phase: { name: 'approach', thing: req.thing }, queued: null }
}

// A tap arrives
export function requestThing(plan: RoomPlan, a: Activity, req: Request): Activity {
  const { phase } = a
  const same = req.type === 'use' && phase.name !== 'free' && req.thing === phase.thing
  if (phase.name === 'enter' || phase.name === 'hold') {
    if (same) return a // already doing exactly that
    // get up first, from however far into the pose it is
    return { ...a, phase: { name: 'exit', thing: phase.thing, t: 0, from: thingWeight(phase), finished: false }, queued: req }
  }
  if (phase.name === 'exit') return { ...a, queued: req }
  if (same) return a // already on the way
  return begin(plan, a, req)
}

// One frame. `done` names the thing on the one frame it finishes properly.
export function stepActivity(plan: RoomPlan, a: Activity, dt: number): { activity: Activity; done: ThingKind | null } {
  const moved = stepWalker(a.walker, dt)
  let walker = moved.walker
  const { phase } = a

  switch (phase.name) {
    case 'free':
      return { activity: { ...a, walker }, done: null }

    case 'approach':
      return { activity: { ...a, walker, phase: moved.arrived ? { name: 'turn', thing: phase.thing } : phase }, done: null }

    case 'turn': {
      const facing = facingFor(plan, pieceFor(plan, phase.thing))
      walker = { ...walker, heading: turnToward(walker.heading, facing, WALK.turnRate * dt) }
      const facingIt = Math.abs(angleDiff(walker.heading, facing)) < 1e-9
      return { activity: { ...a, walker, phase: facingIt ? { name: 'enter', thing: phase.thing, t: 0 } : phase }, done: null }
    }

    case 'enter': {
      const t = phase.t + dt
      const { enter } = THINGS[phase.thing]
      const next: Phase = t >= enter ? { name: 'hold', thing: phase.thing, t: t - enter } : { ...phase, t }
      return { activity: { ...a, walker, phase: next }, done: null }
    }

    case 'hold': {
      const t = phase.t + dt
      const { hold } = THINGS[phase.thing]
      const next: Phase = t >= hold ? { name: 'exit', thing: phase.thing, t: t - hold, from: 1, finished: true } : { ...phase, t }
      return { activity: { ...a, walker, phase: next }, done: null }
    }

    case 'exit': {
      const t = phase.t + dt
      if (t < THINGS[phase.thing].exit) return { activity: { ...a, walker, phase: { ...phase, t } }, done: null }
      // back on its feet: count it if it ran to the end, then do whatever was asked meanwhile
      const standing = freeActivity(walker)
      const activity = a.queued ? begin(plan, standing, a.queued) : standing
      return { activity, done: phase.finished ? phase.thing : null }
    }
  }
}
