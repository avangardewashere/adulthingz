import { describe, expect, it } from 'vitest'
import { ROOM_SHAPES, findShape } from './roomShapes'
import { freeTiles, isConnected, isFloor, isFree, lineX, lineZ, parseRoom, tileCentre, type RoomPlan } from './roomLayout'
import { FURNITURE_SIZE, type FurnitureKind } from './furniture'
import { OVERHANG, TOP_PART, furnitureParts } from './furnitureParts'
import { PALETTE } from '../theme/palette'
import { spawnTile } from '../avatar/placement'
import { AVATAR_RADIUS, clearLine, findPath, fits, planWalk, pointAlong, pathLength } from '../walk/path'

const plans = ROOM_SHAPES.map((shape) => ({ shape, plan: parseRoom(shape.rows) }))
const planOf = (id: 'square' | 'rectangle' | 'lshape') => parseRoom(findShape(id).rows)
const KINDS: FurnitureKind[] = ['bed', 'desk', 'kitchenette']

// The free floor as its own little room, to reuse the connectivity check
const freeOnly = (plan: RoomPlan): RoomPlan => ({ ...plan, floor: plan.floor.map((line, r) => line.map((f, c) => f && !plan.blocked[r][c])) })

describe('v2 Block 1: a furnished room', () => {
  it.each(plans)('V2B1-T1: $shape.label has one bed, one desk and one kitchenette, each the right size', ({ plan }) => {
    expect(plan.furniture.map((p) => p.kind).sort()).toEqual([...KINDS].sort())
    for (const piece of plan.furniture) {
      const { along, out } = FURNITURE_SIZE[piece.kind]
      const alongWallIsCols = piece.back === 'north' || piece.back === 'south'
      expect([piece.cols, piece.rows]).toEqual(alongWallIsCols ? [along, out] : [out, along])
    }
  })

  it.each(plans)('V2B1-T2: $shape.label: every piece stands on floor, against a wall, and blocks its tiles', ({ plan }) => {
    for (const piece of plan.furniture) {
      for (let r = piece.row; r < piece.row + piece.rows; r++) {
        for (let c = piece.col; c < piece.col + piece.cols; c++) {
          expect(isFloor(plan, c, r), `${piece.kind} tile ${c},${r}`).toBe(true)
          expect(isFree(plan, c, r)).toBe(false)
        }
      }
      // the whole back side touches the wall: no floor directly behind it
      const behind = piece.back === 'north' || piece.back === 'south'
        ? Array.from({ length: piece.cols }, (_, i) => ({ c: piece.col + i, r: piece.back === 'north' ? piece.row - 1 : piece.row + piece.rows }))
        : Array.from({ length: piece.rows }, (_, i) => ({ c: piece.back === 'west' ? piece.col - 1 : piece.col + piece.cols, r: piece.row + i }))
      for (const { c, r } of behind) expect(isFloor(plan, c, r), `${piece.kind} has floor behind it at ${c},${r}`).toBe(false)
    }
  })

  it.each(plans)('V2B1-T3: $shape.label: use spots are free, separate, and right beside their piece', ({ plan }) => {
    const spots = plan.furniture.map((p) => `${p.useSpot.col},${p.useSpot.row}`)
    expect(new Set(spots).size).toBe(spots.length)
    for (const piece of plan.furniture) {
      const { col, row } = piece.useSpot
      expect(isFree(plan, col, row), piece.kind).toBe(true)
      // touching the piece's side (not diagonal, not further away)
      const dx = col < piece.col ? piece.col - col : col >= piece.col + piece.cols ? col - (piece.col + piece.cols - 1) : 0
      const dz = row < piece.row ? piece.row - row : row >= piece.row + piece.rows ? row - (piece.row + piece.rows - 1) : 0
      expect(dx + dz, piece.kind).toBe(1)
    }
    // a bed is got into from its long side; desk and counter are used from the front
    const square = planOf('square')
    const bed = square.furniture.find((p) => p.kind === 'bed')!
    expect(bed.back).toBe('north')
    expect(bed.useSpot).toEqual({ col: 2, row: 1 })
    expect(square.furniture.find((p) => p.kind === 'desk')!.useSpot).toEqual({ col: 1, row: 5 })
    expect(square.furniture.find((p) => p.kind === 'kitchenette')!.useSpot).toEqual({ col: 6, row: 1 })
  })

  it.each(plans)('V2B1-T4: $shape.label: free floor is one piece, and every use spot can be walked to', ({ plan }) => {
    expect(isConnected(freeOnly(plan))).toBe(true)
    const start = spawnTile(plan)
    expect(isFree(plan, start.col, start.row)).toBe(true)
    for (const piece of plan.furniture) {
      expect(findPath(plan, start, piece.useSpot), piece.kind).not.toBeNull()
    }
  })

  it.each(plans)('V2B1-T5: $shape.label: walks go around furniture, never through it', ({ plan }) => {
    // Measured straight against each piece's rectangle, not with the route code's own body
    // check (a broken check would otherwise approve its own mistakes)
    const boxes = plan.furniture.map((p) => ({
      kind: p.kind,
      x0: lineX(plan, p.col), x1: lineX(plan, p.col + p.cols),
      z0: lineZ(plan, p.row), z1: lineZ(plan, p.row + p.rows),
    }))
    const r = AVATAR_RADIUS - 1e-9
    const start = tileCentre(plan, spawnTile(plan))
    for (const goal of freeTiles(plan)) {
      const walk = planWalk(plan, start, goal)
      if (!walk) continue
      for (let d = 0; d <= pathLength(walk); d += 0.02) {
        const p = pointAlong(walk, d)
        for (const b of boxes) {
          const overlaps = p.x + r > b.x0 && p.x - r < b.x1 && p.z + r > b.z0 && p.z - r < b.z1
          expect(overlaps, `walk to ${goal.col},${goal.row} brushes the ${b.kind}`).toBe(false)
        }
      }
    }
    // furniture tiles can't be walked to
    for (const piece of plan.furniture) expect(planWalk(plan, start, { col: piece.col, row: piece.row })).toBeNull()
  })

  it('V2B1-T5b: in the square room, a walk past the foot of the bed bends round it', () => {
    const square = planOf('square')
    // from beside the head of the bed to just below its foot: straight there would clip the bed
    const from = tileCentre(square, { col: 2, row: 0 })
    const goal = { col: 1, row: 4 }
    expect(clearLine(square, from, tileCentre(square, goal))).toBe(false)
    const walk = planWalk(square, from, goal)!
    expect(walk.length).toBeGreaterThan(2) // it bends
    for (let d = 0; d <= pathLength(walk); d += 0.02) {
      const p = pointAlong(walk, d)
      expect(fits(square, p.x, p.z)).toBe(true)
    }
  })

  it.each(plans)('V2B1-T6: $shape.label: furniture shapes stay on their tiles, at real-world heights', ({ plan }) => {
    const tops = { bed: [0.4, 0.6], desk: [0.72, 0.78], kitchenette: [0.86, 0.92] }
    for (const piece of plan.furniture) {
      const parts = furnitureParts(plan, piece)
      const slack = OVERHANG[piece.kind] + 1e-9
      const [x0, x1] = [lineX(plan, piece.col) - slack, lineX(plan, piece.col + piece.cols) + slack]
      const [z0, z1] = [lineZ(plan, piece.row) - slack, lineZ(plan, piece.row + piece.rows) + slack]
      for (const part of parts) {
        const [x, y, z] = part.position
        const [sx, sy, sz] = part.size
        expect(x - sx / 2, `${piece.kind} ${part.name}`).toBeGreaterThanOrEqual(x0)
        expect(x + sx / 2, `${piece.kind} ${part.name}`).toBeLessThanOrEqual(x1)
        expect(z - sz / 2, `${piece.kind} ${part.name}`).toBeGreaterThanOrEqual(z0)
        expect(z + sz / 2, `${piece.kind} ${part.name}`).toBeLessThanOrEqual(z1)
        expect(y - sy / 2, `${part.name} below the floor`).toBeGreaterThanOrEqual(-1e-9)
        expect(PALETTE).toHaveProperty(part.color)
      }
      const top = parts.find((p) => p.name === TOP_PART[piece.kind])!
      const height = top.position[1] + top.size[1] / 2
      expect(height).toBeGreaterThanOrEqual(tops[piece.kind][0])
      expect(height).toBeLessThanOrEqual(tops[piece.kind][1])
    }
  })

  it('V2B1-T6b: a piece turned to another wall turns its shapes with it', () => {
    // the same desk against the back wall and against the left wall
    const back = parseRoom(['DDD', '###', '###']).furniture[0]
    const left = parseRoom(['D##', 'D##', 'D##']).furniture[0]
    expect(back.back).toBe('north')
    expect(left.back).toBe('west')
    const size = (plan: RoomPlan, piece: typeof back) => furnitureParts(plan, piece).find((p) => p.name === 'desktop')!.size
    const [a, b] = [size(parseRoom(['DDD', '###', '###']), back), size(parseRoom(['D##', 'D##', 'D##']), left)]
    expect(a[0]).toBeCloseTo(b[2], 12) // its length now runs along z
    expect(a[2]).toBeCloseTo(b[0], 12)
  })

  it('V2B1-T7: furniture drawn wrong is refused with a clear message', () => {
    expect(() => parseRoom(['DD##', '####'])).toThrow(/A desk must be 3 × 1 tiles/)
    expect(() => parseRoom(['DDD#', 'D###'])).toThrow(/not a solid rectangle/)
    expect(() => parseRoom(['#####', '#KKK#', '#####'])).toThrow(/must stand against a wall/)
    expect(() => parseRoom(['DDD', '...'])).toThrow(/needs free floor/) // nowhere to stand
    expect(() => parseRoom(['BB', 'BB', 'BB', 'BB'])).toThrow(/no free side/) // bed wall to wall
  })
})
