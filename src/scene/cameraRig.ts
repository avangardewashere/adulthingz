import { FLOOR_THICKNESS, STAGE, WALL } from './stageSize'

// Where the camera starts, and how far you're allowed to turn it.
// Kept free of three.js so the tests can check it with plain numbers.

export const FOV = 35 // vertical field of view, degrees (narrow = flatter, more "dollhouse")

// The point the camera looks at and orbits around: middle of the room, a bit above the floor.
// Every room is centred on the origin, so this works for all of them.
export const TARGET = { x: 0, y: STAGE.height / 3, z: 0 } as const

export interface Vec3 {
  x: number
  y: number
  z: number
}

// Radius of an imaginary ball, centred on TARGET, that just wraps a room of this floor size.
// Walls stand outside the floor, so add their thickness. TARGET sits a third of the way up,
// so the wall tops are further from it than the floor is: measure to whichever is further.
export function radiusFor(width: number, depth: number, height: number = STAGE.height) {
  const up = Math.max(height - TARGET.y, TARGET.y + FLOOR_THICKNESS)
  return Math.hypot(width / 2 + WALL.thickness, depth / 2 + WALL.thickness, up)
}

// The biggest room on offer fits inside the stage, so the stage sets the zoom limits
export const STAGE_RADIUS = radiusFor(STAGE.width, STAGE.depth)

// Angles, in radians, the way OrbitControls measures them:
// polar = tilt down from straight above (0 = top view, π/2 = level with the floor)
// azimuth = turn around the room (0 = from the front, π/2 = from the right side)
export const ORBIT = {
  minPolar: 0.25, // not quite straight down
  maxPolar: 1.35, // stops ~12° above level, so you never see under the floor
  // The tall walls are at the back and left, so the camera stays front-and-right
  minAzimuth: -0.15,
  maxAzimuth: Math.PI / 2 + 0.1,
}

// Narrowest screen we plan for (a tall phone held upright)
export const NARROWEST_ASPECT = 0.45

// How far back the camera must be for a room's ball to fit the screen.
// fov is vertical; a narrow (portrait) screen sees less sideways, so work out the
// horizontal angle too and fit to whichever is tighter.
export function fitDistance(aspect: number, radius = STAGE_RADIUS, fov = FOV) {
  const vHalf = ((fov / 2) * Math.PI) / 180
  const hHalf = Math.atan(Math.tan(vHalf) * aspect)
  return radius / Math.sin(Math.min(vHalf, hHalf))
}

export const DISTANCE = {
  min: STAGE_RADIUS * 0.8, // zoomed in, but not inside a wall
  max: fitDistance(NARROWEST_ASPECT) * 1.25, // room is small on screen, but you can still back off
}

const clampDistance = (d: number) => Math.min(DISTANCE.max, Math.max(DISTANCE.min, d))

// Starting view: from the front-right corner, looking down at the floor
export const START_AZIMUTH = Math.PI / 4
const START = { polar: 0.95, azimuth: START_AZIMUTH }

// Camera position for a screen shape and room size, as {x, y, z}
export function startPosition(aspect: number, radius = STAGE_RADIUS): Vec3 {
  const { polar, azimuth } = START
  const distance = clampDistance(fitDistance(aspect, radius))
  return {
    x: TARGET.x + distance * Math.sin(polar) * Math.sin(azimuth),
    y: TARGET.y + distance * Math.cos(polar),
    z: TARGET.z + distance * Math.sin(polar) * Math.cos(azimuth),
  }
}

// After you pick another room (or turn the phone): keep the angle you turned the camera to,
// only move it nearer or further so the new room fits
export function refitPosition(current: Vec3, aspect: number, radius: number): Vec3 {
  const dx = current.x - TARGET.x
  const dy = current.y - TARGET.y
  const dz = current.z - TARGET.z
  const length = Math.hypot(dx, dy, dz)
  if (length === 0) return startPosition(aspect, radius)
  const scale = clampDistance(fitDistance(aspect, radius)) / length
  return { x: TARGET.x + dx * scale, y: TARGET.y + dy * scale, z: TARGET.z + dz * scale }
}
