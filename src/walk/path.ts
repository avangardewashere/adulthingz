import { isFree, tileAt, tileCentre, type RoomPlan, type Tile } from '../room/roomLayout'

// Finding a way across the room. Plain maths, no three.js.
//
// 1. findPath: the shortest chain of free tiles (A* search; furniture tiles are not free).
//    Steps go to any of the 8 tiles around, but a diagonal step is only allowed when both
//    tiles beside it are free, so the route never squeezes past a corner.
// 2. smoothPath: tile-to-tile routes zig-zag. Wherever the avatar's body still fits along
//    a straight line, skip the tiles in between: open floor becomes one straight walk,
//    and the L's bend becomes a short curve around the corner.

export interface Point {
  x: number
  z: number
}

// The avatar's body seen from above, as a square this far out from its centre (metres).
// A tile is 0.5 m and its centre is 0.25 m from any wall, so every floor tile fits it.
export const AVATAR_RADIUS = 0.2

// Cost of moving dx tiles across and dy down with diagonal steps allowed
export function octile(dx: number, dy: number) {
  return Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy)
}

const STEPS = [
  [1, 0], [-1, 0], [0, 1], [0, -1],
  [1, 1], [1, -1], [-1, 1], [-1, -1],
] as const

export function findPath(plan: RoomPlan, from: Tile, to: Tile): Tile[] | null {
  if (!isFree(plan, from.col, from.row) || !isFree(plan, to.col, to.row)) return null
  const key = (col: number, row: number) => row * plan.cols + col
  const h = (col: number, row: number) => octile(Math.abs(col - to.col), Math.abs(row - to.row))

  const cost = new Map([[key(from.col, from.row), 0]])
  const cameFrom = new Map<number, Tile>()
  let open: Tile[] = [from]
  const closed = new Set<number>()

  while (open.length > 0) {
    // the tile that looks cheapest overall (cost so far + straight-line guess to the goal)
    open.sort((a, b) => cost.get(key(a.col, a.row))! + h(a.col, a.row) - (cost.get(key(b.col, b.row))! + h(b.col, b.row)))
    const tile = open.shift()!
    const k = key(tile.col, tile.row)
    if (tile.col === to.col && tile.row === to.row) {
      const path = [tile]
      while (cameFrom.has(key(path[0].col, path[0].row))) path.unshift(cameFrom.get(key(path[0].col, path[0].row))!)
      return path
    }
    closed.add(k)

    for (const [dc, dr] of STEPS) {
      const col = tile.col + dc
      const row = tile.row + dr
      if (!isFree(plan, col, row) || closed.has(key(col, row))) continue
      // no cutting corners: a diagonal needs floor on both sides
      if (dc !== 0 && dr !== 0 && !(isFree(plan, tile.col + dc, tile.row) && isFree(plan, tile.col, tile.row + dr))) continue
      const next = cost.get(k)! + (dc !== 0 && dr !== 0 ? Math.SQRT2 : 1)
      const known = cost.get(key(col, row))
      if (known === undefined || next < known) {
        cost.set(key(col, row), next)
        cameFrom.set(key(col, row), tile)
        if (known === undefined) open.push({ col, row })
      }
    }
  }
  return null // no way there
}

// Is there free floor (no furniture) under this point?
function freeAt(plan: RoomPlan, x: number, z: number) {
  const tile = tileAt(plan, x, z)
  return tile !== null && isFree(plan, tile.col, tile.row)
}

// Does the avatar's body fit with its centre here? Checking the 4 corners of its square is
// enough: the square (0.4 m) is smaller than a tile, so if all 4 corners are on free
// tiles, every tile it touches is free (no wall, no furniture).
export function fits(plan: RoomPlan, x: number, z: number, r = AVATAR_RADIUS) {
  return freeAt(plan, x - r, z - r) && freeAt(plan, x + r, z - r) && freeAt(plan, x - r, z + r) && freeAt(plan, x + r, z + r)
}

// Can the avatar walk straight from a to b? Checked every 2 cm.
export function clearLine(plan: RoomPlan, a: Point, b: Point) {
  const steps = Math.max(1, Math.ceil(distance(a, b) / 0.02))
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    if (!fits(plan, a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t)) return false
  }
  return true
}

// From `start`, jump to the furthest tile centre that can be reached in a straight line, repeat
export function smoothPath(plan: RoomPlan, start: Point, tiles: readonly Tile[]): Point[] {
  const targets = tiles.map((t) => tileCentre(plan, t))
  const points = [start]
  let from = start
  let i = 0
  while (i < targets.length) {
    let j = targets.length - 1
    while (j > i && !clearLine(plan, from, targets[j])) j--
    points.push(targets[j])
    from = targets[j]
    i = j + 1
  }
  // drop zero-length steps (e.g. when starting exactly on a tile centre)
  return points.filter((p, k) => k === 0 || distance(p, points[k - 1]) > 1e-6)
}

// The whole job: a walk from where the avatar stands to the middle of the tapped tile.
// null when there's no way there, or it's already standing there.
export function planWalk(plan: RoomPlan, start: Point, goal: Tile): Point[] | null {
  const from = tileAt(plan, start.x, start.z)
  if (!from) return null
  const tiles = findPath(plan, from, goal)
  if (!tiles) return null
  const points = smoothPath(plan, start, tiles)
  return pathLength(points) < 0.01 ? null : points
}

export function distance(a: Point, b: Point) {
  return Math.hypot(b.x - a.x, b.z - a.z)
}

export function pathLength(points: readonly Point[]) {
  let total = 0
  for (let i = 1; i < points.length; i++) total += distance(points[i - 1], points[i])
  return total
}

// Which way to face to walk from a to b: 0 = towards +z (the front), π/2 = towards +x
export function headingOf(a: Point, b: Point) {
  return Math.atan2(b.x - a.x, b.z - a.z)
}

// Where you are after walking `d` metres along the points, and which way that stretch heads
export function pointAlong(points: readonly Point[], d: number) {
  let left = Math.max(0, d)
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]
    const b = points[i]
    const length = distance(a, b)
    if (left <= length || i === points.length - 1) {
      const t = length === 0 ? 1 : Math.min(1, left / length)
      return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t, heading: headingOf(a, b) }
    }
    left -= length
  }
  const only = points[0]
  return { x: only.x, z: only.z, heading: 0 }
}
