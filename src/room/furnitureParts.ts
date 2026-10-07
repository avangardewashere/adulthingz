import type { PaletteName } from '../theme/palette'
import { lineX, lineZ, type RoomPlan, type Side } from './roomLayout'
import type { FurnitureKind, Piece } from './furniture'

// Each piece of furniture as a handful of simple shapes. Plain numbers, so the tests can
// check heights and that nothing pokes out of its tiles; Furniture.tsx draws them.

export interface Part {
  name: string
  shape: 'box' | 'rounded' | 'cylinder'
  color: PaletteName
  position: [number, number, number] // centre, metres
  size: [number, number, number] // a cylinder is [diameter, height, diameter]
  rotation: [number, number, number]
}

// A part in the piece's own frame:
//   u along the wall it stands against (0 = the middle)
//   v out from that wall into the room (0 = at the wall)
//   y up from the floor
// `tilt` leans the part's top back towards the wall (the laptop screen).
interface LocalPart {
  name: string
  shape: Part['shape']
  color: PaletteName
  u: number
  y: number
  v: number
  su: number
  sy: number
  sv: number
  tilt?: number
}

const box = (name: string, color: PaletteName, [u, y, v]: number[], [su, sy, sv]: number[], tilt?: number): LocalPart =>
  ({ name, shape: 'box', color, u, y, v, su, sy, sv, tilt })
const rounded = (name: string, color: PaletteName, at: number[], size: number[]): LocalPart =>
  ({ ...box(name, color, at, size), shape: 'rounded' })
const cylinder = (name: string, color: PaletteName, at: number[], size: number[]): LocalPart =>
  ({ ...box(name, color, at, size), shape: 'cylinder' })

// ── Bed: 1 m wide along the wall, 2 m long into the room, head at the wall ──
const BED: LocalPart[] = [
  rounded('frame', 'walnut', [0, 0.14, 1.0], [1.0, 0.28, 2.0]),
  rounded('mattress', 'linen', [0, 0.37, 1.02], [0.94, 0.18, 1.92]), // top 0.46 m
  rounded('duvet', 'sage', [0, 0.475, 1.31], [0.98, 0.05, 1.34]),
  rounded('pillow', 'linen', [0, 0.52, 0.3], [0.58, 0.11, 0.32]),
  rounded('headboard', 'walnut', [0, 0.5, 0.04], [1.0, 1.0, 0.08]),
]

// ── Desk: 1.5 m along the wall, 0.5 m deep, top at 0.75 m, laptop, chair tucked under ──
const SCREEN_TILT = 0.3 // radians the laptop screen leans back
const HINGE = { v: 0.085, y: 0.766 } // back edge of the laptop base
const SCREEN_HALF = 0.11
const screenCentre = {
  v: HINGE.v - SCREEN_HALF * Math.sin(SCREEN_TILT),
  y: HINGE.y + SCREEN_HALF * Math.cos(SCREEN_TILT),
}
const DESK: LocalPart[] = [
  rounded('desktop', 'linen', [0, 0.73, 0.25], [1.5, 0.04, 0.5]), // top 0.75 m
  ...[-0.71, 0.71].flatMap((u) =>
    [0.04, 0.46].map((v) => box('desk leg', 'walnut', [u, 0.355, v], [0.04, 0.71, 0.04]))),
  box('laptop base', 'charcoal', [0, 0.758, 0.2], [0.34, 0.016, 0.23]),
  box('laptop screen', 'charcoal', [0, screenCentre.y, screenCentre.v], [0.34, 0.22, 0.012], SCREEN_TILT),
  // the lit screen face, just in front of the lid
  box('screen face', 'lilac', [0, screenCentre.y + 0.008 * Math.sin(SCREEN_TILT), screenCentre.v + 0.008 * Math.cos(SCREEN_TILT)],
    [0.31, 0.19, 0.004], SCREEN_TILT),
  // chair, tucked in: seat under the desktop, backrest just past the desk's front edge
  rounded('chair seat', 'peach', [0, 0.46, 0.3], [0.42, 0.05, 0.4]),
  rounded('chair back', 'peach', [0, 0.72, 0.52], [0.42, 0.38, 0.04]),
  ...[-0.18, 0.18].flatMap((u) =>
    [0.13, 0.47].map((v) => box('chair leg', 'walnut', [u, 0.2175, v], [0.03, 0.435, 0.03]))),
]

// ── Kitchenette: 1.5 m of cupboards with a worktop at 0.9 m, a hob and a pot ──
const KITCHENETTE: LocalPart[] = [
  rounded('cupboards', 'linen', [0, 0.42, 0.24], [1.5, 0.84, 0.48]),
  ...[-0.25, 0.25].map((u) => box('door gap', 'grain', [u, 0.44, 0.481], [0.006, 0.72, 0.006])),
  ...[-0.5, 0, 0.5].map((u) => box('handle', 'walnut', [u, 0.74, 0.49], [0.12, 0.016, 0.02])),
  rounded('worktop', 'walnut', [0, 0.88, 0.25], [1.5, 0.04, 0.5]), // top 0.9 m
  box('hob', 'charcoal', [0.4, 0.906, 0.25], [0.52, 0.012, 0.38]),
  cylinder('pot', 'bubblegum', [0.4, 0.982, 0.25], [0.22, 0.14, 0.22]),
  rounded('chopping board', 'wood', [-0.4, 0.91, 0.27], [0.32, 0.02, 0.22]),
  rounded('splashback', 'linen', [0, 1.15, 0.01], [1.5, 0.5, 0.02]),
]

export const LOCAL_PARTS: Record<FurnitureKind, LocalPart[]> = { bed: BED, desk: DESK, kitchenette: KITCHENETTE }

// How far a piece may poke out of its tiles: only the desk chair's backrest, just past the edge
export const OVERHANG: Record<FurnitureKind, number> = { bed: 0, desk: 0.05, kitchenette: 0 }

// The surface you use, for the tests: mattress, desktop, worktop
export const TOP_PART: Record<FurnitureKind, string> = { bed: 'mattress', desk: 'desktop', kitchenette: 'worktop' }

// Unit vectors on the floor (x, z): F points out from the wall, L runs along it
const FRAME: Record<Side, { F: [number, number]; L: [number, number] }> = {
  north: { F: [0, 1], L: [1, 0] },
  south: { F: [0, -1], L: [-1, 0] },
  west: { F: [1, 0], L: [0, -1] },
  east: { F: [-1, 0], L: [0, 1] },
}

export function furnitureParts(plan: RoomPlan, piece: Piece): Part[] {
  const x0 = lineX(plan, piece.col)
  const x1 = lineX(plan, piece.col + piece.cols)
  const z0 = lineZ(plan, piece.row)
  const z1 = lineZ(plan, piece.row + piece.rows)
  // the middle of the edge that touches the wall
  const origin: Record<Side, [number, number]> = {
    north: [(x0 + x1) / 2, z0],
    south: [(x0 + x1) / 2, z1],
    west: [x0, (z0 + z1) / 2],
    east: [x1, (z0 + z1) / 2],
  }
  const [cx, cz] = origin[piece.back]
  const { F, L } = FRAME[piece.back]
  const outAlongZ = F[0] === 0

  return LOCAL_PARTS[piece.kind].map((p) => {
    const tilt = p.tilt ?? 0
    return {
      name: p.name,
      shape: p.shape,
      color: p.color,
      position: [cx + p.u * L[0] + p.v * F[0], p.y, cz + p.u * L[1] + p.v * F[1]],
      size: outAlongZ ? [p.su, p.sy, p.sv] : [p.sv, p.sy, p.su],
      // lean the top back towards the wall: around x when the piece faces along z, else around z
      rotation: [-tilt * F[1], 0, tilt * F[0]],
    }
  })
}
