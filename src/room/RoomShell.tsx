import { useEffect, useMemo } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import { PALETTE } from '../theme/palette'
import { isTap } from '../lib/tap'
import { FLOOR_MATERIAL, WALL_MATERIAL } from './roomMaterials'
import { RoomFurniture } from './RoomFurniture'
import {
  floorBox,
  floorRects,
  gridLines,
  mergeWalls,
  postBoxes,
  tileAt,
  wallBox,
  wallEdges,
  type RoomPlan,
  type Tile,
} from './roomLayout'

const setCursor = (cursor: string) => (document.body.style.cursor = cursor)

// The empty room: floor blocks, walls, corner posts and faint tile lines.
// All the maths is in roomLayout.ts; this only hands the boxes to three.js.
// Tapping the floor reports the tile; a drag (turning the camera) doesn't count.
export function RoomShell({ plan, onFloorTap }: { plan: RoomPlan; onFloorTap?: (tile: Tile) => void }) {
  // the pointer cursor must not stick if the room is swapped while hovering it
  useEffect(() => () => void setCursor(''), [])

  const tapFloor = (event: ThreeEvent<MouseEvent>) => {
    // event.delta = how many pixels the pointer moved between press and release
    if (!isTap(event.delta)) return
    event.stopPropagation()
    const tile = tileAt(plan, event.point.x, event.point.z)
    if (tile) onFloorTap?.(tile)
  }

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
      <group onClick={tapFloor} onPointerOver={() => setCursor('pointer')} onPointerOut={() => setCursor('')}>
        {parts.floors.map((box, i) => (
          <mesh key={`floor-${i}`} position={box.position} material={FLOOR_MATERIAL} receiveShadow>
            <boxGeometry args={box.size} />
          </mesh>
        ))}
      </group>

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

      <RoomFurniture plan={plan} />
    </group>
  )
}
