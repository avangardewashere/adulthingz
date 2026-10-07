// Sizes in metres. Rooms are built out of TILE-sized squares (see src/room),
// and every room shape on offer fits inside STAGE.

export const TILE = 0.5 // one floor tile is 50 × 50 cm

export const STAGE = {
  width: 6, // left ↔ right (x)
  depth: 6, // back ↔ front (z)
  height: 2.6, // wall height, a normal apartment ceiling
} as const

export const FLOOR_THICKNESS = 0.1

export const WALL = {
  thickness: 0.12,
  // Walls on the camera's side are cut down to this, so you can see into the room (dollhouse)
  low: 0.3,
} as const
