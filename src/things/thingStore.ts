import type { ThingKind } from './things'

// What the avatar is doing right now, for the parts of the scene that react to it: the lights
// dim for sleep, the chair slides out for the desk, the pot steams while cooking.
// AvatarModel writes it every frame; the others read it in their own frame loops, so nothing
// re-renders through React 60 times a second.
export const thingNow: { thing: ThingKind | null; weight: number } = { thing: null, weight: 0 }
