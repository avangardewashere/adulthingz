import type { PaletteName } from '../theme/palette'

export const APP_NAME = 'adulthingz'

// "adult" + "things" share their t, and the z is for Gen Z.
// Each part gets its own colour; "thing" and "z" carry the weight.
// The wordmark component and the tests both read this list, so they can't disagree.
export const WORDMARK_PARTS: readonly { text: string; color: PaletteName; emphasis: boolean }[] = [
  { text: 'adul', color: 'ink', emphasis: false },
  { text: 'thing', color: 'grape', emphasis: true },
  { text: 'z', color: 'bubblegum', emphasis: true },
]
