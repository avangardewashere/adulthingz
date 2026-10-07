import { FLOOR_THICKNESS, STAGE, TILE, WALL } from '../scene/stageSize'

// Turns a room drawn as text (see roomShapes.ts) into floor, walls and corner posts.
// Plain maths, no three.js, so the tests can check every rule with numbers.
//
// Directions, as seen from the camera at the front-right:
//   north = back (−z)   south = front (+z)   west = left (−x)   east = right (+x)

export type Side = 'north' | 'east' | 'south' | 'west'
export const SIDES: readonly Side[] = ['north', 'east', 'south', 'west']

const STEP: Record<Side, { dc: number; dr: number }> = {
  north: { dc: 0, dr: -1 },
  east: { dc: 1, dr: 0 },
  south: { dc: 0, dr: 1 },
  west: { dc: -1, dr: 0 },
}

export interface RoomPlan {
  cols: number
  rows: number
  floor: boolean[][] // floor[row][col]
}

export interface Tile {
  col: number
  row: number
}

// One tile edge with a wall on it
export interface WallEdge extends Tile {
  side: Side
}

// Several edges in a straight line, joined into one wall (fewer meshes to draw).
// `line` is the row (north/south walls) or column (east/west walls) it belongs to;
// it runs from tile `from` up to, not including, tile `to`.
export interface WallSegment {
  side: Side
  line: number
  from: number
  to: number
}

// A block of floor tiles: `cols` wide and `rows` deep, starting at col/row
export interface Rect extends Tile {
  cols: number
  rows: number
}

// A point where tile corners meet: vertex col 0…cols, row 0…rows
export type Vertex = Tile

// What three.js needs to place a box: its centre and its size, in metres
export interface Box {
  position: [number, number, number]
  size: [number, number, number]
}

export function parseRoom(text: readonly string[]): RoomPlan {
  if (text.length === 0) throw new Error('A room needs at least one row')
  const cols = text[0].length
  const floor = text.map((line, row) => {
    if (line.length !== cols) throw new Error(`Row ${row} has ${line.length} tiles, expected ${cols}`)
    return [...line].map((ch, col) => {
      if (ch === '#') return true
      if (ch === '.') return false
      throw new Error(`Unknown tile "${ch}" at row ${row}, column ${col}`)
    })
  })
  return { cols, rows: text.length, floor }
}

export function isFloor(plan: RoomPlan, col: number, row: number) {
  return row >= 0 && row < plan.rows && col >= 0 && col < plan.cols && plan.floor[row][col]
}

export function floorTiles(plan: RoomPlan): Tile[] {
  const tiles: Tile[] = []
  for (let row = 0; row < plan.rows; row++) {
    for (let col = 0; col < plan.cols; col++) {
      if (plan.floor[row][col]) tiles.push({ col, row })
    }
  }
  return tiles
}

export function neighbourIsFloor(plan: RoomPlan, tile: Tile, side: Side) {
  return isFloor(plan, tile.col + STEP[side].dc, tile.row + STEP[side].dr)
}

// The wall rule: a wall goes up on every floor-tile edge that has no floor on the other side
export function wallEdges(plan: RoomPlan): WallEdge[] {
  return floorTiles(plan).flatMap((tile) =>
    SIDES.filter((side) => !neighbourIsFloor(plan, tile, side)).map((side) => ({ ...tile, side })),
  )
}

// One piece? Flood-fill from the first tile and see if it reaches all of them
export function isConnected(plan: RoomPlan) {
  const tiles = floorTiles(plan)
  if (tiles.length === 0) return false
  const key = (t: Tile) => `${t.col},${t.row}`
  const seen = new Set([key(tiles[0])])
  const todo = [tiles[0]]
  while (todo.length > 0) {
    const tile = todo.pop()!
    for (const side of SIDES) {
      const next = { col: tile.col + STEP[side].dc, row: tile.row + STEP[side].dr }
      if (isFloor(plan, next.col, next.row) && !seen.has(key(next))) {
        seen.add(key(next))
        todo.push(next)
      }
    }
  }
  return seen.size === tiles.length
}

// Look at the 4 tiles around every vertex:
//   1 floor tile  → an outside corner (the room bulges out here)
//   3 floor tiles → an inside corner (the room bends in, like the L's elbow)
export function corners(plan: RoomPlan) {
  const outside: Vertex[] = []
  const inside: Vertex[] = []
  for (let row = 0; row <= plan.rows; row++) {
    for (let col = 0; col <= plan.cols; col++) {
      const around = [
        isFloor(plan, col - 1, row - 1),
        isFloor(plan, col, row - 1),
        isFloor(plan, col - 1, row),
        isFloor(plan, col, row),
      ].filter(Boolean).length
      if (around === 1) outside.push({ col, row })
      if (around === 3) inside.push({ col, row })
    }
  }
  return { outside, inside }
}

// Join edges that sit end to end on the same line into one long wall
export function mergeWalls(edges: readonly WallEdge[]): WallSegment[] {
  const lines = new Map<string, { side: Side; line: number; at: number[] }>()
  for (const edge of edges) {
    const horizontal = edge.side === 'north' || edge.side === 'south'
    const line = horizontal ? edge.row : edge.col
    const at = horizontal ? edge.col : edge.row
    const id = `${edge.side}:${line}`
    if (!lines.has(id)) lines.set(id, { side: edge.side, line, at: [] })
    lines.get(id)!.at.push(at)
  }

  const segments: WallSegment[] = []
  for (const { side, line, at } of lines.values()) {
    at.sort((a, b) => a - b)
    let from = at[0]
    for (let i = 1; i <= at.length; i++) {
      // a gap (or the end of the list) closes the current wall
      if (i === at.length || at[i] !== at[i - 1] + 1) {
        segments.push({ side, line, from, to: at[i - 1] + 1 })
        from = at[i]
      }
    }
  }
  return segments
}

// Cover the floor with as few rectangles as possible: rows with the same run of
// tiles stack into one block (a square room is 1 block, the L-shape is 2)
export function floorRects(plan: RoomPlan): Rect[] {
  const done: Rect[] = []
  let open: Rect[] = []
  for (let row = 0; row <= plan.rows; row++) {
    // runs of floor in this row, as [start, end)
    const runs: [number, number][] = []
    for (let col = 0; col < plan.cols; col++) {
      if (!isFloor(plan, col, row)) continue
      const last = runs[runs.length - 1]
      if (last && last[1] === col) last[1] = col + 1
      else runs.push([col, col + 1])
    }
    const next: Rect[] = []
    for (const [start, end] of runs) {
      const above = open.find((r) => r.col === start && r.col + r.cols === end)
      if (above) {
        above.rows += 1
        next.push(above)
      } else {
        next.push({ col: start, row, cols: end - start, rows: 1 })
      }
    }
    done.push(...open.filter((r) => !next.includes(r)))
    open = next
  }
  return done
}

// The far walls stay full height; walls on the camera's side are low so you can see in
export function isLowSide(side: Side) {
  return side === 'south' || side === 'east'
}

export function wallHeight(side: Side) {
  return isLowSide(side) ? WALL.low : STAGE.height
}

// Outside size in metres. The room is centred on the origin, where the camera looks.
export function roomSize(plan: RoomPlan) {
  return { width: plan.cols * TILE, depth: plan.rows * TILE }
}

// World x of a vertical tile line (col 0 = left edge), world z of a horizontal one (row 0 = back edge)
export function lineX(plan: RoomPlan, col: number) {
  return col * TILE - roomSize(plan).width / 2
}

export function lineZ(plan: RoomPlan, row: number) {
  return row * TILE - roomSize(plan).depth / 2
}

// Centre of a tile on the floor
export function tileCentre(plan: RoomPlan, tile: Tile) {
  return { x: lineX(plan, tile.col + 0.5), z: lineZ(plan, tile.row + 0.5) }
}

// A wall from just below the floor (it hides the floor slab's edge) up to its height.
// It stands outside the floor, so the whole floor stays walkable.
export function wallBox(plan: RoomPlan, segment: WallSegment): Box {
  const t = WALL.thickness
  const top = wallHeight(segment.side)
  const y = (top - FLOOR_THICKNESS) / 2
  const height = top + FLOOR_THICKNESS
  const { side, line, from, to } = segment

  if (side === 'north' || side === 'south') {
    const edgeZ = lineZ(plan, side === 'north' ? line : line + 1)
    const z = side === 'north' ? edgeZ - t / 2 : edgeZ + t / 2
    const x0 = lineX(plan, from)
    const x1 = lineX(plan, to)
    return { position: [(x0 + x1) / 2, y, z], size: [x1 - x0, height, t] }
  }
  const edgeX = lineX(plan, side === 'west' ? line : line + 1)
  const x = side === 'west' ? edgeX - t / 2 : edgeX + t / 2
  const z0 = lineZ(plan, from)
  const z1 = lineZ(plan, to)
  return { position: [x, y, (z0 + z1) / 2], size: [t, height, z1 - z0] }
}

// Walls stand outside the floor, so where two meet at an outside corner they leave
// a small square gap. A post fills it. It is full height unless both walls are low.
export function postBoxes(plan: RoomPlan): Box[] {
  const t = WALL.thickness
  return corners(plan).outside.map(({ col, row }) => {
    // which of the 4 tiles around this vertex is the floor?
    const floorIsRight = isFloor(plan, col, row - 1) || isFloor(plan, col, row)
    const floorIsFront = isFloor(plan, col - 1, row) || isFloor(plan, col, row)
    // the post sits diagonally opposite the floor tile
    const x = lineX(plan, col) + (floorIsRight ? -t / 2 : t / 2)
    const z = lineZ(plan, row) + (floorIsFront ? -t / 2 : t / 2)
    // the two walls meeting here: the floor tile's back/front one and its left/right one
    const sides: Side[] = [floorIsFront ? 'north' : 'south', floorIsRight ? 'west' : 'east']
    const top = Math.max(...sides.map(wallHeight))
    return { position: [x, (top - FLOOR_THICKNESS) / 2, z], size: [t, top + FLOOR_THICKNESS, t] }
  })
}

// A floor block, with its top surface exactly at y = 0
export function floorBox(plan: RoomPlan, rect: Rect): Box {
  const x0 = lineX(plan, rect.col)
  const x1 = lineX(plan, rect.col + rect.cols)
  const z0 = lineZ(plan, rect.row)
  const z1 = lineZ(plan, rect.row + rect.rows)
  return {
    position: [(x0 + x1) / 2, -FLOOR_THICKNESS / 2, (z0 + z1) / 2],
    size: [x1 - x0, FLOOR_THICKNESS, z1 - z0],
  }
}

// The faint tile lines on the floor: every edge between two floor tiles (not the
// outline, the walls cover that). Flat list of x, y, z pairs, ready for a line mesh.
export function gridLines(plan: RoomPlan, y = 0): number[] {
  const out: number[] = []
  for (const tile of floorTiles(plan)) {
    const { col, row } = tile
    // each inside edge is drawn once: by the tile below it, or the tile right of it
    if (isFloor(plan, col, row - 1)) {
      const z = lineZ(plan, row)
      out.push(lineX(plan, col), y, z, lineX(plan, col + 1), y, z)
    }
    if (isFloor(plan, col - 1, row)) {
      const x = lineX(plan, col)
      out.push(x, y, lineZ(plan, row), x, y, lineZ(plan, row + 1))
    }
  }
  return out
}
