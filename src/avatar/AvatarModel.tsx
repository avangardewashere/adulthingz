import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import type { VRM, VRMHumanBoneName } from '@pixiv/three-vrm'
import { tileCentre, type RoomPlan } from '../room/roomLayout'
import { RESTING_POSE, breathingPose, createBlinker } from './idle'
import { FACING_YAW, spawnTile } from './placement'
import { addPoses, forVersion, type Turn } from './pose'
import { startAvatarLoad, useAvatar } from './avatarStore'
import type { Point } from '../walk/path'
import { standingWalker } from '../walk/walker'
import { bobAt, walkPose } from '../walk/walkCycle'
import { TargetRing } from '../walk/TargetRing'
import {
  freeActivity,
  pieceFor,
  requestThing,
  stepActivity,
  thingOf,
  thingWeight,
  type Activity,
  type Request,
} from '../things/activity'
import { LIFT, blendTransform, eyesShut, standingTransform, thingPose, thingTarget } from '../things/thingPoses'
import { thingNow } from '../things/thingStore'
import { SleepZs } from '../things/ThingEffects'
import type { ThingKind } from '../things/things'

// A tap: a floor tile to walk to, or a thing to go and do. `id` is new on every tap,
// so tapping the same spot twice still counts.
export type AvatarRequest = Request & { id: number }

// The avatar: starts on the room's middle tile facing the camera, walks to tapped tiles,
// and goes and does a thing when a piece of furniture is tapped.
export function Avatar({ plan, request, onDone }: { plan: RoomPlan; request: AvatarRequest | null; onDone?: (thing: ThingKind) => void }) {
  useEffect(() => startAvatarLoad(), [])
  const vrm = useAvatar()
  if (!vrm) return null
  return <LivingAvatar vrm={vrm} plan={plan} request={request} onDone={onDone} />
}

function startIn(plan: RoomPlan): Activity {
  const { x, z } = tileCentre(plan, spawnTile(plan))
  return freeActivity(standingWalker(x, z, FACING_YAW))
}

const sameSpot = (a: Point | null, b: Point | null) => a === b || (a !== null && b !== null && a.x === b.x && a.z === b.z)

function LivingAvatar({ vrm, plan, request, onDone }: { vrm: VRM; plan: RoomPlan; request: AvatarRequest | null; onDone?: (thing: ThingKind) => void }) {
  const body = useRef<Group>(null!)
  // Everything that changes every frame lives in refs, so React doesn't re-render 60 times a second
  const activity = useRef<Activity>(startIn(plan))
  const ring = useRef<Point | null>(null)
  const [target, setTarget] = useState<Point | null>(null) // the ring on the floor
  const blinker = useMemo(() => createBlinker(7), [])

  // Another room: start over on its middle tile
  useEffect(() => {
    activity.current = startIn(plan)
    thingNow.thing = null
    thingNow.weight = 0
  }, [plan])

  // A tap. Only `request` triggers this; a room change alone must not replay the last tap.
  useEffect(() => {
    if (request) activity.current = requestThing(plan, activity.current, request)
  }, [request])

  useFrame(({ clock }, delta) => {
    // Capped: after the tab was hidden a frame could be seconds long, and the avatar
    // would jump (and the hair physics would fling the hair)
    const dt = Math.min(delta, 1 / 30)
    const t = clock.elapsedTime
    const step = stepActivity(plan, activity.current, dt)
    const a = (activity.current = step.activity)
    if (step.done) onDone?.(step.done)

    const w = a.walker
    const thing = thingOf(a.phase)
    const weight = thingWeight(a.phase)
    thingNow.thing = thing
    thingNow.weight = weight

    // Where the body is: standing/walking, or part-way to lying on the bed / sitting on the chair
    const standing = standingTransform(w.x, bobAt(w.phase) * w.blend, w.z, w.heading)
    const placed = thing && weight > 0
      ? blendTransform(standing, thingTarget(plan, thing, pieceFor(plan, thing)), weight, LIFT[thing])
      : standing
    body.current.position.copy(placed.position)
    body.current.quaternion.copy(placed.quaternion)

    // How the bones bend: resting arms + walking + the thing + breathing
    let pose = addPoses(RESTING_POSE, walkPose(w.phase), w.blend)
    if (thing && weight > 0) pose = addPoses(pose, thingPose(thing, t), weight)
    pose = forVersion(addPoses(pose, breathingPose(t)), vrm.meta.metaVersion)
    for (const [bone, turn] of Object.entries(pose) as [VRMHumanBoneName, Turn][]) {
      vrm.humanoid.getNormalizedBoneNode(bone)?.rotation.set(turn.x, turn.y, turn.z)
    }
    vrm.expressionManager?.setValue('blink', Math.max(blinker.weightAt(t), eyesShut(thing, weight)))

    // The ring marks where it's walking to, and goes when it gets there
    const route = w.route
    const next = route ? route.points[route.points.length - 1] : null
    if (!sameSpot(next, ring.current)) {
      ring.current = next
      setTarget(next)
    }

    // Copies the normalized bones onto the real skeleton, updates the face and hair physics
    vrm.update(dt)
  })

  return (
    <>
      <group ref={body}>
        <primitive object={vrm.scene} />
        <SleepZs />
      </group>
      {target && <TargetRing x={target.x} z={target.z} />}
    </>
  )
}
