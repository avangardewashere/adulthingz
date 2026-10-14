import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CanvasTexture, SpriteMaterial, type Group, type Sprite } from 'three'
import { PALETTE } from '../theme/palette'
import { sleepZs, steamPuffs } from './thingPoses'
import { thingNow } from './thingStore'

// Small pictures drawn once on a canvas and used as always-face-the-camera sprites
function canvasTexture(draw: (ctx: CanvasRenderingContext2D, size: number) => void) {
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  draw(canvas.getContext('2d')!, size)
  return new CanvasTexture(canvas)
}

let zTexture: CanvasTexture | null = null
let puffTexture: CanvasTexture | null = null

// Three "z"s floating up from the avatar's face while it sleeps. Lives inside the avatar's body
// group, where local +z is the face direction, so lying down they rise towards the ceiling.
export function SleepZs() {
  zTexture ??= canvasTexture((ctx, size) => {
    ctx.fillStyle = PALETTE.grape
    ctx.font = `800 ${size * 0.8}px "Bricolage Grotesque Variable", system-ui, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('z', size / 2, size / 2)
  })
  const materials = useMemo(() => [0, 1, 2].map(() => new SpriteMaterial({ map: zTexture, transparent: true, depthWrite: false })), [])
  const sprites = useRef<(Sprite | null)[]>([])

  useFrame(({ clock }) => {
    const asleep = thingNow.thing === 'sleep' ? Math.max(0, (thingNow.weight - 0.8) / 0.2) : 0
    sleepZs(clock.elapsedTime).forEach((z, i) => {
      const sprite = sprites.current[i]
      if (!sprite) return
      sprite.visible = asleep > 0
      sprite.position.set(0.12 * i - 0.12, 1.35, 0.3 + z.rise)
      sprite.scale.setScalar(z.size)
      materials[i].opacity = z.opacity * asleep
    })
  })

  return (
    <>
      {materials.map((material, i) => (
        <sprite key={i} ref={(s) => void (sprites.current[i] = s)} material={material} visible={false} />
      ))}
    </>
  )
}

// Soft steam rising from the pot while cooking
export function PotSteam({ position }: { position: [number, number, number] }) {
  puffTexture ??= canvasTexture((ctx, size) => {
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
    g.addColorStop(0, 'rgba(255,255,255,0.9)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, size, size)
  })
  const materials = useMemo(() => [0, 1, 2, 3].map(() => new SpriteMaterial({ map: puffTexture, transparent: true, depthWrite: false })), [])
  const group = useRef<Group>(null!)

  useFrame(({ clock }) => {
    const cooking = thingNow.thing === 'cook' ? thingNow.weight : 0
    group.current.visible = cooking > 0
    steamPuffs(clock.elapsedTime).forEach((puff, i) => {
      const sprite = group.current.children[i] as Sprite
      sprite.position.set(puff.drift, 0.08 + puff.rise, 0)
      sprite.scale.setScalar(puff.size)
      materials[i].opacity = puff.opacity * cooking
    })
  })

  return (
    <group ref={group} position={position} visible={false}>
      {materials.map((material, i) => (
        <sprite key={i} material={material} />
      ))}
    </group>
  )
}
