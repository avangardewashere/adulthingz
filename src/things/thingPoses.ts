import { Matrix4, Quaternion, Vector3 } from 'three'
import { tileCentre, type RoomPlan } from '../room/roomLayout'
import type { Piece } from '../room/furniture'
import { pieceFrame } from '../room/furnitureParts'
import { turn, type Pose } from '../avatar/pose'
import { facingFor } from './activity'
import { smooth, type ThingKind } from './things'

// How each thing looks: where the avatar's body goes (lying on the bed, sitting on the chair)
// and how its bones bend. three.js maths classes only (no drawing), so the tests can run it.

const UP = new Vector3(0, 1, 0)

export interface BodyTransform {
  position: Vector3 // the avatar's origin, between its feet when standing
  quaternion: Quaternion
}

export function standingTransform(x: number, y: number, z: number, heading: number): BodyTransform {
  return { position: new Vector3(x, y, z), quaternion: new Quaternion().setFromAxisAngle(UP, heading) }
}

// Sizes of the avatar (metres), measured in v1: head top about 1.5 m, hips 0.91 m
export const AVATAR_HEIGHT = 1.5
const HIP_HEIGHT = 0.91
// Lying on its back: the back of the body is about 0.12 m behind the origin line
export const LIE_HEIGHT = 0.46 + 0.12 // mattress top + half the body's thickness
const HEAD_GAP = 0.1 // from the headboard to the top of the head
// Sitting: the hips settle about 0.09 m above the seat (0.485 m)
export const SIT_DROP = 0.485 + 0.09 - HIP_HEIGHT // how far the whole body goes down (negative)
export const CHAIR_SLIDE = 0.45 // metres the chair slides out from under the desk

// Where the body is at the end of easing in (weight 1)
export function thingTarget(plan: RoomPlan, thing: ThingKind, piece: Piece): BodyTransform {
  const spot = tileCentre(plan, piece.useSpot)
  const facing = facingFor(plan, piece)
  if (thing === 'cook') return standingTransform(spot.x, 0, spot.z, facing)
  if (thing === 'bills') return standingTransform(spot.x, SIT_DROP, spot.z, facing)

  // sleep: on its back along the bed, head at the headboard, face up
  const { origin, F } = pieceFrame(plan, piece) // origin: middle of the head end; F: towards the foot
  const toHead = new Vector3(-F[0], 0, -F[1])
  const headTop = new Vector3(origin[0], LIE_HEIGHT, origin[1]).addScaledVector(toHead, -HEAD_GAP)
  const feet = headTop.clone().addScaledVector(toHead, -AVATAR_HEIGHT)
  // the body's own axes: up (its head) → towards the headboard, front (its face) → the ceiling
  const sideways = new Vector3().crossVectors(toHead, UP)
  const quaternion = new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(sideways, toHead, UP))
  return { position: feet, quaternion }
}

// From standing (w = 0) to the thing's position (w = 1). `lift` raises the body in the middle
// of the move, so lying down goes up over the bed frame instead of through it.
export function blendTransform(a: BodyTransform, b: BodyTransform, w: number, lift = 0): BodyTransform {
  const position = a.position.clone().lerp(b.position, w)
  position.y += Math.sin(Math.PI * w) * lift
  return { position, quaternion: a.quaternion.clone().slerp(b.quaternion, w) }
}

export const LIFT: Record<ThingKind, number> = { sleep: 0.3, cook: 0, bills: 0 }

// ── Bones (written the VRM 1 way, see pose.ts; added on top of the resting arms) ──
// Remember: x > 0 tips a hanging arm or leg BACK, but tips the upright spine FORWARD.
export function thingPose(thing: ThingKind, t: number): Pose {
  if (thing === 'sleep') return {} // lying still: arms rest by the sides

  if (thing === 'cook') {
    const stir = (2 * Math.PI * t) / 1.2 // one circle of the spoon every 1.2 s
    return {
      chest: turn(0.1), // leaning a little over the counter
      rightUpperArm: turn(-0.55 + 0.1 * Math.sin(stir), 0, 0.1 * Math.cos(stir)), // forward, circling
      rightLowerArm: turn(0, 0.6, 0), // elbow bent, hand down at the pot
      leftUpperArm: turn(-0.4), // the other hand rests on the counter
      leftLowerArm: turn(0, -0.6, 0),
    }
  }

  // bills: sitting at the desk, typing
  const tap = (2 * Math.PI * t) * 5 // five little taps a second
  return {
    leftUpperLeg: turn(-Math.PI / 2), // thighs level
    rightUpperLeg: turn(-Math.PI / 2),
    leftLowerLeg: turn(Math.PI / 2), // shins straight down
    rightLowerLeg: turn(Math.PI / 2),
    spine: turn(0.1), // leaning towards the laptop
    leftUpperArm: turn(-0.75),
    rightUpperArm: turn(-0.75),
    leftLowerArm: turn(0.04 * Math.sin(tap), -1.1, 0),
    rightLowerArm: turn(0.04 * Math.sin(tap + Math.PI), 1.1, 0), // the hands take turns
  }
}

// ── Things around the avatar, all driven by the same weight ──
export const nightLevel = (thing: ThingKind | null, w: number) => (thing === 'sleep' ? w : 0) // room dims while asleep

// Light strengths from day (night 0) to night (1). They only get dimmer, never tinted:
// a coloured light greys out every colour in the room.
export const DAY = { ambient: 2.1, sun: 1.3 } as const
export const NIGHT = { ambient: 0.85, sun: 0.3 } as const
export function lightsFor(night: number) {
  return { ambient: DAY.ambient + (NIGHT.ambient - DAY.ambient) * night, sun: DAY.sun + (NIGHT.sun - DAY.sun) * night }
}
export const chairOut = (thing: ThingKind | null, w: number) => (thing === 'bills' ? w : 0) // 0 tucked … 1 out
export const eyesShut = (thing: ThingKind | null, w: number) => (thing === 'sleep' ? smooth(w * 1.5) : 0)

// The floating "z"s while asleep: three of them, each rising and fading over 2 s, a third apart
export function sleepZs(t: number) {
  return [0, 1, 2].map((i) => {
    const age = (t / 2 + i / 3) % 1 // 0 … 1 through one "z"'s life
    // big enough to read from the camera's usual distance (about 10 m)
    return { rise: 0.5 * age, opacity: Math.sin(Math.PI * age), size: 0.2 + 0.12 * age }
  })
}

// Steam from the pot while cooking: four puffs, each rising 0.35 m over 1.6 s and fading
export function steamPuffs(t: number) {
  return [0, 1, 2, 3].map((i) => {
    const age = (t / 1.6 + i / 4) % 1
    return { rise: 0.35 * age, drift: 0.04 * Math.sin(age * 5 + i), opacity: 0.6 * Math.sin(Math.PI * age), size: 0.06 + 0.1 * age }
  })
}
