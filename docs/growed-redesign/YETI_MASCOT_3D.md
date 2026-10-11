# 3D yeti mascot (Prahit Yeti V4.2)

The Login and Signup pages show the finished Blender character as a live,
interactive WebGL mascot. It replaces the layered 2D yeti (`AuthMascot`),
whose files are left in place but no longer rendered.

## Assets

Copied unchanged from the Blender production delivery
(`…/prahit_production/`, treated as read-only). The `.blend` master is not
used by the web app.

| Public URL                                      |                                                            Triangles |     Bytes | SHA-256                                                            |
| ----------------------------------------------- | -------------------------------------------------------------------: | --------: | ------------------------------------------------------------------ |
| `/mascot/yeti-v4.2/prahit_mascot_web.glb`       |                                                              305,038 | 4,250,776 | `57b1cb8714e8757c9f56b9758e93295cdd08723926b41840908a583c60e009ea` |
| `/mascot/yeti-v4.2/prahit_mascot_web_light.glb` |                                                              205,386 | 3,595,252 | `0c6b9c0fa93b27d370e945187bc76e5a267cf6327864057d83e8a0789218f7bb` |
| `/mascot/draco-r186/`                           | Draco decoder from `three/examples/jsm/libs/draco/gltf` (three r186) |           |                                                                    |

Both GLBs require `KHR_draco_mesh_compression` and carry the clips Idle (4 s),
Blink (1 s), Look (2 s) and Wave (4 s). Folders are versioned so Nginx can
cache them for a year: when a file changes, copy it into a new folder
(`yeti-v4.3`, `draco-r19x`) and update `yetiConfig.js`.

The posters (`src/shared/assets/yeti-mascot/yeti-rest*.webp`, 1000 × 788)
are renders of the rest pose from this exact renderer, camera and lighting
(eyes open and closed). Regenerate them if the framing or lighting changes
(development build, `?yeti-debug`, then
`__prahitYeti.snapshot({ width: 1000, closed })`).

## Code

`apps/web/src/shared/ui/yeti-mascot/` (reusable; any layer may import it):

| File               | Role                                                                       |
| ------------------ | -------------------------------------------------------------------------- |
| `YetiMascot.jsx`   | React component: poster, lazy scene, lifecycle, fallbacks, listeners       |
| `yetiScene.js`     | Renderer, camera framing, lighting, render loop, GPU cleanup (lazy chunk)  |
| `yetiAnimation.js` | Mixer, clip scheduling, gaze and privacy composition                       |
| `pointerFollow.js` | The production viewer's gaze model (`pointer_follow.mjs`), value for value |
| `yetiAssets.js`    | GLB parsing, shared cache, clip preparation (lazy chunk)                   |
| `yetiPrefetch.js`  | Starts the GLB download alongside the scene chunk                          |
| `yetiQuality.js`   | Standard / light / poster decision, WebGL probe                            |
| `yetiConfig.js`    | Asset URLs, stage aspect, fade time                                        |

Usage: `<YetiMascot className="…" eyesClosed={bool} greet quality="auto" />`,
plus `greet="session"` (once per browser session on the page), `lean`
(slight upper-body lean toward the pointer), `interactive` (a click or tap
waves) and `priority` (above-the-fold poster). The caller positions and
sizes it; it keeps `YETI_ASPECT` (1.27). On the auth pages `AuthScene`
renders it with `.sn-auth-mascot` and passes `eyesClosed` from the
password-privacy context; the homepage hero renders it through
`pages/home/ui/hero/HeroYeti.jsx`.

It follows the existing imperative three.js pattern of the home hero
(`CapsuleStage`): no React Three Fiber or Drei was added.

## Homepage hero

`HeroYeti` replaces the two capsule characters (`CapsuleStage` and its
`capsule*` modules are no longer rendered; they remain in the tree because
they hold uncommitted work). The yeti stands on the grass inside a round
window of the auth pages' sky (`AuthSky` clouds, the same ledge image), so
its white coat reads against the white page; its crest and waving hand may
cross the window's edge. It greets once per browser session, leans slightly
toward the pointer (Body_CTRL yaw ≤ 0.05 rad, roll ≤ 0.012 rad, lagging the
head), and waves again when clicked or tapped. Desktop: beside the copy,
bleeding toward the viewport edge on wide screens, vertically centred with
it; tablet and phone: above the headline. Styles: `homeHero.css`
(`.sn-hero-yeti-*`). Guarded by `e2e/home-hero.spec.js`.

All pages share one model cache, so moving between Home and Login downloads
each quality at most once.

## Auth page layout

`AuthScene` receives `form="login" | "signup"` (`data-form`). On desktop the
sky panel's height follows the form beside it; when it is taller than the
composition needs (the sign-up form), `--ground-rise` raises the grass ledge
and fills below it with the ledge's front-slope colour, so the yeti keeps the
sign-in page's proportion of sky above it (~18%). Sign-up uses a tighter
vertical rhythm (`[data-form="signup"]` rules in `authScene.css`; type sizes,
agreement wording and 44px fields unchanged, 42px on short desktop
viewports). Page and panel padding follow the viewport height, and the card's
minimum height gives way on short screens. Measured browser viewports: sign-up
fits without scrolling at 1920×950, 1512×870 and 1470×846 (sign-in at every
size down to 1366×650); shorter screens scroll gently. Guarded by the layout
test in `e2e/auth-mascot.spec.js`.

## Behaviour

- **Loading.** The poster shows immediately and reserves the space (CLS
  0.003). The scene chunk and GLB load when the page is idle; the canvas
  fades in over the poster, which is removed after the fade. Revisits reuse
  the parsed model (one download per session; dropped a minute after the
  last mascot unmounts).
- **Idle.** Breathing and a slight head sway, looping. The clip's own blinks
  (fixed at 1.5 s and 3.3 s every loop) are removed.
- **Blink.** Trimmed to the 0.2 s closure and scheduled every 2.8–6.4 s,
  one in eight a double blink; a sudden large gaze change also blinks.
- **Wave.** Once per mount on the auth pages (once per session on the
  homepage), 0.62 s after the scene appears; never again after a
  context-loss rebuild. While the arm is up the head tilts toward the hand
  (≤ 0.07 rad) and the weight shifts slightly, easing with the clip's own
  raise and lowering; a blink follows as it settles.
- **Look.** An ambient glance when the pointer has been still for ~4 s (or on
  touch devices), every 8–15 s; it fades out as soon as the pointer moves.
- **Pointer.** Window-level `pointermove` (touch ignored), stored and applied
  per frame. The target is the direction from the eyes' rest midpoint (a
  projected, stable anchor) to the pointer, saturating smoothly with distance
  (`tanh`, reach 0.75 × stage width). Eyes follow at rate 12/s, the head at
  5/s, bounded to eye yaw 0.17 / pitch 0.075 and head yaw 0.14 / pitch 0.08 /
  roll 0.008 rad. A pointer at rest for 1.2 s, leaving the page, window blur
  or a hidden tab returns the gaze to exact neutral.
- **Privacy.** While a password field is focused or revealed the eyes close
  (blink morphs) and the head dips slightly; reopening waits 180 ms.
- **Composition.** The clips drive disjoint channels; the gaze is multiplied
  onto the head/eye rotations and privacy is `max()`ed with the blink
  weights after the mixer runs. Runtime channels are reset to rest every
  frame, so nothing accumulates.

## Rendering

Khronos PBR Neutral tone mapping (exposure 1.25) with the production
viewer's light rig: RoomEnvironment (0.6), hemisphere (1.6) and key / fill /
rim directional lights. The viewer's AgX rendered the coat grey against the
sky panel; see `screenshots/yeti-3d-lighting-agx-vs-neutral.png`. No
shadows or post-processing; MSAA; pixel ratio ≤ 2, lowered in 0.25 steps
(not below 1) if the median frame exceeds 26 ms. High-refresh displays render at most about every 10 ms (60 renders/s on 120 Hz, verified). Rendering pauses when the
stage is off-screen or the tab is hidden.

Quality: the light model when the stage has fewer than 560 device pixels
across (phones' banner layout), or the device reports ≤ 4 GB memory or ≤ 4
cores; otherwise standard. Save-Data and `?yeti=static` keep the poster;
`?yeti=standard|light` forces a model for review.

## Fallbacks

The poster stays (and the form is unaffected) for: reduced motion, Save-Data,
no hardware-accelerated WebGL (`failIfMajorPerformanceCaveat`), a missing or
corrupt GLB or decoder, and any scene error. A lost WebGL context shows the
poster at once and rebuilds once with a fresh canvas; a second loss keeps the
poster. Without WebGL the eyes-closed poster still follows password privacy.

## Production configuration

`apps/web/nginx.conf`:

- `location ^~ /mascot/` — real 404s (never the SPA's `index.html`) and
  `expires 1y`.
- CSP `script-src 'wasm-unsafe-eval'` — lets the Draco decoder compile
  WebAssembly (no JavaScript `eval`). Without it the JS decoder is used
  automatically (≈1.3 s instead of ≈0.7 s to live locally).
- CSP `connect-src blob:` — GLTFLoader reads the GLB's embedded coat normal
  map through a page-created `blob:` URL; without it the texture is dropped.

## Memory

On unmount the instance's geometry, materials and textures are disposed
(GPU copies only; the cached data stays), then the renderer, then
`forceContextLoss()`. Textures bound only through program uniforms are
disposed too: three.js r186 shares one module-level DFG LUT texture across
renderers and never detaches a disposed renderer's listener from it, which
had kept every visited page's WebGL context and canvas alive (found with a
heap snapshot; regression test in `yetiScene.test.js`). Verified: one WebGL
context after 60 Login/Signup visits.

The home hero's `capsuleScene.js` uses physical materials and the same
renderer-disposal pattern, so it is likely affected by the same three.js
behaviour; it was not changed here.

## Tests

- Unit (Vitest, in CI): `src/shared/ui/yeti-mascot/*.test.*`,
  `src/shared/ui/auth-scene/AuthScene.test.jsx`.
- Browser: `e2e/auth-mascot.spec.js`, run with the local UI suite:
  `npx playwright test --config playwright.ui.config.mjs --project ui-desktop --project ui-mobile --project ui-tablet e2e/auth-mascot.spec.js`.
  Bundled headless Chromium has no GPU, so this exercises the poster path;
  the same spec passes on GPU-backed Chrome (`channel: "chrome"`) and
  WebKit, where the scene renders live.

## Known limits

- Physical-device frame rates are unmeasured; desktop figures come from an
  Apple M5 (60 Hz, 16.7 ms median frames at DPR 2, standard model).
- Firefox was not tested (not installed); Chrome and WebKit were.
- The web coat is the optimised fibre export, sparser than the native groom
  in the premium renders.
- The rig has no finger articulation; Wave moves arm, forearm and hand.
