import { PALETTE } from '../theme/palette'
import { FLOOR_THICKNESS, STAGE, TILE } from './stageSize'

// Block 0 only: a flat 6 × 6 m plate with the 0.5 m tile grid drawn on it, so we can see the
// camera and lights working. Block 1 replaces this with real rooms built from these tiles.
export function PlaceholderFloor() {
  const tilesAcross = STAGE.width / TILE

  return (
    <group>
      {/* The plate: its top surface sits exactly at y = 0 */}
      <mesh position={[0, -FLOOR_THICKNESS / 2, 0]} receiveShadow>
        <boxGeometry args={[STAGE.width, FLOOR_THICKNESS, STAGE.depth]} />
        <meshStandardMaterial color={PALETTE.oat} roughness={0.9} />
      </mesh>

      {/* Tile lines, lifted 2 mm so they don't flicker against the plate */}
      <gridHelper args={[STAGE.width, tilesAcross, PALETTE.lilac, PALETTE.lilac]} position={[0, 0.002, 0]} />
    </group>
  )
}
