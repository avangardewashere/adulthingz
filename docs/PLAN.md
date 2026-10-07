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
| D2 | Avatar source: a CC0 VRoid sample (AvatarSample D–G; A–C are **not** CC0) | ✅ chosen 2026-10-07; which of D–G is picked in Block 2 |
| D3 | Look: light "paper" backdrop, ink text, grape + bubblegum accents; wordmark font Bricolage Grotesque | ✅ Block 0 (change any colour in `src/theme/palette.ts`) |
| D4 | View: dollhouse. The camera looks in from the front-right and turns within limits; no first-person walking | ✅ taken with "go ahead with Block 1" |
| D5 | A room is a set of 0.5 m floor tiles. Walls go wherever a tile has no neighbour, so every shape uses the same code | ✅ taken with "go ahead with Block 1" |
| D6 | Walk animation: a simple walk made in code (no files, fully testable). Mixamo or pixiv `.vrma` clips can replace it later | ✅ chosen 2026-10-07 |

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
| `lilac`     | `#E6DEFA` | backdrop gradient, soft panels, picker hover          |
| `wall`      | `#DCD1F2` | room walls: soft lavender, a step deeper than lilac   |
| `wood`      | `#D7B48E` | floor: light oak                                      |
| `grain`     | `#A57E58` | the faint tile lines on the floor                     |

(Block 0 had an `oat` placeholder floor colour; Block 1 replaced it with `wood`.)

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

### Block 1: Room shapes ✅
- A room is written as rows of tiles (`#` = floor, `.` = nothing), turned into floor tiles and walls.
  Walls go up on every tile edge that has no floor next to it. The two walls nearest the camera stay
  low so you can see in (dollhouse).
- A picker with three shapes to start: **Square** (4 × 4 m), **Rectangle** (6 × 4 m), **L-shape**
  (6 × 5 m with a corner cut out). Switching rebuilds the room.
- The camera re-fits to the room you picked.

**As built:** shapes in `src/room/roomShapes.ts`; all the rules in `src/room/roomLayout.ts` (pure, no
three.js): walls stand *outside* the floor so every tile stays walkable, edges in a line join into one
wall, posts fill the gaps at outside corners, the floor is drawn as the fewest rectangles. The L's
cut-out is at the front-right, so its walls are low and you look into the bend. The picker is real radio
buttons (arrow keys work) with icons drawn from the same rows. Switching rooms keeps the angle you
turned the camera to and only changes the distance. Not saved after a reload (backlog).

**Tests** (`src/room/rooms.test.ts`, 27 runs)
- B1-T1: every shape is one connected piece (and two separate pieces are caught).
- B1-T2: a wall exists exactly where a floor edge has no neighbour; a square has 32 wall edges (its
  perimeter in tiles).
- B1-T3: every shape fits the 6 × 6 m stage and matches the size the picker shows.
- B1-T4: the L-shape has exactly 1 inside corner and 5 outside; square and rectangle have 0 and 4.
- B1-T5: far walls are full height, camera-side walls are low, and all the L's cut-out walls are low.
- B1-T6: joined walls cover every wall edge exactly once; a square has 4 walls, the L-shape 6; a gap
  in a line of wall stays a gap (U-shaped test room); floor blocks cover every tile once; no wall
  stands on a floor tile.
- B1-T7: every room fits the screen within the zoom limits on every screen shape; every outside
  corner of the walls is inside the camera fit; a bigger room puts the camera further back; picking
  another room keeps the camera angle.
- B1-T8: a room drawn wrong (no rows, uneven rows, unknown letter) is refused with a clear message.

Planted bugs caught: the first camera-fit maths (wall tops poked out of the frame on a phone, found in
the browser and now guarded by B1-T7), and walls bridging a gap in a line.

**Summary (done 2026-10-07):** You can pick a square, rectangle or L-shaped room, and the same tile rule
builds each one's floor, walls and corner posts, with the camera-side walls cut low so you can see in.
The camera re-fits to each room but keeps your angle, and the picker works by mouse, touch and keyboard.
39 tests pass, including two that caught real or planted bugs in the camera fit and the wall joining.

### Block 2: The avatar arrives ✅
- Add `@pixiv/three-vrm`. Load the avatar (`public/avatars/*.vrm`: a CC0 VRoid sample, AvatarSample
  D–G, decision D2; keep its licence note next to the file) and stand it in the room, facing the
  camera, at real-world scale next to the 2.6 m walls.
- Idle life: arms relaxed down (VRoid exports in a T-pose), gentle breathing, a blink every few seconds.
- A small "loading avatar…" note, and a clear message if the file fails to load.

**As built:**
- **The avatar:** β Ver AvatarSample_1 (Sendagaya Shibu), VRoid Project / pixiv, CC0, confirmed on
  VRoid's official page. VRoid Hub needs a pixiv sign-in, so it came from the CC0 re-upload on
  OpenGameArt (`avatarsample_d.zip`); its own licence fields were checked before use. Notes in
  `public/avatars/LICENSE.md`.
- **Size:** the file was 16.1 MB. `scripts/strip-vrm-thumbnail.mjs` removed the 2.5 MB thumbnail
  picture (only avatar-picker apps use it), giving 13.6 MB. The script refuses any file where it
  can't do that safely.
- **Loading:** `src/avatar/avatarStore.ts` loads the file once and reports progress in 5 % steps,
  then "Getting avatar ready…" while it unpacks, an error with **Try again** if it fails, and
  nothing once it's ready. three-vrm is split into its own 184 kB file that only downloads when
  needed, so the room shows first.
- **Placement:** the avatar stands on the floor tile nearest the middle of the floor
  (`src/avatar/placement.ts`), turned to face where the camera starts. Switching rooms moves it to
  the new room's middle.
- **Idle life** (`src/avatar/idle.ts`, used by `AvatarModel.tsx`): arms 69° down with a slight
  forward elbow bend, a 4 s breath (spine and chest tip under 2°), and blinks lasting 0.15 s, 2–6 s
  apart from a seeded random source. Checked in the browser: hands 0.40 m below the shoulders and
  6 cm forward, one full blink in 8 s, chest moving ±0.02 rad.

**Tests** (`src/avatar/avatar.test.ts`, 12 runs)
- B2-T1: a blink closes and opens within 0.15 s, steadily, never jumping back.
- B2-T2: blinks come 2–6 s apart over two minutes, eyes open in between, same seed = same blinks.
- B2-T3: breathing repeats every 4 s and tips the body under 2°.
- B2-T4: the arms come down symmetrically, and VRM 0 and VRM 1 avatars are handled the same way.
- B2-T5: in every room the avatar starts on a floor tile, in the middle (tie → towards the camera).
- B2-T6: the file is a VRM, under 15 MB, thumbnail removed.
- B2-T7: the file's own licence allows anyone to use, change and share it, commercially too.
- B2-T8: the avatar is human-sized (head 1.1–1.8 m, well under the walls), feet on the floor.
- B2-T9: the loading note counts in 5 % steps, says when it's unpacking, and says clearly when it failed.

Planted bugs caught: the original 16 MB file (B2-T6) and a missing tie-break (B2-T5). Also found in
the browser: an empty note meant both "not started" and "ready", so the note now carries
`data-state`.

**Summary (done 2026-10-07):** A CC0 anime avatar now stands in the middle of whichever room you pick,
facing you, with relaxed arms, slow breathing and natural blinks. The file was trimmed from 16.1 to
13.6 MB, its licence was checked inside the file itself, and the page shows loading progress, a clear
error and a Try again button. 51 tests pass, and planted bugs proved the size and placement tests bite.

### Block 3: Tap to walk ✅
- Tap a floor tile: a small ring marks the spot and the avatar walks there on the shortest path
  over floor tiles, going around the L's corner instead of through the wall. It turns to face where
  it's going, and blends from idle to walk and back (decision D6).
- A drag to turn the camera must not count as a tap (moved less than ~6 px = tap).

**As built:**
- **Route** (`src/walk/path.ts`): A* search over tiles, 8 directions, with diagonals allowed only
  when both side tiles are floor. The tile chain is then straightened wherever the avatar's body (a
  0.2 m square from its centre, checked every 2 cm) still fits. Open floor gives one straight walk;
  the L gives a bend around its corner. Taps mid-walk re-plan from where the avatar is.
- **Walker** (`src/walk/walker.ts`): 1.2 m/s, turns at most 9 rad/s the short way round, and
  barely moves while facing the wrong way (no moonwalking). Legs blend in and out over 0.2 s.
- **Walk cycle** (`src/walk/walkCycle.ts`): hips swing ±0.45 rad, knees bend up to 0.75 rad
  mid-swing, arms swing ±0.35 rad against the legs, a small chest twist and a 2 cm dip. Strides are
  1.2 m, so 2 steps a second, and the legs cycle in step with the distance covered.
- **Poses** (`src/avatar/pose.ts`): resting arms, walk and breathing are added bone by bone,
  written once in VRM 1 terms and flipped for VRM 0 avatars in one place.
- **Tapping:** the floor reports the tapped tile (`tileAt`), a press that moved 6 px or more is a
  camera drag, and the cursor turns into a pointer over the floor. A grape ring pulses on the target
  until arrival.
- **Checked in the browser:** arrives exactly on the tapped tile centre; a 40 px drag doesn't walk;
  across the L the avatar stays 0.34 m from the inside corner; a second tap mid-walk wins.

**Tests** (`src/walk/walk.test.ts`, 109 runs)
- B3-T1: a tap point maps to the tile under it; no floor (outside, the L's cut-out) gives no tile.
- B3-T2: a path to every floor tile, on floor only, one neighbour per step, no diagonal past a corner:
  from the start tile in square and rectangle, and from **every** tile in the L-shape.
- B3-T3: tile steps cost exactly the best possible; across open floor the walk is one straight line.
- B3-T4: across the L the walk bends, the body always fits, it keeps 0.2 m from the inside corner,
  and smoothing made it shorter than stepping tile by tile.
- B3-T4b: in every room, every walk from the start tile keeps the body on the floor.
- B3-T5: no way there gives no walk; tapping your own tile, or off the floor, gives no walk.
- B3-T6: the walker covers 1.2 m a second, stops exactly on the end point, reports arrival once,
  settles to standing in 0.2 s, turns first when facing away, never turns faster than 9 rad/s, and
  takes the short way round.
- B3-T7: legs alternate, arms swing against their own leg, knees only bend forward, the stride
  repeats, the knee bends during the forward swing, 1.6–2.2 steps a second. With no walk blended in,
  the result is exactly the resting pose.
- B3-T8: under 6 px is a tap, 6 px or more is a drag.

Planted bugs caught: diagonals cutting corners (B3-T4, and B3-T2 once it checked every tile in the
L; at first it only started from the middle and missed it), and the body's width ignored (B3-T4).

**Summary (done 2026-10-07):** Tap the floor and the avatar walks there on the shortest route that
fits its body, curving around the L's corner, turning to face its way, legs and arms swinging in step.
The whole walk is code, with no animation files, and drags still turn the camera. 160 tests pass,
including every-tile routes in the L-shape and planted bugs that proved the corner rules bite.

**v1 complete:** pick a room shape, meet your avatar, tap to walk.

---

## Later versions (sketches, re-planned when they start)

- **v2: Adult things.** Furniture (bed, desk, kitchenette) and the first three things to do: each one
  a short avatar action in the room.
- **v3: Make it yours.** Recolour hair, eyes and outfit, switch between a few avatars, pick room colours.

## Backlog

- Remember the chosen room shape after a reload.
- More shapes: T, U, or draw your own on the tile grid.
- Dark mode.
- Let the camera zoom closer to the avatar (today it stops about 3.7 m away).
- The avatar's eyes follow the camera (three-vrm `lookAt`).
- Shrink the avatar further for phones: smaller textures (needs a tool that keeps VRM data intact).
- Walk with the keyboard too (arrow keys), so tapping isn't the only way to move.
- Swap the code walk for a recorded walk clip (Mixamo or pixiv `.vrma`) with feet that don't slide.
