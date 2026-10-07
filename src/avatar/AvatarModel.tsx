import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import type { VRM } from '@pixiv/three-vrm'
import { tileCentre, type RoomPlan } from '../room/roomLayout'
import { BREATH_SWAY, breath, createBlinker, restingArms } from './idle'
import { FACING_YAW, spawnTile } from './placement'
import { startAvatarLoad, useAvatar } from './avatarStore'

// The avatar, standing on the room's middle tile and facing the camera.
// Not rebuilt when the room changes: it just moves to the new room's middle tile.
export function Avatar({ plan }: { plan: RoomPlan }) {
  useEffect(() => startAvatarLoad(), [])
  const vrm = useAvatar()
  const { x, z } = useMemo(() => tileCentre(plan, spawnTile(plan)), [plan])

  if (!vrm) return null
  return (
    <group position={[x, 0, z]} rotation-y={FACING_YAW}>
      <IdleAvatar vrm={vrm} />
    </group>
  )
}

function IdleAvatar({ vrm }: { vrm: VRM }) {
  const blinker = useMemo(() => createBlinker(7), [])

  // Arms down from the T-pose, once
  useEffect(() => {
    for (const [bone, axis, angle] of restingArms(vrm.meta.metaVersion)) {
      const node = vrm.humanoid.getNormalizedBoneNode(bone)
      if (node) node.rotation[axis] = angle
    }
  }, [vrm])

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime
    const b = breath(t)
    const spine = vrm.humanoid.getNormalizedBoneNode('spine')
    const chest = vrm.humanoid.getNormalizedBoneNode('chest')
    if (spine) spine.rotation.x = BREATH_SWAY.spine * b
    if (chest) chest.rotation.x = BREATH_SWAY.chest * b

    vrm.expressionManager?.setValue('blink', blinker.weightAt(t))

    // Copies the normalized bones onto the real skeleton, updates the face and hair physics.
    // Delta is capped: after the tab was hidden it could be seconds long, and the hair
    // physics would fling the hair.
    vrm.update(Math.min(delta, 1 / 30))
  })

  return <primitive object={vrm.scene} />
}
