// Each pose is one continuous, closed perimeter: beak/head, far wing,
// tapered tail, near wing, neck. Curves meet at shared endpoints. No holes,
// overlapping subpaths, strokes, masks or animation are used for the flock.
export const birdPoses = {
  raised: `M -1 -7
    Q 0 -10 2 -8 L 4 -6 L 1 -5
    Q 4 -2 7 -5 C 14 -12 17 -22 29 -28
    C 26 -18 22 -7 12 0 Q 7 4 2 5
    L 1 14 L -1 11 L -3 13 L -2 5
    Q -7 4 -12 1 C -22 -6 -29 -18 -32 -25
    C -20 -21 -14 -9 -6 -5 Q -3 -3 -2 -6 Z`,
  glide: `M -1 -5
    Q 0 -8 2 -6 L 5 -4 L 2 -3
    Q 5 -1 9 -3 C 19 -7 28 -8 35 -5
    C 26 -4 21 0 12 3 Q 7 4 3 3
    Q 2 7 3 12 L 0 10 L -3 12 Q -2 7 -3 4
    C -10 4 -19 1 -25 -1 Q -31 -3 -36 -2
    C -31 -7 -22 -8 -13 -5 Q -7 -3 -3 -3 Z`,
  lowered: `M -2 -5
    Q -1 -8 1 -6 L 4 -4 L 1 -2
    C 8 -1 15 -2 19 4 C 24 10 25 17 31 21
    C 22 18 19 12 13 9 Q 7 6 2 4
    Q 1 9 2 14 L -1 11 L -4 13 Q -3 8 -4 4
    Q -10 6 -16 10 C -23 15 -28 17 -34 17
    C -26 13 -25 5 -19 1 Q -11 -5 -4 -3 Z`,
  banked: `M 3 -4
    Q 6 -8 9 -6 L 14 -3 L 9 -3 Q 7 0 4 2
    C 12 7 18 11 26 12 C 17 14 9 10 1 7
    Q -3 7 -7 6 L -17 10 L -14 5 L -21 6
    Q -14 2 -7 0 C -16 -5 -22 -15 -27 -24
    C -16 -19 -5 -15 0 -7 Q 1 -5 3 -4 Z`,
}

// Deliberate, deterministic positions; no random rows or accumulating jitter.
// Most spans are 10–16 units in the 1440-unit landscape. Near birds top out
// at 27; all stay above the CTA's highest position in artwork coordinates (y ≈ 186).
// [x, y, width, pose, angle°, mirror, depth]
export const flock = [
  [443, 143, 12, "banked", -14, false, "far"],
  [468, 132, 14, "raised", -22, false, "far"],
  [482, 154, 10, "glide", 12, true, "far"],
  [497, 118, 16, "lowered", -16, false, "mid"],
  [515, 143, 11, "banked", 10, true, "far"],
  [531, 128, 15, "glide", -12, false, "mid"],
  [548, 109, 13, "raised", 16, true, "far"],
  [560, 146, 10, "lowered", -24, false, "far"],
  [573, 123, 17, "banked", 8, false, "mid"],
  [588, 101, 11, "glide", 19, false, "far"],
  [602, 135, 13, "raised", -9, true, "far"],
  [615, 113, 15, "lowered", 12, false, "mid"],
  [631, 88, 12, "banked", -18, true, "far"],
  [645, 131, 10, "glide", -15, false, "far"],
  [657, 105, 14, "raised", 22, false, "mid"],
  [676, 121, 11, "lowered", -10, true, "far"],
  [688, 87, 16, "glide", -18, true, "mid"],
  [708, 112, 10, "banked", 18, false, "far"],
  [725, 90, 14, "lowered", -22, false, "mid"],
  [740, 119, 12, "raised", 7, true, "far"],
  [758, 98, 11, "glide", 14, false, "far"],
  [775, 77, 15, "banked", -18, false, "mid"],
  [567, 72, 20, "raised", 12, true, "mid"],
  [614, 65, 11, "glide", -18, true, "far"],
  [650, 43, 25, "banked", 12, false, "near"],
  [702, 60, 22, "raised", -24, false, "mid"],
  [753, 55, 12, "lowered", 14, true, "far"],
  [803, 57, 21, "glide", -18, false, "mid"],
  [828, 35, 27, "banked", -14, true, "near"],
]
const spans = { raised: 64, glide: 72, lowered: 65, banked: 53 }
const tones = { far: "#315b9c", mid: "#254e92", near: "#1a418d" }

export function renderBirds() {
  return `<g id="footer-birds" fill-rule="nonzero">\n${flock
    .map(([x, y, width, pose, angle, mirror, depth]) => {
      const scale = (width / spans[pose]).toFixed(5)
      const sx = mirror ? `-${scale}` : scale
      const d = birdPoses[pose].replace(/\s+/g, " ").trim()
      return `<path data-pose="${pose}" fill="${tones[depth]}" transform="translate(${x} ${y}) rotate(${angle}) scale(${sx} ${scale})" d="${d}"/>`
    })
    .join("\n")}\n</g>`
}
