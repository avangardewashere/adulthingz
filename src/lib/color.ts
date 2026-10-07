// Colour maths used by the tests (and later by labels drawn on canvas textures).

const HEX = /^#[0-9a-f]{6}$/i

export function isHex(value: string) {
  return HEX.test(value)
}

// '#FAF6F0' → [250, 246, 240]
export function hexToRgb(hex: string): [number, number, number] {
  if (!isHex(hex)) throw new Error(`Not a 6-digit hex colour: ${hex}`)
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

// How bright a colour looks to the eye, 0 (black) to 1 (white).
// Formula from the WCAG accessibility guidelines: undo the screen's gamma curve,
// then weight green most and blue least, because eyes are most sensitive to green.
export function luminance(hex: string) {
  const [r, g, b] = hexToRgb(hex).map((channel) => {
    const c = channel / 255
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

// Contrast between two colours, from 1:1 (same) to 21:1 (black on white).
// Normal-size text needs at least 4.5:1 to be easy to read.
export function contrastRatio(a: string, b: string) {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (light + 0.05) / (dark + 0.05)
}
