import { describe, expect, it } from 'vitest'
import { ROOM_SHAPES, findShape, sizeLabel } from './roomShapes'
import {
  SIDES,
  corners,
  floorRects,
  floorTiles,
  isConnected,
  isLowSide,
  lineX,
  lineZ,
  mergeWalls,
  neighbourIsFloor,
  parseRoom,
  roomSize,
  wallBox,
  wallEdges,
  wallHeight,
} from './roomLayout'
import { FLOOR_THICKNESS, STAGE, WALL } from '../scene/stageSize'
import { DISTANCE, TARGET, fitDistance, radiusFor, refitPosition } from '../scene/cameraRig'

const plans = ROOM_SHAPES.map((shape) => ({ shape, plan: parseRoom(shape.rows) }))
const planOf = (id: 'square' | 'rectangle' | 'lshape') => parseRoom(findShape(id).rows)

describe('Block 1: room shapes', () => {
  it.each(plans)('B1-T1: $shape.label is one connected piece', ({ plan }) => {
    expect(isConnected(plan)).toBe(true)
  })

  it('B1-T1b: two separate floor pieces are caught', () => {
    expect(isConnected(parseRoom(['##..##']))).toBe(false)
  })

  it.each(plans)('B1-T2: $shape.label has a wall exactly where a floor edge has no neighbour', ({ plan }) => {
    const walls = new Set(wallEdges(plan).map((w) => `${w.col},${w.row},${w.side}`))
    for (const tile of floorTiles(plan)) {
      for (const side of SIDES) {
        const hasWall = walls.has(`${tile.col},${tile.row},${side}`)
        expect(hasWall, `tile ${tile.col},${tile.row} ${side}`).toBe(!neighbourIsFloor(plan, tile, side))
      }
    }
  })

  it('B1-T2b: a square room has as many wall edges as tiles around its outside', () => {
    const plan = planOf('square')
    expect(wallEdges(plan)).toHaveLength(2 * (plan.cols + plan.rows)) // 8 + 8 + 8 + 8 = 32
  })

  it('B1-T3: every room fits the 6 × 6 m stage and has the size the picker says', () => {
    const expected = { square: '4 × 4 m', rectangle: '6 × 4 m', lshape: '6 × 5 m' }
    for (const { shape, plan } of plans) {
      const { width, depth } = roomSize(plan)
      expect(width).toBeLessThanOrEqual(STAGE.width)
      expect(depth).toBeLessThanOrEqual(STAGE.depth)
      expect(sizeLabel(shape)).toBe(expected[shape.id])
      expect(`${width} × ${depth} m`).toBe(expected[shape.id])
    }
  })

  it('B1-T4: the L-shape has exactly one inside corner; square and rectangle have none', () => {
    expect(corners(planOf('lshape')).inside).toHaveLength(1)
    expect(corners(planOf('lshape')).outside).toHaveLength(5) // an L has 6 corners: 5 out, 1 in
    for (const id of ['square', 'rectangle'] as const) {
      expect(corners(planOf(id)).inside).toHaveLength(0)
      expect(corners(planOf(id)).outside).toHaveLength(4)
    }
  })

  it('B1-T5: far walls are full height, walls on the camera side are low', () => {
    expect(wallHeight('north')).toBe(STAGE.height)
    expect(wallHeight('west')).toBe(STAGE.height)
    expect(wallHeight('south')).toBe(WALL.low)
    expect(wallHeight('east')).toBe(WALL.low)
    // the L's cut-out is on the camera side, so all its walls are low ones
    const plan = planOf('lshape')
    const cutWalls = wallEdges(plan).filter((w) => (w.col === 5 && w.row >= 6) || (w.row === 5 && w.col >= 6))
    expect(cutWalls.length).toBeGreaterThan(0)
    for (const wall of cutWalls) expect(isLowSide(wall.side), `${wall.col},${wall.row} ${wall.side}`).toBe(true)
  })

  it.each(plans)('B1-T6: $shape.label: joined walls cover every wall edge exactly once', ({ plan }) => {
    const segments = mergeWalls(wallEdges(plan))
    const covered = segments.flatMap((s) =>
      Array.from({ length: s.to - s.from }, (_, i) => {
        const at = s.from + i
        const horizontal = s.side === 'north' || s.side === 'south'
        return horizontal ? `${at},${s.line},${s.side}` : `${s.line},${at},${s.side}`
      }),
    )
    const edges = wallEdges(plan).map((w) => `${w.col},${w.row},${w.side}`)
    expect(covered.sort()).toEqual(edges.sort())
  })

  it.each(plans)('B1-T6d: $shape.label: no wall stands on a floor tile, so all the floor is walkable', ({ plan }) => {
    const overlaps = (a0: number, a1: number, b0: number, b1: number) => Math.min(a1, b1) - Math.max(a0, b0) > 1e-9
    for (const segment of mergeWalls(wallEdges(plan))) {
      const { position: [x, , z], size: [w, , d] } = wallBox(plan, segment)
      for (const tile of floorTiles(plan)) {
        const onTile =
          overlaps(x - w / 2, x + w / 2, lineX(plan, tile.col), lineX(plan, tile.col + 1)) &&
          overlaps(z - d / 2, z + d / 2, lineZ(plan, tile.row), lineZ(plan, tile.row + 1))
        expect(onTile, `${segment.side} wall ${segment.line} on tile ${tile.col},${tile.row}`).toBe(false)
      }
    }
  })

  it('B1-T6b: walls join up: a square has 4 walls, the L-shape 6', () => {
    expect(mergeWalls(wallEdges(planOf('square')))).toHaveLength(4)
    expect(mergeWalls(wallEdges(planOf('lshape')))).toHaveLength(6)
    // a gap in a line of wall must stay a gap: a U-shaped room has two separate back walls
    const u = parseRoom(['#..#', '####'])
    const backWalls = mergeWalls(wallEdges(u)).filter((s) => s.side === 'north' && s.line === 0)
    expect(backWalls).toEqual([
      { side: 'north', line: 0, from: 0, to: 1 },
      { side: 'north', line: 0, from: 3, to: 4 },
    ])
  })

  it.each(plans)('B1-T6c: $shape.label: floor blocks cover every tile exactly once', ({ plan }) => {
    const covered = floorRects(plan).flatMap((r) =>
      Array.from({ length: r.cols * r.rows }, (_, i) => `${r.col + (i % r.cols)},${r.row + Math.floor(i / r.cols)}`),
    )
    expect(covered.sort()).toEqual(floorTiles(plan).map((t) => `${t.col},${t.row}`).sort())
  })

  it('B1-T7: every room fits the screen within the zoom limits, on every screen shape', () => {
    for (const { plan } of plans) {
      const { width, depth } = roomSize(plan)
      for (const aspect of [0.45, 0.75, 1, 1.6, 2.4]) {
        const distance = fitDistance(aspect, radiusFor(width, depth))
        expect(distance).toBeGreaterThanOrEqual(DISTANCE.min)
        expect(distance).toBeLessThanOrEqual(DISTANCE.max)
      }
    }
    // a bigger room puts the camera further back
    const square = radiusFor(4, 4)
    const lshape = radiusFor(6, 5)
    expect(fitDistance(1.6, lshape)).toBeGreaterThan(fitDistance(1.6, square))
  })

  it.each(plans)('B1-T7c: $shape.label: every outside corner of the walls is inside the camera fit', ({ plan }) => {
    const { width, depth } = roomSize(plan)
    const radius = radiusFor(width, depth)
    const x = width / 2 + WALL.thickness
    const z = depth / 2 + WALL.thickness
    for (const [cx, cz] of [[-x, -z], [x, -z], [-x, z], [x, z]]) {
      for (const cy of [-FLOOR_THICKNESS, STAGE.height]) {
        const distance = Math.hypot(cx - TARGET.x, cy - TARGET.y, cz - TARGET.z)
        expect(distance, `corner ${cx}, ${cy}, ${cz}`).toBeLessThanOrEqual(radius + 1e-9)
      }
    }
  })

  it('B1-T7b: picking another room keeps the camera angle you turned to', () => {
    const turned = { x: TARGET.x + 3, y: TARGET.y + 9, z: TARGET.z + 11 }
    const radius = radiusFor(6, 5)
    const p = refitPosition(turned, 1.6, radius)
    const before = [turned.x - TARGET.x, turned.y - TARGET.y, turned.z - TARGET.z]
    const after = [p.x - TARGET.x, p.y - TARGET.y, p.z - TARGET.z]
    const unit = (v: number[]) => v.map((n) => n / Math.hypot(...v))
    unit(after).forEach((n, i) => expect(n).toBeCloseTo(unit(before)[i], 9))
    expect(Math.hypot(...after)).toBeCloseTo(fitDistance(1.6, radius), 9)
  })

  it('B1-T8: a room drawn wrong is refused with a clear message', () => {
    expect(() => parseRoom([])).toThrow(/at least one row/)
    expect(() => parseRoom(['###', '##'])).toThrow(/Row 1 has 2 tiles, expected 3/)
    expect(() => parseRoom(['#x#'])).toThrow(/Unknown tile "x"/)
  })
})
