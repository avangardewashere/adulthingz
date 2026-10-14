import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { AmbientLight, DirectionalLight } from 'three'
import { STAGE } from './stageSize'
import { DAY, lightsFor, nightLevel } from '../things/thingPoses'
import { thingNow } from '../things/thingStore'

// Shadow camera only needs to cover the stage (plus a little), so the one shadow map stays sharp
const SHADOW_REACH = Math.max(STAGE.width, STAGE.depth) / 2 + 1

// Soft light. The laptop has no graphics card, so: two cheap lights and ONE shadow map.
// Lights stay near-white: a tinted light multiplies into every colour and greys them out.
// While the avatar sleeps the room dims like night, and the page's backdrop with it.
export function Lighting() {
  const ambient = useRef<AmbientLight>(null!)
  const sun = useRef<DirectionalLight>(null!)
  const shown = useRef(-1)

  useFrame(() => {
    const night = nightLevel(thingNow.thing, thingNow.weight)
    const lights = lightsFor(night)
    ambient.current.intensity = lights.ambient
    sun.current.intensity = lights.sun
    // the backdrop behind the 3D view is plain HTML: hand it the same level as a CSS variable
    // (only when it changes, so the page isn't restyled every frame)
    const rounded = Math.round(night * 100) / 100
    if (rounded !== shown.current) {
      shown.current = rounded
      document.documentElement.style.setProperty('--night', String(rounded))
    }
  })

  return (
    <>
      {/* Lights every surface equally, so nothing goes fully dark */}
      <ambientLight ref={ambient} color="#FFFFFF" intensity={DAY.ambient} />

      {/* "Sun" from the front-right, the only light that casts shadows */}
      <directionalLight
        ref={sun}
        color="#FFFFFF"
        intensity={DAY.sun}
        position={[4, 8, 5]}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0005}
        shadow-camera-left={-SHADOW_REACH}
        shadow-camera-right={SHADOW_REACH}
        shadow-camera-top={SHADOW_REACH}
        shadow-camera-bottom={-SHADOW_REACH}
      />
    </>
  )
}
