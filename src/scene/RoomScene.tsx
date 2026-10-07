import { useMemo, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { CameraFit } from './CameraFit'
import { Lighting } from './Lighting'
import { DISTANCE, FOV, ORBIT, TARGET, radiusFor } from './cameraRig'
import { RoomShell } from '../room/RoomShell'
import { parseRoom, roomSize } from '../room/roomLayout'
import { findShape, type RoomShapeId } from '../room/roomShapes'
import { Avatar, type WalkRequest } from '../avatar/AvatarModel'

// The 3D view. The canvas is transparent, so the page's backdrop shows behind it.
export function RoomScene({ shapeId }: { shapeId: RoomShapeId }) {
  const plan = useMemo(() => parseRoom(findShape(shapeId).rows), [shapeId])
  const { width, depth } = roomSize(plan)
  // the latest floor tap; the avatar works out how to get there
  const [request, setRequest] = useState<WalkRequest | null>(null)

  return (
    <Canvas
      // percentage = PCF shadows; three 0.186 dropped the "soft" kind fiber asks for by default
      shadows="percentage"
      // flat = no tone mapping: colours on screen match the palette (and, in Block 2, the
      // avatar's anime textures) instead of being washed towards grey
      flat
      // cap pixel density at 2: sharp on phones, but no 3x render cost on the laptop
      dpr={[1, 2]}
      camera={{ fov: FOV, near: 0.1, far: 100 }}
      gl={{ alpha: true, antialias: true }}
    >
      <Lighting />
      {/* key: a new shape builds a fresh room (React swaps it out, three frees the old shapes) */}
      <RoomShell key={shapeId} plan={plan} onFloorTap={(tile) => setRequest({ tile, id: performance.now() })} />
      <Avatar plan={plan} request={request} />
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
      <CameraFit radius={radiusFor(width, depth)} />
    </Canvas>
  )
}
