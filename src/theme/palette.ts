// Every colour in the app. Nothing else uses a hex code directly, so the whole look
// can be changed here. main.tsx also copies these onto the page as CSS variables
// (--paper, --ink, ...), so the HTML around the 3D view uses the same list.
export const PALETTE = {
  paper: '#FAF6F0', // page backdrop, light text on dark
  ink: '#1E1A2B', // text, and the "adul" in the wordmark
  grape: '#6A3DE8', // the "thing" in the wordmark, main accent
  bubblegum: '#C92A6B', // the "z" in the wordmark, second accent
  lilac: '#E6DEFA', // backdrop gradient, soft panels
  oat: '#E8DCCB', // placeholder floor (Block 1 brings real room colours)
} as const

export type PaletteName = keyof typeof PALETTE
