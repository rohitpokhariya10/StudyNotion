# Auth mascot artwork source

Layered artwork for the login and sign-up pages (`apps/web/src/shared/ui/auth-scene`). Everything is generated here. Nothing comes from the reference image or a third-party asset. From the repository root:

```sh
node docs/growed-redesign/artwork/auth-mascot/generate-auth-mascot.mjs export   # writes the app assets
node docs/growed-redesign/artwork/auth-mascot/generate-auth-mascot.mjs preview [dir]   # composites only
```

The generator renders offline in headless Chromium (WebGL via three.js). three.js is not used by the auth pages at runtime.

- `creature.js` builds the creature. It has ellipsoid/capsule body parts; a smooth-blended face (core, muzzle, cheeks); large, slightly protruding eyeballs; small round ears; and rounded mitten hands and feet. The gentle open smile is a decal projected onto the face surface. About 240k instanced fur strands use clumped tufts, droop and Kajiya-Kay shading, with occlusion taken from neighbouring parts and from the strands themselves.
- `ground.js` builds the grassy ledge: a mound, about 200k grass blades and a contact shadow. Blades nearer than the feet go to a separate foreground layer.
- `sky.js` renders the volumetric cumulus clouds (ray-marched noise with sun self-shadowing) over a sky gradient.
- `render.js` holds the off-axis frame camera, 2× supersampled multisample rendering, alpha readback and crop helpers.
- `main.js` defines the layer export and the compositions for the panel and page skies.

## Output

All output goes to `apps/web/src/shared/assets/auth-scene/`:

| File               | Content                                                                                                                                                                                                                                                                            |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sky-page.webp`    | Page background (2400×1500)                                                                                                                                                                                                                                                        |
| `sky-panel.webp`   | Illustration panel background                                                                                                                                                                                                                                                      |
| `ledge.webp`       | Grass and mound behind the creature (wider than the frame, so it can bleed)                                                                                                                                                                                                        |
| `body.webp`        | Torso, arms, legs, blue hands and feet                                                                                                                                                                                                                                             |
| `head.webp`        | Head fur, blue face, ears, nose, mouth and the white of the eyes. No pupils or lids are baked in.                                                                                                                                                                                  |
| `grass-front.webp` | Blades in front of the feet                                                                                                                                                                                                                                                        |
| `auth-mascot.json` | Frame size, layer boxes, eye ellipses fitted from a mask render (white pixels only; the mouth is hidden for that pass), lid colours sampled from the face around each eye (`skin` clear of the socket for the lid centre, `rim` at the eye for its edge), and the head/body pivots |

The page draws the pupils, highlights and both eyelids as SVG from `auth-mascot.json`, and moves the head and body layers with CSS transforms. To change the art, edit the generator and re-export; don't edit the WebP files by hand. Re-exporting refits the eyes, so the SVG stays aligned automatically.
