// Sizes in metres. Block 0 only has a placeholder floor; Block 1 builds real rooms
// out of TILE-sized squares, and every room shape it offers fits inside STAGE.

export const TILE = 0.5 // one floor tile is 50 × 50 cm

export const STAGE = {
  width: 6, // left ↔ right (x)
  depth: 6, // back ↔ front (z)
  height: 2.6, // wall height, a normal apartment ceiling
} as const

export const FLOOR_THICKNESS = 0.1
