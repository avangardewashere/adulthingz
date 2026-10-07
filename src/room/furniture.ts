import type { Side, Tile } from './roomLayout'

// Furniture, read from the letters in a room's text (see roomShapes.ts):
//   B = bed   D = desk   K = kitchenette
// Tiles under furniture are still floor (the walls don't change) but nobody can walk on them.
// Plain data and checks, no three.js; furnitureParts.ts turns a piece into shapes to draw.

export type FurnitureKind = 'bed' | 'desk' | 'kitchenette'

export const LETTERS: Record<string, FurnitureKind> = { B: 'bed', D: 'desk', K: 'kitchenette' }

// Size in tiles (0.5 m): `along` the wall it stands against, and `out` into the room.
// A bed stands with its head on the wall (1 m wide, 2 m long); desk and counter stand with
// their long side on the wall.
export const FURNITURE_SIZE: Record<FurnitureKind, { along: number; out: number }> = {
  bed: { along: 2, out: 4 },
  desk: { along: 3, out: 1 },
  kitchenette: { along: 3, out: 1 },
}

export interface Piece {
  kind: FurnitureKind
  col: number
  row: number
  cols: number
  rows: number
  back: Side // the wall it stands against (a bed's head end)
  useSpot: Tile // where the avatar stands to use it
  useSide: Side // which side of the piece the use spot is on
}

interface Grid {
  cols: number
  rows: number
  floor: boolean[][]
}

const isFloor = (g: Grid, col: number, row: number) =>
  row >= 0 && row < g.rows && col >= 0 && col < g.cols && g.floor[row][col]

const OPPOSITE: Record<Side, Side> = { north: 'south', south: 'north', east: 'west', west: 'east' }

// Does this whole side of the rectangle face a wall (no floor beyond any of its tiles)?
function againstWall(g: Grid, r: { col: number; row: number; cols: number; rows: number }, side: Side) {
  const tiles: Tile[] = []
  if (side === 'north' || side === 'south') {
    const row = side === 'north' ? r.row - 1 : r.row + r.rows
    for (let c = r.col; c < r.col + r.cols; c++) tiles.push({ col: c, row })
  } else {
    const col = side === 'west' ? r.col - 1 : r.col + r.cols
    for (let rr = r.row; rr < r.row + r.rows; rr++) tiles.push({ col, row: rr })
  }
  return tiles.every((t) => !isFloor(g, t.col, t.row))
}

// The tile just outside `side` of the rectangle, `index` tiles along that side
function tileBeside(r: { col: number; row: number; cols: number; rows: number }, side: Side, index: number): Tile {
  if (side === 'north') return { col: r.col + index, row: r.row - 1 }
  if (side === 'south') return { col: r.col + index, row: r.row + r.rows }
  if (side === 'west') return { col: r.col - 1, row: r.row + index }
  return { col: r.col + r.cols, row: r.row + index }
}

const where = (t: Tile) => `row ${t.row}, column ${t.col}`

// Find every piece in the marks grid (a letter per tile, '' for none) and check it
export function findFurniture(grid: Grid, marks: string[][]): Piece[] {
  const seen = new Set<string>()
  const pieces: Piece[] = []
  const blocked = (col: number, row: number) => marks[row]?.[col] !== '' && marks[row]?.[col] !== undefined

  for (let row = 0; row < grid.rows; row++) {
    for (let col = 0; col < grid.cols; col++) {
      const letter = marks[row][col]
      if (!letter || seen.has(`${col},${row}`)) continue
      const kind = LETTERS[letter]

      // gather the touching tiles with the same letter (flood fill)
      const tiles: Tile[] = []
      const todo: Tile[] = [{ col, row }]
      seen.add(`${col},${row}`)
      while (todo.length > 0) {
        const t = todo.pop()!
        tiles.push(t)
        for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const n = { col: t.col + dc, row: t.row + dr }
          if (marks[n.row]?.[n.col] === letter && !seen.has(`${n.col},${n.row}`)) {
            seen.add(`${n.col},${n.row}`)
            todo.push(n)
          }
        }
      }

      const c0 = Math.min(...tiles.map((t) => t.col))
      const r0 = Math.min(...tiles.map((t) => t.row))
      const rect = {
        col: c0,
        row: r0,
        cols: Math.max(...tiles.map((t) => t.col)) - c0 + 1,
        rows: Math.max(...tiles.map((t) => t.row)) - r0 + 1,
      }
      if (tiles.length !== rect.cols * rect.rows) throw new Error(`The ${kind} at ${where(rect)} is not a solid rectangle`)

      // which way round is it? `along` must run along the wall it stands against
      const { along, out } = FURNITURE_SIZE[kind]
      let candidates: Side[]
      if (rect.cols === along && rect.rows === out) candidates = ['north', 'south']
      else if (rect.rows === along && rect.cols === out) candidates = ['west', 'east']
      else throw new Error(`A ${kind} must be ${along} × ${out} tiles, the one at ${where(rect)} is ${rect.cols} × ${rect.rows}`)
      const back = candidates.find((side) => againstWall(grid, rect, side))
      if (!back) throw new Error(`The ${kind} at ${where(rect)} must stand against a wall`)

      // where the avatar stands: in front of the middle (desk, counter), or beside the middle
      // of the bed on a long side that isn't against a wall (the camera-side one first)
      let useSide: Side
      let index: number
      if (kind === 'bed') {
        const sides: Side[] = back === 'north' || back === 'south' ? ['east', 'west'] : ['south', 'north']
        const free = sides.find((side) => !againstWall(grid, rect, side))
        if (!free) throw new Error(`The bed at ${where(rect)} has no free side to get in from`)
        useSide = free
        // a person lying down has their hips about 1 m from the head end: the 2nd tile
        const fromHead = Math.ceil(out / 2) - 1
        index = back === 'north' || back === 'west' ? fromHead : out - 1 - fromHead
      } else {
        useSide = OPPOSITE[back]
        index = Math.ceil(along / 2) - 1
      }
      const useSpot = tileBeside(rect, useSide, index)
      if (!isFloor(grid, useSpot.col, useSpot.row) || blocked(useSpot.col, useSpot.row)) {
        throw new Error(`The ${kind} at ${where(rect)} needs free floor at ${where(useSpot)} to be used`)
      }
      pieces.push({ kind, ...rect, back, useSpot, useSide })
    }
  }
  return pieces
}
