import { MeshStandardMaterial } from 'three'
import { PALETTE } from '../theme/palette'

// Shared by every room: made once and reused, so switching rooms only rebuilds the
// shapes (geometry), never the paint
export const FLOOR_MATERIAL = new MeshStandardMaterial({ color: PALETTE.wood, roughness: 0.85 })
export const WALL_MATERIAL = new MeshStandardMaterial({ color: PALETTE.wall, roughness: 0.95 })
