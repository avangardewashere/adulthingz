import { useMemo } from 'react'
import { RoundedBox } from '@react-three/drei'
import { MeshStandardMaterial } from 'three'
import { PALETTE, type PaletteName } from '../theme/palette'
import { furnitureParts, type Part } from './furnitureParts'
import type { RoomPlan } from './roomLayout'

// One matte material per palette colour, made once and shared by every piece in every room
const materials = new Map<PaletteName, MeshStandardMaterial>()
function paint(color: PaletteName) {
  if (!materials.has(color)) materials.set(color, new MeshStandardMaterial({ color: PALETTE[color], roughness: 0.85 }))
  return materials.get(color)!
}

// The room's furniture. All the sizes and positions come from furnitureParts.ts.
export function RoomFurniture({ plan }: { plan: RoomPlan }) {
  const parts = useMemo(() => plan.furniture.flatMap((piece) => furnitureParts(plan, piece)), [plan])
  return (
    <group>
      {parts.map((part, i) => (
        <PartMesh key={`${part.name}-${i}`} part={part} />
      ))}
    </group>
  )
}

function PartMesh({ part }: { part: Part }) {
  const { shape, position, rotation, size } = part
  const material = paint(part.color)
  if (shape === 'rounded') {
    // soft corners, but never rounder than the thinnest side allows
    const radius = Math.min(0.03, Math.min(...size) * 0.45)
    return (
      <RoundedBox args={size} radius={radius} smoothness={2} position={position} rotation={rotation}
        material={material} castShadow receiveShadow />
    )
  }
  return (
    <mesh position={position} rotation={rotation} material={material} castShadow receiveShadow>
      {shape === 'cylinder' ? <cylinderGeometry args={[size[0] / 2, size[0] / 2, size[1], 24]} /> : <boxGeometry args={size} />}
    </mesh>
  )
}
