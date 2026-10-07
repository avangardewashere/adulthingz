import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Mesh } from 'three'
import { PALETTE } from '../theme/palette'

// A small ring on the floor where you tapped, gently pulsing until the avatar gets there
export function TargetRing({ x, z }: { x: number; z: number }) {
  const ring = useRef<Mesh>(null!)

  useFrame(({ clock }) => {
    const s = 1 + 0.12 * Math.sin(clock.elapsedTime * 6)
    ring.current.scale.set(s, s, 1)
  })

  return (
    // lying flat, 4 mm above the floor so it doesn't flicker against it
    <mesh ref={ring} position={[x, 0.004, z]} rotation-x={-Math.PI / 2}>
      {/* outer radius 0.19 m: stays inside its 0.5 m tile even at the biggest pulse */}
      <ringGeometry args={[0.12, 0.19, 40]} />
      <meshBasicMaterial color={PALETTE.grape} transparent opacity={0.85} depthWrite={false} />
    </mesh>
  )
}
