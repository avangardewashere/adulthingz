import { seededRandom } from '../lib/random'

// The small movements that make a standing avatar look alive. Plain maths, so the tests can
// check the timing; AvatarModel.tsx applies the numbers to the model every frame.

// ── Blinking ──────────────────────────────────────────────────────────────
// Eyelids close fast, stay shut a moment, open a little slower: 0.15 s in all.
// People blink every few seconds, at uneven gaps, so the gaps are random: 2 to 6 s.
export const BLINK = { close: 0.05, hold: 0.02, open: 0.08, minGap: 2, maxGap: 6 } as const
export const BLINK_SECONDS = BLINK.close + BLINK.hold + BLINK.open

// How shut the eyes are `s` seconds into a blink: 0 = open, 1 = shut
export function blinkCurve(s: number) {
  if (s <= 0 || s >= BLINK_SECONDS) return 0
  if (s < BLINK.close) return s / BLINK.close
  if (s < BLINK.close + BLINK.hold) return 1
  return 1 - (s - BLINK.close - BLINK.hold) / BLINK.open
}

// Blink start times, made as needed. Same seed → same blinks every time.
export function createBlinker(seed = 1) {
  const random = seededRandom(seed)
  const nextGap = () => BLINK.minGap + random() * (BLINK.maxGap - BLINK.minGap)
  const starts = [nextGap()]
  return {
    starts, // read by the tests
    // eyelid weight at time t (seconds since the scene started)
    weightAt(t: number) {
      while (starts[starts.length - 1] <= t) starts.push(starts[starts.length - 1] + nextGap())
      let i = starts.length - 1
      while (i >= 0 && starts[i] > t) i--
      return i < 0 ? 0 : blinkCurve(t - starts[i])
    },
  }
}

// ── Breathing ─────────────────────────────────────────────────────────────
// A resting adult takes 12–16 breaths a minute, so one breath is about 4 s.
export const BREATH_SECONDS = 4

// −1 (breathed out) … 1 (breathed in), a smooth wave
export function breath(t: number) {
  return Math.sin((2 * Math.PI * t) / BREATH_SECONDS)
}

// How far the spine and chest tip at a full breath, in radians. Tiny on purpose:
// you should notice it's alive, not see it move.
export const BREATH_SWAY = { spine: 0.012, chest: 0.02 } as const

// ── Resting arms ──────────────────────────────────────────────────────────
// VRoid avatars arrive in a T-pose (arms straight out). Lower the arms to the sides,
// angled out a little so the hands clear the hips, with a slight bend at the elbow.
export const ARMS_DOWN = 1.2 // radians below horizontal, about 69°
export const ELBOW_BEND = 0.25 // radians, forearms swing a little forward

export type ArmBone = 'leftUpperArm' | 'rightUpperArm' | 'leftLowerArm' | 'rightLowerArm'

// Rotations for three-vrm's "normalized" bones, as [bone, axis, angle].
// VRM 0 avatars are built facing the other way from VRM 1, which flips turns around the
// x and z axes (three-vrm's own animation examples flip them the same way).
// Turns around y (the elbow bend) are not affected.
export function restingArms(metaVersion: '0' | '1'): [ArmBone, 'y' | 'z', number][] {
  const flip = metaVersion === '0' ? -1 : 1
  return [
    ['leftUpperArm', 'z', -ARMS_DOWN * flip],
    ['rightUpperArm', 'z', ARMS_DOWN * flip],
    ['leftLowerArm', 'y', -ELBOW_BEND],
    ['rightLowerArm', 'y', ELBOW_BEND],
  ]
}
