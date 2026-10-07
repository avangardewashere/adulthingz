import { turn, type Pose } from '../avatar/pose'

// A simple walk made in code: no animation files. One stride = a step with each foot.
//
// phase 0 … 1 goes once through a stride:
//   0     legs pass each other, the left leg swinging forward
//   0.25  left foot furthest forward, right furthest back (lowest point of the body)
//   0.5   legs pass again, now the right leg swings forward
//   0.75  right foot forward, left back
// A knee bends while its leg swings forward (foot off the ground) and straightens to land.
// Arms swing opposite to the legs, the chest twists a little with them, and the body dips
// slightly each time both feet are on the ground.

export const STRIDE_LENGTH = 1.2 // metres per stride (two steps of 0.6 m)

export const SWING = {
  leg: 0.45, // radians each way at the hip
  knee: 0.75, // most knee bend, mid-swing
  arm: 0.35, // radians each way at the shoulder
  twist: 0.06, // chest twist each way
} as const

export const BOB = 0.02 // metres the body dips at the lowest point

export function walkPose(phase: number): Pose {
  const s = Math.sin(2 * Math.PI * phase)
  const c = Math.cos(2 * Math.PI * phase)
  const leftForward = SWING.leg * s
  return {
    // forward is a negative x (see pose.ts)
    leftUpperLeg: turn(-leftForward),
    rightUpperLeg: turn(leftForward),
    // a leg swings forward while its angle grows: left when cos > 0, right when cos < 0
    leftLowerLeg: turn(SWING.knee * Math.max(0, c)),
    rightLowerLeg: turn(SWING.knee * Math.max(0, -c)),
    // each arm goes back while the leg on its own side goes forward
    leftUpperArm: turn(SWING.arm * s),
    rightUpperArm: turn(-SWING.arm * s),
    // right shoulder comes forward with the left leg
    chest: turn(0, SWING.twist * s, 0),
  }
}

// How far below standing height the body is (0 when legs pass, −BOB when both feet are down)
export function bobAt(phase: number) {
  return -BOB * Math.sin(2 * Math.PI * phase) ** 2
}

// Two steps per stride
export function stepsPerSecond(speed: number) {
  return (2 * speed) / STRIDE_LENGTH
}
