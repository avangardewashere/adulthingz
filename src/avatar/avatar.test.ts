import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { Matrix4, Quaternion, Vector3 } from 'three'
import { BLINK, BLINK_SECONDS, BREATH_SECONDS, BREATH_SWAY, blinkCurve, breath, createBlinker, restingArms } from './idle'
import { spawnTile } from './placement'
import { percentOf, statusText } from './avatarStore'
import { AVATAR } from './avatarFile'
import { ROOM_SHAPES, findShape } from '../room/roomShapes'
import { isFloor, parseRoom } from '../room/roomLayout'
import { STAGE } from '../scene/stageSize'

// The real avatar file, read the way the app ships it
const file = readFileSync(fileURLToPath(new URL('../../public/avatars/avatar-sample-1.vrm', import.meta.url)))

// A .vrm is a .glb: 12-byte header, then a JSON chunk describing the model
function glbJson(bytes: Buffer) {
  const length = bytes.readUInt32LE(12)
  return JSON.parse(bytes.toString('utf8', 20, 20 + length))
}

describe('Block 2: the avatar arrives', () => {
  it('B2-T1: a blink closes and opens again within 0.15 s', () => {
    expect(BLINK_SECONDS).toBeCloseTo(0.15, 9)
    expect(blinkCurve(0)).toBe(0)
    expect(blinkCurve(BLINK.close + BLINK.hold / 2)).toBe(1) // fully shut in the middle
    expect(blinkCurve(BLINK_SECONDS)).toBe(0)
    expect(blinkCurve(BLINK_SECONDS + 0.5)).toBe(0)
    // closes steadily, then opens steadily: never jumps back
    const samples = Array.from({ length: 151 }, (_, i) => blinkCurve(i / 1000))
    const peak = samples.indexOf(1)
    for (let i = 1; i <= peak; i++) expect(samples[i]).toBeGreaterThanOrEqual(samples[i - 1])
    for (let i = samples.lastIndexOf(1) + 1; i < samples.length; i++) expect(samples[i]).toBeLessThanOrEqual(samples[i - 1])
  })

  it('B2-T2: blinks come 2–6 s apart, eyes stay open in between, same seed = same blinks', () => {
    const blinker = createBlinker(7)
    blinker.weightAt(120) // two minutes of blinks
    const { starts } = blinker
    expect(starts.length).toBeGreaterThan(120 / BLINK.maxGap)
    for (let i = 1; i < starts.length; i++) {
      const gap = starts[i] - starts[i - 1]
      expect(gap).toBeGreaterThanOrEqual(BLINK.minGap)
      expect(gap).toBeLessThanOrEqual(BLINK.maxGap)
    }
    // halfway between two blinks the eyes are open
    expect(blinker.weightAt((starts[3] + starts[4]) / 2)).toBe(0)
    // and shut in the middle of one
    expect(blinker.weightAt(starts[3] + BLINK.close + BLINK.hold / 2)).toBe(1)
    // asking about an earlier time later still gives the right answer
    expect(blinker.weightAt(starts[0] + 0.06)).toBe(1)
    expect(createBlinker(7).starts[0]).toBe(starts[0])
  })

  it('B2-T3: breathing is a slow, small wave: one breath every 4 s', () => {
    expect(breath(0)).toBeCloseTo(0, 9)
    expect(breath(BREATH_SECONDS / 4)).toBeCloseTo(1, 9) // fully in
    expect(breath((3 * BREATH_SECONDS) / 4)).toBeCloseTo(-1, 9) // fully out
    expect(breath(1.3 + BREATH_SECONDS)).toBeCloseTo(breath(1.3), 9) // repeats
    // the body tips by under 2° even at a full breath
    for (const angle of Object.values(BREATH_SWAY)) expect(angle).toBeLessThan((2 * Math.PI) / 180)
  })

  it('B2-T4: arms come down symmetrically, and VRM 0 and VRM 1 avatars end up the same way', () => {
    const angle = (pose: ReturnType<typeof restingArms>, bone: string) => pose.find(([b]) => b === bone)![2]
    for (const version of ['0', '1'] as const) {
      const pose = restingArms(version)
      expect(angle(pose, 'leftUpperArm')).toBe(-angle(pose, 'rightUpperArm'))
      expect(angle(pose, 'leftLowerArm')).toBe(-angle(pose, 'rightLowerArm'))
    }
    // VRM 0 flips the z-turn of the upper arms (it was built facing the other way)
    expect(angle(restingArms('0'), 'leftUpperArm')).toBe(-angle(restingArms('1'), 'leftUpperArm'))
  })

  it.each(ROOM_SHAPES)('B2-T5: in the $label room the avatar starts on a floor tile', (shape) => {
    const plan = parseRoom(shape.rows)
    const tile = spawnTile(plan)
    expect(isFloor(plan, tile.col, tile.row)).toBe(true)
  })

  it('B2-T5b: the start tile is the middle of the floor, a touch towards the camera on a tie', () => {
    expect(spawnTile(parseRoom(findShape('square').rows))).toEqual({ col: 4, row: 4 })
    expect(spawnTile(parseRoom(findShape('rectangle').rows))).toEqual({ col: 6, row: 4 })
    // the L's middle is pulled back-left, towards where most of its floor is
    expect(spawnTile(parseRoom(findShape('lshape').rows))).toEqual({ col: 5, row: 4 })
  })

  it('B2-T6: the avatar file is a VRM and fits the phone budget (under 15 MB)', () => {
    expect(file.toString('ascii', 0, 4)).toBe('glTF')
    expect(file.length).toBeLessThanOrEqual(AVATAR.maxBytes)
    const json = glbJson(file)
    expect(json.extensionsUsed).toContain('VRM')
    expect(json.extensions.VRM.meta.texture).toBeUndefined() // thumbnail stripped
  })

  it('B2-T7: the file’s own licence lets anyone use, change and share it, commercially too', () => {
    const meta = glbJson(file).extensions.VRM.meta
    expect(meta.author).toBe('VRoidプロジェクト') // the VRoid Project, pixiv
    expect(meta.allowedUserName).toBe('Everyone')
    expect(meta.commercialUssageName).toBe('Allow') // (the VRM 0 spec spells it "Ussage")
    const terms = new URL(meta.otherLicenseUrl).searchParams
    expect(terms.get('modification')).toBe('allow') // we removed the thumbnail
    expect(terms.get('redistribution')).toBe('allow') // the file is in a public repo
    expect(terms.get('credit')).toBe('unnecessary')
  })

  it('B2-T8: the avatar is human-sized next to the walls, feet on the floor', () => {
    const json = glbJson(file)
    const bones: { bone: string; node: number }[] = json.extensions.VRM.humanoid.humanBones
    const parentOf = new Map<number, number>()
    json.nodes.forEach((node: { children?: number[] }, i: number) => node.children?.forEach((c) => parentOf.set(c, i)))
    // world height of a bone: multiply the transforms from the root down to it
    const heightOf = (boneName: string) => {
      let index: number | undefined = bones.find((b) => b.bone === boneName)!.node
      const world = new Matrix4()
      while (index !== undefined) {
        const n = json.nodes[index]
        const local = new Matrix4().compose(
          new Vector3(...(n.translation ?? [0, 0, 0])),
          new Quaternion(...(n.rotation ?? [0, 0, 0, 1])),
          new Vector3(...(n.scale ?? [1, 1, 1])),
        )
        world.premultiply(local)
        index = parentOf.get(index)
      }
      return new Vector3().setFromMatrixPosition(world).y
    }
    const head = heightOf('head')
    expect(head).toBeGreaterThan(1.1) // a person's head, not a doll's
    expect(head).toBeLessThan(1.8)
    expect(head).toBeLessThan(STAGE.height - 0.5) // plenty of room under the 2.6 m ceiling line
    expect(heightOf('leftFoot')).toBeLessThan(0.2)
    expect(heightOf('leftFoot')).toBeGreaterThan(0)
  })

  it('B2-T9: the loading note counts up in 5 % steps and says clearly when it failed', () => {
    expect(percentOf(0, 1000)).toBe(0)
    expect(percentOf(449, 1000)).toBe(40)
    expect(percentOf(450, 1000)).toBe(45)
    expect(percentOf(1000, 1000)).toBe(100)
    expect(percentOf(500, 0)).toBeNull() // server didn't say the size
    expect(statusText({ kind: 'loading', percent: 45 })).toBe('Loading avatar… 45%')
    expect(statusText({ kind: 'loading', percent: null })).toBe('Loading avatar…')
    expect(statusText({ kind: 'loading', percent: 100 })).toBe('Getting avatar ready…')
    expect(statusText({ kind: 'error' })).toBe('Couldn’t load the avatar.')
    expect(statusText({ kind: 'ready' })).toBe('')
  })
})
