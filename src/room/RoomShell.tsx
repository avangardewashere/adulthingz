import { useMemo } from 'react'
import { PALETTE } from '../theme/palette'
import { FLOOR_MATERIAL, WALL_MATERIAL } from './roomMaterials'
import { floorBox, floorRects, gridLines, mergeWalls, postBoxes, wallBox, wallEdges, type RoomPlan } from './roomLayout'

// The empty room: floor blocks, walls, corner posts and faint tile lines.
// All the maths is in roomLayout.ts; this only hands the boxes to three.js.
export function RoomShell({ plan }: { plan: RoomPlan }) {
  const parts = useMemo(
    () => ({
      floors: floorRects(plan).map((rect) => floorBox(plan, rect)),
      walls: [...mergeWalls(wallEdges(plan)).map((segment) => wallBox(plan, segment)), ...postBoxes(plan)],
      // lifted 2 mm so the lines don't flicker against the floor
      lines: new Float32Array(gridLines(plan, 0.002)),
    }),
    [plan],
  )

  return (
    <group>
      {parts.floors.map((box, i) => (
        <mesh key={`floor-${i}`} position={box.position} material={FLOOR_MATERIAL} receiveShadow>
          <boxGeometry args={box.size} />
        </mesh>
      ))}

      {parts.walls.map((box, i) => (
        <mesh key={`wall-${i}`} position={box.position} material={WALL_MATERIAL} castShadow receiveShadow>
          <boxGeometry args={box.size} />
        </mesh>
      ))}

      <lineSegments>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[parts.lines, 3]} />
        </bufferGeometry>
        <lineBasicMaterial color={PALETTE.grain} transparent opacity={0.3} />
      </lineSegments>
    </group>
  )
}
