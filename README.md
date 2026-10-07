<p align="center"><img src="docs/wordmark.svg" alt="adulthingz" width="440" /></p>

<p align="center">A room simulation for your anime avatar: Gen Z doing adult things, one thing at a time.</p>

*adult* + *things* share their **t**, and the **z** is for Gen Z.

## Status

**v1 Block 1 (room shapes) done:** pick a square, rectangle or L-shaped room; walls build themselves
from a tile grid, with the camera-side walls cut low so you can look in. Next: your avatar arrives
(Block 2), then tap to walk (Block 3).
The full build guide is in [docs/PLAN.md](docs/PLAN.md).

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # Vitest, runs in Node
npm run build    # type-check + production build into dist/
npm run phone    # build, then serve on your Wi-Fi so a phone can open it
```

## Built with

Vite, React, TypeScript, three.js with `@react-three/fiber` and `@react-three/drei`, Vitest.
The avatar (from v1 Block 2) loads as a VRM file through `@pixiv/three-vrm`.
