import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import type { Vector3 } from 'three'
import { TARGET, startPosition } from './cameraRig'

// Puts the camera where the whole stage fits the screen.
// Runs on first load and whenever the screen size changes (e.g. a phone is rotated).
export function CameraFit() {
  const camera = useThree((state) => state.camera)
  const { width, height } = useThree((state) => state.size)
  const controls = useThree((state) => state.controls) as unknown as {
    target: Vector3
    update: () => void
  } | null

  useEffect(() => {
    const p = startPosition(width / height)
    camera.position.set(p.x, p.y, p.z)
    camera.lookAt(TARGET.x, TARGET.y, TARGET.z)
    // The orbit pivot must match where the camera looks
    controls?.target.set(TARGET.x, TARGET.y, TARGET.z)
    controls?.update()
  }, [camera, controls, width, height])

  return null
}
