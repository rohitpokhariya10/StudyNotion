// Browser module: the small grassy ledge the creature stands on. A rounded
// mound covered in instanced grass blades, with a soft contact shadow under
// the creature. Blades are split by depth so the nearest ones can be drawn in
// front of the feet as a separate layer.
import * as THREE from "three"

import { rng } from "./creature.js"

// Mound: top of an ellipsoid, highest under the creature.
const MOUND = {
  c: new THREE.Vector3(0, -1.32, -0.15),
  r: new THREE.Vector3(4.2, 1.4, 2.25),
}
const groundY = (x, z) => {
  const u = 1 - (x / MOUND.r.x) ** 2 - ((z - MOUND.c.z) / MOUND.r.z) ** 2
  return u <= 0 ? null : MOUND.c.y + MOUND.r.y * Math.sqrt(u)
}

const shared = /* glsl */ `
  const vec3 KEY_DIR = normalize(vec3(-0.72, 0.7, 0.55));
  const vec3 KEY = vec3(1.0, 0.955, 0.89) * 1.25;
  const vec3 SKY = vec3(0.56, 0.69, 0.96) * 0.5;
  vec3 toSrgb(vec3 c) {
    c = max(c, 0.0);
    c = c / (1.0 + 0.06 * c);
    return mix(12.92 * c, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
  }
  // Soft shadow of the creature on the ground (body and both feet).
  float contact(vec3 p) {
    vec2 q = p.xz - vec2(0.05, 0.12);
    float body = exp(-dot(q / vec2(0.95, 0.62), q / vec2(0.95, 0.62)) * 1.6);
    vec2 fr = p.xz - vec2(-0.43, 0.36);
    vec2 fl = p.xz - vec2(0.43, 0.36);
    float feet = exp(-dot(fr / vec2(0.28, 0.32), fr / vec2(0.28, 0.32)) * 2.2) +
                 exp(-dot(fl / vec2(0.28, 0.32), fl / vec2(0.28, 0.32)) * 2.2);
    return 1.0 - clamp(body * 0.5 + feet * 0.42, 0.0, 0.78);
  }
  // Distant ground fades toward the sky haze.
  vec3 haze(vec3 c, vec3 p) {
    float far = smoothstep(-0.6, -2.4, p.z) + smoothstep(2.6, 5.2, abs(p.x)) * 0.5;
    return mix(c, vec3(0.62, 0.74, 0.86), clamp(far, 0.0, 1.0) * 0.55);
  }
`

const bladeVertex = /* glsl */ `
  attribute float t;
  attribute float side;
  attribute vec4 aRoot;   // xyz, height
  attribute vec4 aShape;  // facing angle, lean x, lean z, seed
  varying float vt;
  varying float vSeed;
  varying vec3 vPos;
  varying vec3 vN;
  void main() {
    float h = aRoot.w;
    vec3 lean = vec3(aShape.y, 0.0, aShape.z);
    vec3 P = aRoot.xyz + vec3(0.0, h * t, 0.0) + lean * h * t * t;
    vec3 across = vec3(cos(aShape.x), 0.0, sin(aShape.x));
    float width = 0.0085 * (1.0 - t * 0.92);
    P += across * side * width;
    vt = t;
    vSeed = aShape.w;
    vPos = P;
    vN = normalize(cross(across, normalize(vec3(0.0, 1.0, 0.0) + lean * 2.0 * t)));
    gl_Position = projectionMatrix * viewMatrix * vec4(P, 1.0);
  }
`
const bladeFragment = /* glsl */ `
  ${shared}
  varying float vt;
  varying float vSeed;
  varying vec3 vPos;
  varying vec3 vN;
  void main() {
    vec3 N = normalize(vN);
    if (!gl_FrontFacing) N = -N;
    float diffuse = clamp(abs(dot(N, KEY_DIR)) * 0.7 + 0.3, 0.0, 1.0);
    vec3 root = vec3(0.035, 0.07, 0.02);
    vec3 tip = mix(vec3(0.1, 0.18, 0.04), vec3(0.24, 0.29, 0.075), fract(vSeed * 7.31));
    vec3 albedo = mix(root, tip, smoothstep(0.0, 0.9, vt));
    float ao = mix(0.35, 1.0, smoothstep(0.0, 0.8, vt)) * contact(vPos);
    vec3 c = albedo * (KEY * diffuse * ao + SKY * mix(0.5, 1.0, vt));
    c += vec3(0.9, 0.95, 0.6) * pow(vt, 3.0) * 0.06 * ao;
    gl_FragColor = vec4(toSrgb(haze(c, vPos)), 1.0);
  }
`
const moundVertex = /* glsl */ `
  varying vec3 vPos;
  varying vec3 vN;
  void main() {
    vPos = position;
    vN = normal;
    gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0);
  }
`
const moundFragment = /* glsl */ `
  ${shared}
  varying vec3 vPos;
  varying vec3 vN;
  void main() {
    vec3 N = normalize(vN);
    float diffuse = max(0.0, dot(N, KEY_DIR)) * 0.8 + 0.2;
    vec3 c = vec3(0.04, 0.075, 0.025) * (KEY * diffuse + SKY) * contact(vPos);
    gl_FragColor = vec4(toSrgb(haze(c, vPos)), 1.0);
  }
`

function bladesMesh(blades) {
  const segments = 5
  const geometry = new THREE.InstancedBufferGeometry()
  const t = []
  const side = []
  const index = []
  for (let i = 0; i <= segments; i++) {
    t.push(i / segments, i / segments)
    side.push(-1, 1)
    if (i < segments)
      index.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2)
  }
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(new Float32Array(t.length * 3), 3)
  )
  geometry.setAttribute("t", new THREE.Float32BufferAttribute(t, 1))
  geometry.setAttribute("side", new THREE.Float32BufferAttribute(side, 1))
  geometry.setIndex(index)
  geometry.setAttribute(
    "aRoot",
    new THREE.InstancedBufferAttribute(
      Float32Array.from(blades.flatMap((b) => b.root)),
      4
    )
  )
  geometry.setAttribute(
    "aShape",
    new THREE.InstancedBufferAttribute(
      Float32Array.from(blades.flatMap((b) => b.shape)),
      4
    )
  )
  geometry.instanceCount = blades.length
  const mesh = new THREE.Mesh(
    geometry,
    new THREE.ShaderMaterial({
      vertexShader: bladeVertex,
      fragmentShader: bladeFragment,
      side: THREE.DoubleSide,
    })
  )
  mesh.frustumCulled = false
  return mesh
}

// Returns { back, front } groups: front holds blades nearer than `split`.
export function buildGround({ seed = 11, split = 0.5, density = 7000 } = {}) {
  const random = rng(seed)
  const back = []
  const front = []
  const xr = MOUND.r.x * 0.97
  const zMin = MOUND.c.z - MOUND.r.z * 0.95
  const zMax = MOUND.c.z + MOUND.r.z * 0.97
  const count = Math.round(2 * xr * (zMax - zMin) * density)
  for (let i = 0; i < count; i++) {
    const x = (random() * 2 - 1) * xr
    const z = zMin + random() * (zMax - zMin)
    const y = groundY(x, z)
    if (y === null) continue
    // Fewer, shorter blades under the feet so the toes stay readable.
    const underFoot = Math.min(
      Math.hypot((x + 0.43) / 0.26, (z - 0.36) / 0.3),
      Math.hypot((x - 0.43) / 0.26, (z - 0.36) / 0.3)
    )
    if (underFoot < 1 && random() > 0.25) continue
    const tall = 0.04 + random() ** 1.7 * 0.11
    const blade = {
      root: [x, y - 0.01, z, underFoot < 1.3 ? tall * 0.6 : tall],
      shape: [
        random() * Math.PI,
        (random() - 0.5) * 0.7 - 0.12,
        (random() - 0.35) * 0.6,
        random(),
      ],
    }
    ;(z > split ? front : back).push(blade)
  }
  const mound = new THREE.SphereGeometry(
    1,
    160,
    80,
    0,
    Math.PI * 2,
    0,
    Math.PI / 2
  )
  mound.scale(MOUND.r.x, MOUND.r.y, MOUND.r.z)
  mound.translate(MOUND.c.x, MOUND.c.y, MOUND.c.z)
  mound.computeVertexNormals()
  const backGroup = new THREE.Group()
  backGroup.add(
    new THREE.Mesh(
      mound,
      new THREE.ShaderMaterial({
        vertexShader: moundVertex,
        fragmentShader: moundFragment,
      })
    )
  )
  backGroup.add(bladesMesh(back))
  const frontGroup = new THREE.Group()
  frontGroup.add(bladesMesh(front))
  return {
    back: backGroup,
    front: frontGroup,
    counts: { back: back.length, front: front.length },
  }
}
