import type { FurnitureKind } from '../room/furniture'

// The adult things, and which piece of furniture each one needs.
export type ThingKind = 'sleep' | 'cook' | 'bills'

export const THING_FOR: Record<FurnitureKind, ThingKind> = { bed: 'sleep', kitchenette: 'cook', desk: 'bills' }
export const FURNITURE_FOR: Record<ThingKind, FurnitureKind> = { sleep: 'bed', cook: 'kitchenette', bills: 'desk' }

// Seconds: easing into the pose, doing it, easing back out. About 4 s of actually doing it.
export const THINGS: Record<ThingKind, { label: string; enter: number; hold: number; exit: number }> = {
  sleep: { label: 'Sleep', enter: 1.2, hold: 4, exit: 1.2 }, // lying down takes a moment
  cook: { label: 'Cook a meal', enter: 0.5, hold: 4, exit: 0.5 },
  bills: { label: 'Pay the bills', enter: 1, hold: 4, exit: 1 }, // the chair slides out as the avatar sits
}

// Smooth start and finish (0 → 1)
export function smooth(t: number) {
  const x = Math.min(1, Math.max(0, t))
  return x * x * (3 - 2 * x)
}
