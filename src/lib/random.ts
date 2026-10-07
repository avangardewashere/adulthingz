// A random-number generator you can repeat: the same seed gives the same numbers every
// time, so tests (and the avatar's blinking) are predictable. Algorithm: mulberry32.
export function seededRandom(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296 // 0 ≤ n < 1
  }
}
