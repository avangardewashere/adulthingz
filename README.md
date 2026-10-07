<p align="center"><img src="docs/wordmark.svg" alt="adulthingz" width="440" /></p>

<p align="center">A room simulation for your anime avatar: Gen Z doing adult things, one thing at a time.</p>

*adult* + *things* share their **t**, and the **z** is for Gen Z.

## Status

**Block 0 (groundwork) done:** the wordmark, the colour palette, and an empty 3D stage with a camera
that fits any screen. Next is v1: pick a room shape, meet your avatar, tap to walk.
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
