// A press that moved less than this many pixels is a tap; more is a drag (turning the camera).
// Fingers wobble a little even when tapping, so "didn't move at all" would be too strict.
export const TAP_SLOP = 6

export function isTap(movedPx: number) {
  return movedPx < TAP_SLOP
}
