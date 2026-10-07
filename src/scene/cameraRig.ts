import { STAGE } from './stageSize'

// Where the camera starts, and how far you're allowed to turn it.
// Kept free of three.js so the tests can check it with plain numbers.

export const FOV = 35 // vertical field of view, degrees (narrow = flatter, more "dollhouse")

// The point the camera looks at and orbits around: middle of the stage, a bit above the floor
export const TARGET = { x: 0, y: STAGE.height / 3, z: 0 } as const

// Radius of an imaginary ball that just wraps the whole stage, walls included
export const STAGE_RADIUS = Math.hypot(STAGE.width / 2, STAGE.depth / 2, STAGE.height / 2)

// Angles, in radians, the way OrbitControls measures them:
// polar = tilt down from straight above (0 = top view, π/2 = level with the floor)
// azimuth = turn around the room (0 = from the front, π/2 = from the right side)
export const ORBIT = {
  minPolar: 0.25, // not quite straight down
  maxPolar: 1.35, // stops ~12° above level, so you never see under the floor
  // Block 1 puts the tall walls at the back and left, so the camera stays front-and-right
  minAzimuth: -0.15,
  maxAzimuth: Math.PI / 2 + 0.1,
}

// Narrowest screen we plan for (a tall phone held upright)
export const NARROWEST_ASPECT = 0.45

// How far back the camera must be for the stage's ball to fit the screen.
// fov is vertical; a narrow (portrait) screen sees less sideways, so work out the
// horizontal angle too and fit to whichever is tighter.
export function fitDistance(aspect: number, fov = FOV) {
  const vHalf = ((fov / 2) * Math.PI) / 180
  const hHalf = Math.atan(Math.tan(vHalf) * aspect)
  return STAGE_RADIUS / Math.sin(Math.min(vHalf, hHalf))
}

export const DISTANCE = {
  min: STAGE_RADIUS * 0.8, // zoomed in, but not inside a wall
  max: fitDistance(NARROWEST_ASPECT) * 1.25, // stage is small on screen, but you can still back off
}

// Starting view: from the front-right corner, looking down at the floor
const START = { polar: 0.95, azimuth: Math.PI / 4 }

// Camera position for a screen shape, as {x, y, z}
export function startPosition(aspect: number) {
  const { polar, azimuth } = START
  const distance = fitDistance(aspect)
  return {
    x: TARGET.x + distance * Math.sin(polar) * Math.sin(azimuth),
    y: TARGET.y + distance * Math.cos(polar),
    z: TARGET.z + distance * Math.sin(polar) * Math.cos(azimuth),
  }
}
