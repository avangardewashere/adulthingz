import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import type { VRM, VRMHumanBoneName } from '@pixiv/three-vrm'
import { tileCentre, type RoomPlan, type Tile } from '../room/roomLayout'
import { RESTING_POSE, breathingPose, createBlinker } from './idle'
import { FACING_YAW, spawnTile } from './placement'
import { addPoses, forVersion, type Turn } from './pose'
import { startAvatarLoad, useAvatar } from './avatarStore'
import { planWalk, type Point } from '../walk/path'
import { standingWalker, startRoute, stepWalker, type Walker } from '../walk/walker'
import { bobAt, walkPose } from '../walk/walkCycle'
import { TargetRing } from '../walk/TargetRing'

// A tap on a floor tile. `id` is new on every tap, so tapping the same tile twice still counts.
export interface WalkRequest {
  tile: Tile
  id: number
}

// The avatar: starts on the room's middle tile facing the camera, walks to tapped tiles.
export function Avatar({ plan, request }: { plan: RoomPlan; request: WalkRequest | null }) {
  useEffect(() => startAvatarLoad(), [])
  const vrm = useAvatar()
  if (!vrm) return null
  return <WalkingAvatar vrm={vrm} plan={plan} request={request} />
}

function standingIn(plan: RoomPlan): Walker {
  const { x, z } = tileCentre(plan, spawnTile(plan))
  return standingWalker(x, z, FACING_YAW)
}

function WalkingAvatar({ vrm, plan, request }: { vrm: VRM; plan: RoomPlan; request: WalkRequest | null }) {
  const body = useRef<Group>(null!)
  // Where the avatar is and what it's doing: changes every frame, so it lives in a ref
  // (no React re-render per frame)
  const walker = useRef<Walker>(standingIn(plan))
  const [target, setTarget] = useState<Point | null>(null)
  const blinker = useMemo(() => createBlinker(7), [])

  // Another room: start over on its middle tile
  useEffect(() => {
    walker.current = standingIn(plan)
    setTarget(null)
  }, [plan])

  // A tap: plan a walk from wherever the avatar is right now (even mid-walk).
  // Only `request` triggers this; a room change alone must not replay the last tap.
  useEffect(() => {
    if (!request) return
    const points = planWalk(plan, walker.current, request.tile)
    if (!points) return // no way there, or already standing there
    walker.current = startRoute(walker.current, points)
    setTarget(points[points.length - 1])
  }, [request])

  useFrame(({ clock }, delta) => {
    // Capped: after the tab was hidden a frame could be seconds long, and the avatar
    // would jump (and the hair physics would fling the hair)
    const dt = Math.min(delta, 1 / 30)
    const step = stepWalker(walker.current, dt)
    const w = (walker.current = step.walker)
    if (step.arrived) setTarget(null)

    body.current.position.set(w.x, bobAt(w.phase) * w.blend, w.z)
    body.current.rotation.y = w.heading

    // standing pose + as much of the walk as is blended in + breathing, then set the bones
    const pose = forVersion(
      addPoses(addPoses(RESTING_POSE, walkPose(w.phase), w.blend), breathingPose(clock.elapsedTime)),
      vrm.meta.metaVersion,
    )
    for (const [bone, t] of Object.entries(pose) as [VRMHumanBoneName, Turn][]) {
      vrm.humanoid.getNormalizedBoneNode(bone)?.rotation.set(t.x, t.y, t.z)
    }
    vrm.expressionManager?.setValue('blink', blinker.weightAt(clock.elapsedTime))

    // Copies the normalized bones onto the real skeleton, updates the face and hair physics
    vrm.update(dt)
  })

  return (
    <>
      <group ref={body}>
        <primitive object={vrm.scene} />
      </group>
      {target && <TargetRing x={target.x} z={target.z} />}
    </>
  )
}
