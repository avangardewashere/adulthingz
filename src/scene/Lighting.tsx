import { STAGE } from './stageSize'

// Shadow camera only needs to cover the stage (plus a little), so the one shadow map stays sharp
const SHADOW_REACH = Math.max(STAGE.width, STAGE.depth) / 2 + 1

// Soft light. The laptop has no graphics card, so: two cheap lights and ONE shadow map.
// Lights stay near-white: a tinted light multiplies into every colour and greys them out.
export function Lighting() {
  return (
    <>
      {/* Lights every surface equally, so nothing goes fully dark */}
      <ambientLight color="#FFFFFF" intensity={1.6} />

      {/* "Sun" from the front-right, the only light that casts shadows (the avatar's, from Block 2) */}
      <directionalLight
        color="#FFFFFF"
        intensity={1.4}
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
