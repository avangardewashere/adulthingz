import { TILE } from '../scene/stageSize'

// The rooms you can pick, drawn as text: one string per row of 50 cm tiles.
//   '#' = floor    '.' = no floor
// The first string is the back of the room (far from the camera) and the first
// character of each string is its left side, so the text looks like the room seen from above.

export type RoomShapeId = 'square' | 'rectangle' | 'lshape'

export interface RoomShape {
  id: RoomShapeId
  label: string
  rows: readonly string[]
}

export const ROOM_SHAPES: readonly RoomShape[] = [
  {
    id: 'square', // 4 × 4 m
    label: 'Square',
    rows: [
      '########',
      '########',
      '########',
      '########',
      '########',
      '########',
      '########',
      '########',
    ],
  },
  {
    id: 'rectangle', // 6 × 4 m
    label: 'Rectangle',
    rows: [
      '############',
      '############',
      '############',
      '############',
      '############',
      '############',
      '############',
      '############',
    ],
  },
  {
    // 6 × 5 m with the front-right 3 × 2 m cut out. The cut is on the camera's side,
    // so its walls are low ones and you look straight into the bend of the L.
    id: 'lshape',
    label: 'L-shape',
    rows: [
      '############',
      '############',
      '############',
      '############',
      '############',
      '############',
      '######......',
      '######......',
      '######......',
      '######......',
    ],
  },
]

export function findShape(id: RoomShapeId) {
  const shape = ROOM_SHAPES.find((s) => s.id === id)
  if (!shape) throw new Error(`No room shape called ${id}`)
  return shape
}

// "4 × 4 m": the outside size, for the picker
export function sizeLabel(shape: RoomShape) {
  return `${shape.rows[0].length * TILE} × ${shape.rows.length * TILE} m`
}
