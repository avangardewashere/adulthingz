import type { VRMHumanBoneName } from '@pixiv/three-vrm'

// A pose says how far to turn some of the avatar's bones, in radians around x, y and z.
// Poses are written the VRM 1 way (avatar faces +z, its left hand is at +x):
//   x > 0 tips a hanging arm or leg backward, so "forward" is a negative x
//   z lowers (or raises) an arm held out sideways
//   y twists
export interface Turn {
  x: number
  y: number
  z: number
}

export type Pose = Partial<Record<VRMHumanBoneName, Turn>>

export const turn = (x = 0, y = 0, z = 0): Turn => ({ x, y, z })

// a + b × weight, bone by bone. A bone missing on one side counts as "no turn",
// so blending with weight 0 gives back exactly a.
export function addPoses(a: Pose, b: Pose, weight = 1): Pose {
  const out: Pose = {}
  const bones = new Set([...Object.keys(a), ...Object.keys(b)] as VRMHumanBoneName[])
  for (const bone of bones) {
    const p = a[bone] ?? turn()
    const q = b[bone] ?? turn()
    out[bone] = turn(p.x + q.x * weight, p.y + q.y * weight, p.z + q.z * weight)
  }
  return out
}

// VRM 0 avatars are built facing −z. three-vrm's normalized bones for them flip turns around
// x and z (its own animation examples do the same); turns around y are unchanged.
export function forVersion(pose: Pose, metaVersion: '0' | '1'): Pose {
  if (metaVersion === '1') return pose
  const out: Pose = {}
  for (const [bone, t] of Object.entries(pose) as [VRMHumanBoneName, Turn][]) out[bone] = turn(-t.x, t.y, -t.z)
  return out
}
