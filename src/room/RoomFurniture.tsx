import { useEffect, useMemo, useRef } from 'react'
import { RoundedBox } from '@react-three/drei'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { MeshStandardMaterial, type Group } from 'three'
import { PALETTE, type PaletteName } from '../theme/palette'
import { isTap } from '../lib/tap'
import { furnitureParts, isChairPart, pieceFrame, type Part } from './furnitureParts'
import type { Piece } from './furniture'
import type { RoomPlan } from './roomLayout'
import { THING_FOR, type ThingKind } from '../things/things'
import { CHAIR_SLIDE, chairOut } from '../things/thingPoses'
import { thingNow } from '../things/thingStore'
import { PotSteam } from '../things/ThingEffects'

// One matte material per palette colour, made once and shared by every piece in every room
const materials = new Map<PaletteName, MeshStandardMaterial>()
function paint(color: PaletteName) {
  if (!materials.has(color)) materials.set(color, new MeshStandardMaterial({ color: PALETTE[color], roughness: 0.85 }))
  return materials.get(color)!
}

const setCursor = (cursor: string) => (document.body.style.cursor = cursor)

// The room's furniture. All the sizes and positions come from furnitureParts.ts.
// Tapping a piece asks the avatar to go and use it (a drag still turns the camera).
export function RoomFurniture({ plan, onUse }: { plan: RoomPlan; onUse?: (thing: ThingKind) => void }) {
  useEffect(() => () => void setCursor(''), [])
  return (
    <group>
      {plan.furniture.map((piece) => (
        <FurniturePiece key={`${piece.kind}-${piece.col}-${piece.row}`} plan={plan} piece={piece} onUse={onUse} />
      ))}
    </group>
  )
}

function FurniturePiece({ plan, piece, onUse }: { plan: RoomPlan; piece: Piece; onUse?: (thing: ThingKind) => void }) {
  const parts = useMemo(() => furnitureParts(plan, piece), [plan, piece])
  const fixed = parts.filter((p) => !isChairPart(p))
  const chair = parts.filter(isChairPart)
  const pot = parts.find((p) => p.name === 'pot')
  const { F } = pieceFrame(plan, piece)
  const chairGroup = useRef<Group>(null)

  // The chair slides straight out from under the desk while the avatar sits down
  useFrame(() => {
    if (!chairGroup.current) return
    const out = chairOut(thingNow.thing, thingNow.weight) * CHAIR_SLIDE
    chairGroup.current.position.set(F[0] * out, 0, F[1] * out)
  })

  const tap = (event: ThreeEvent<MouseEvent>) => {
    if (!isTap(event.delta)) return
    event.stopPropagation() // the floor underneath must not also take this tap
    onUse?.(THING_FOR[piece.kind])
  }
  const hover = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation()
    setCursor('pointer')
  }

  return (
    <group onClick={tap} onPointerOver={hover} onPointerOut={() => setCursor('')}>
      {fixed.map((part, i) => (
        <PartMesh key={`${part.name}-${i}`} part={part} />
      ))}
      {chair.length > 0 && (
        <group ref={chairGroup}>
          {chair.map((part, i) => (
            <PartMesh key={`${part.name}-${i}`} part={part} />
          ))}
        </group>
      )}
      {pot && <PotSteam position={[pot.position[0], pot.position[1] + pot.size[1] / 2, pot.position[2]]} />}
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
