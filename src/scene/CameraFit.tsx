import { useEffect, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import type { Vector3 } from 'three'
import { TARGET, refitPosition, startPosition } from './cameraRig'

// Puts the camera where the whole room fits the screen. The first time it uses the
// starting view; after that (another room picked, phone rotated) it keeps your angle
// and only moves nearer or further.
export function CameraFit({ radius }: { radius: number }) {
  const camera = useThree((state) => state.camera)
  const { width, height } = useThree((state) => state.size)
  const controls = useThree((state) => state.controls) as unknown as {
    target: Vector3
    update: () => void
  } | null
  const placed = useRef(false)

  useEffect(() => {
    const aspect = width / height
    const p = placed.current ? refitPosition(camera.position, aspect, radius) : startPosition(aspect, radius)
    placed.current = true
    camera.position.set(p.x, p.y, p.z)
    camera.lookAt(TARGET.x, TARGET.y, TARGET.z)
    // The orbit pivot must match where the camera looks
    controls?.target.set(TARGET.x, TARGET.y, TARGET.z)
    controls?.update()
  }, [camera, controls, width, height, radius])

  return null
}
