# adulthingz: build guide

A room simulation for your anime avatar: Gen Z doing adult things, one thing at a time. You pick the
shape of an empty room, your avatar appears in it, and you tap the floor to walk around. Later
versions fill the room with stuff to do.

**The name:** *adult* + *things* share their **t**, and the **z** is for Gen Z: adul·**thing**·**z**.
The wordmark gives each part its own colour, with the weight on **thing** and **z**.

**Stack:** Vite + React + TypeScript, `three`, `@react-three/fiber`, `@react-three/drei`, the same as
Pastel Bean and Amygo. New in this project: `@pixiv/three-vrm` for the avatar (added in Block 2).
**Tests:** Vitest. It shares Vite's config, so there's no second build setup.
**Devices:** Android phone + desktop. Must run on a laptop with no graphics card.
**Dev server:** `adulthingz` in the workspace `.claude/launch.json`, port **3014**.
**Repo:** https://github.com/avangardewashere/adulthingz (public, branch `main`). GitHub runs the tests
and a build on every push (`.github/workflows/ci.yml`).

## Rules (the guide format)

1. Exactly 3 features per version.
2. Each feature is its own block.
3. Each block has a test phase (`npm test` green) that must pass before the next block.
4. Ask before starting the next block.
5. Each block ends with a 1 to 3 sentence summary.

---

## Decisions

| # | Decision | Status |
| - | -------- | ------ |
| D1 | Room first, avatar imported. Customising the avatar comes later as a version, not a separate project | ✅ taken: you started Block 0 of this plan |
| D2 | Avatar source: your own avatar from VRoid Studio, or a CC0 VRoid sample (AvatarSample D–G) as a stand-in until yours is ready | 🟡 needed before Block 2 |
| D3 | Look: light "paper" backdrop, ink text, grape + bubblegum accents; wordmark font Bricolage Grotesque | ✅ Block 0 (change any colour in `src/theme/palette.ts`) |
| D4 | View: dollhouse. The camera looks in from the front-right and turns within limits; no first-person walking | 🟡 recommended for Block 1 |
| D5 | A room is a set of 0.5 m floor tiles. Walls go wherever a tile has no neighbour, so every shape uses the same code | 🟡 recommended for Block 1 |
| D6 | Walk animation: Mixamo clips converted for VRM, pixiv's `.vrma` clips, or a simple walk made in code | 🟡 decide at Block 3 |

---

## The palette

All colours live in `src/theme/palette.ts`. The page reads them as CSS variables (`--ink`, `--grape`…),
set from that file when the app starts, so there is only one list to change.

| Token       | Hex       | Used for                                              |
| ----------- | --------- | ----------------------------------------------------- |
| `paper`     | `#FAF6F0` | page backdrop, light text on dark                     |
| `ink`       | `#1E1A2B` | text, the **adul** in the wordmark                    |
| `grape`     | `#6A3DE8` | the **thing** in the wordmark, main accent            |
| `bubblegum` | `#C92A6B` | the **z** in the wordmark, second accent              |
| `lilac`     | `#E6DEFA` | backdrop gradient, soft panels                        |
| `oat`       | `#E8DCCB` | placeholder floor (Block 1 brings real room colours)  |

Every wordmark colour must reach 4.5:1 contrast on `paper`, the bar for normal-size text, so the same
colours stay usable for small labels later.

---

## Block 0: Groundwork (not a feature, needs its own yes) ✅ yes given

- Scaffold `adulthingz/` by hand from the Pastel Bean setup (Vite + React + TS), install three, fiber
  and drei, and add Vitest.
- `palette.ts` with the tokens above, applied to the page as CSS variables.
- The **wordmark**: `adul` (ink, lighter weight), `thing` (grape, heavy), `z` (bubblegum, heavy, tipped
  a little). The parts live in `src/brand/brand.ts`, so the name can't drift between the page and the
  tests.
- A **stage**: a flat 6 × 6 m placeholder floor with a 0.5 m tile grid, soft light and one shadow map,
  so we can see the camera working. Block 1 replaces the placeholder with real rooms.
- A camera that fits the stage on any screen shape (wide desktop or tall phone), with orbit limits so
  you can't go under the floor.
- `git init`, line endings kept LF (`.gitattributes`), CI workflow, first commit, push to GitHub.
  Launch config on port 3014.

**Tests**
- B0-T1: every palette token is a valid 6-digit hex.
- B0-T2: the wordmark parts join to exactly `adulthingz`.
- B0-T3: the three parts use three different palette colours.
- B0-T4: every wordmark colour has at least 4.5:1 contrast on `paper`.
- B0-T5: the orbit limits keep the camera above the floor.
- B0-T6: the starting view sits inside the limits for every screen shape, from a tall phone (0.45) to a
  wide monitor (2.4).

**Summary (done 2026-10-07):** The project runs on Vite + React + three.js and shows the adul·thing·z
wordmark in ink, grape and bubblegum over a 6 × 6 m placeholder stage, with a camera that fits both a
desktop and a tall phone. All 6 tests (12 runs) pass, and planted bugs proved the wordmark tests catch a
misspelt name, a shared colour and a pink too pale to read. The code is on GitHub, where CI runs the tests
and a build on every push.

---

## v1: Your room, your avatar

### Block 1: Room shapes
- A room is written as rows of tiles (`#` = floor, `.` = nothing), turned into floor tiles and walls.
  Walls go up on every tile edge that has no floor next to it. The two walls nearest the camera stay
  low so you can see in (dollhouse).
- A picker with three shapes to start: **Square** (4 × 4 m), **Rectangle** (6 × 4 m), **L-shape**
  (6 × 5 m with a corner cut out). Switching rebuilds the room.
- The camera re-fits to the room you picked.

**Tests:** every shape is one connected piece; a wall exists exactly where a floor edge has no
neighbour (a square's wall count = its perimeter in tiles); every shape fits inside the 6 × 6 m
stage; the L-shape has exactly one inside corner.

### Block 2: The avatar arrives
- Add `@pixiv/three-vrm`. Load the avatar (`public/avatars/*.vrm`, decision D2) and stand it in the
  room, facing the camera, at real-world scale next to the 2.6 m walls.
- Idle life: arms relaxed down (VRoid exports in a T-pose), gentle breathing, a blink every few seconds.
- A small "loading avatar…" note, and a clear message if the file fails to load.

**Tests:** blink timing (closes and opens within ~0.15 s, waits 2–6 s between blinks); the spawn
tile is a floor tile in every room shape; the avatar file stays under the phone size budget
(set when we see the real file, aim ≤ 15 MB).

### Block 3: Tap to walk
- Tap a floor tile: a small ring marks the spot and the avatar walks there on the shortest path
  over floor tiles, going around the L's corner instead of through the wall. It turns to face where
  it's going, and blends from idle to walk and back (decision D6).
- A drag to turn the camera must not count as a tap (moved less than ~6 px = tap).

**Tests:** the path only uses floor tiles; it never cuts the L's inside corner; it's the shortest
length on simple rooms; a tile you can't reach gives no path; the tap-vs-drag rule.

---

## Later versions (sketches, re-planned when they start)

- **v2: Adult things.** Furniture (bed, desk, kitchenette) and the first three things to do: each one
  a short avatar action in the room.
- **v3: Make it yours.** Recolour hair, eyes and outfit, switch between a few avatars, pick room colours.

## Backlog

- Remember the chosen room shape after a reload.
- More shapes: T, U, or draw your own on the tile grid.
- Dark mode.
