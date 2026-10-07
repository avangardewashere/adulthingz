import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { CameraFit } from './CameraFit'
import { Lighting } from './Lighting'
import { PlaceholderFloor } from './PlaceholderFloor'
import { DISTANCE, FOV, ORBIT, TARGET } from './cameraRig'

// The 3D view. The canvas is transparent, so the page's backdrop shows behind it.
export function RoomScene() {
  return (
    <Canvas
      shadows
      // flat = no tone mapping: colours on screen match the palette (and, in Block 2, the
      // avatar's anime textures) instead of being washed towards grey
      flat
      // cap pixel density at 2: sharp on phones, but no 3x render cost on the laptop
      dpr={[1, 2]}
      camera={{ fov: FOV, near: 0.1, far: 100 }}
      gl={{ alpha: true, antialias: true }}
    >
      <Lighting />
      <PlaceholderFloor />
      <OrbitControls
        makeDefault
        target={[TARGET.x, TARGET.y, TARGET.z]}
        enablePan={false}
        enableDamping
        minPolarAngle={ORBIT.minPolar}
        maxPolarAngle={ORBIT.maxPolar}
        minAzimuthAngle={ORBIT.minAzimuth}
        maxAzimuthAngle={ORBIT.maxAzimuth}
        minDistance={DISTANCE.min}
        maxDistance={DISTANCE.max}
      />
      <CameraFit />
    </Canvas>
  )
}
