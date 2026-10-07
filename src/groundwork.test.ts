import { describe, expect, it } from 'vitest'
import { PALETTE } from './theme/palette'
import { APP_NAME, WORDMARK_PARTS } from './brand/brand'
import { contrastRatio, isHex } from './lib/color'
import { DISTANCE, ORBIT, TARGET, startPosition } from './scene/cameraRig'

describe('Block 0: groundwork', () => {
  it('B0-T1: every palette colour is a valid 6-digit hex', () => {
    for (const [name, hex] of Object.entries(PALETTE)) {
      expect(isHex(hex), `${name} = ${hex}`).toBe(true)
    }
  })

  it('B0-T2: the wordmark parts spell exactly "adulthingz"', () => {
    expect(APP_NAME).toBe('adulthingz')
    expect(WORDMARK_PARTS.map((part) => part.text).join('')).toBe(APP_NAME)
  })

  it('B0-T3: adul, thing and z each have their own palette colour', () => {
    const colors = WORDMARK_PARTS.map((part) => part.color)
    expect(colors).toHaveLength(3)
    expect(new Set(colors).size).toBe(3) // no two parts share a colour
    for (const color of colors) expect(PALETTE).toHaveProperty(color)
  })

  it.each(WORDMARK_PARTS)('B0-T4: "$text" is readable on paper (at least 4.5:1)', ({ color }) => {
    expect(contrastRatio(PALETTE[color], PALETTE.paper)).toBeGreaterThanOrEqual(4.5)
  })

  it('B0-T5: orbit limits keep the camera above the floor', () => {
    // polar π/2 is level with the floor; the limit must stop before it
    expect(ORBIT.maxPolar).toBeLessThan(Math.PI / 2)
    // lowest the camera can get: tilted fully down, zoomed fully in, still above y = 0
    const lowest = TARGET.y + DISTANCE.min * Math.cos(ORBIT.maxPolar)
    expect(lowest).toBeGreaterThan(0)
  })

  it.each([0.45, 0.75, 1, 1.6, 2.4])('B0-T6: start view for screen shape %f sits inside the limits', (aspect) => {
    const p = startPosition(aspect)
    const dx = p.x - TARGET.x
    const dy = p.y - TARGET.y
    const dz = p.z - TARGET.z
    const distance = Math.hypot(dx, dy, dz)
    const polar = Math.acos(dy / distance)
    const azimuth = Math.atan2(dx, dz)

    expect(p.y).toBeGreaterThan(0)
    expect(distance).toBeGreaterThanOrEqual(DISTANCE.min)
    expect(distance).toBeLessThanOrEqual(DISTANCE.max)
    expect(polar).toBeGreaterThanOrEqual(ORBIT.minPolar)
    expect(polar).toBeLessThanOrEqual(ORBIT.maxPolar)
    expect(azimuth).toBeGreaterThanOrEqual(ORBIT.minAzimuth)
    expect(azimuth).toBeLessThanOrEqual(ORBIT.maxAzimuth)
  })
})
