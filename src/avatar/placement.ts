import { floorTiles, freeTiles, type RoomPlan, type Tile } from '../room/roomLayout'
import { START_AZIMUTH } from '../scene/cameraRig'

// Where the avatar appears: the free tile nearest the middle of the floor (the average of
// all floor tiles, so in the L-shape it's the middle of the L, not of its bounding box).
// Free = no furniture on it.
// When several tiles are equally near, take the one nearest the camera: front, then right.
export function spawnTile(plan: RoomPlan): Tile {
  const floor = floorTiles(plan)
  const cx = floor.reduce((sum, t) => sum + t.col + 0.5, 0) / floor.length
  const cz = floor.reduce((sum, t) => sum + t.row + 0.5, 0) / floor.length
  const tiles = freeTiles(plan)
  let best = tiles[0]
  let bestDistance = Infinity
  for (const tile of tiles) {
    const d = (tile.col + 0.5 - cx) ** 2 + (tile.row + 0.5 - cz) ** 2
    const tie = Math.abs(d - bestDistance) < 1e-9
    const nearerCamera = tile.row > best.row || (tile.row === best.row && tile.col > best.col)
    if ((d < bestDistance && !tie) || (tie && nearerCamera)) {
      best = tile
      bestDistance = d
    }
  }
  return best
}

// The avatar turns to face where the camera starts (front-right), so you see its face first
export const FACING_YAW = START_AZIMUTH
