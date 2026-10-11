// Browser module: builds the auth mascot (a fluffy white creature with a blue
// face, ears, hands and feet) as separate body and head layers. Runs offline
// in headless Chromium through generate-auth-mascot.mjs; nothing here ships
// to the application.
import * as THREE from "three"

const V = (x, y, z) => new THREE.Vector3(x, y, z)
const { clamp, smoothstep } = THREE.MathUtils

// ---------------------------------------------------------------- random ----
export const rng = (seed) => () => {
  seed |= 0
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

// ------------------------------------------------------------ primitives ----
// Ellipsoids (optionally rotated), capsules and smooth blends of them, with
// signed distance helpers.
const ellipsoid = (name, c, r, extra = {}) => {
  const q = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(...(extra.rot || [0, 0, 0]))
  )
  return {
    kind: "ellipsoid",
    name,
    c: V(...c),
    r: V(...r),
    q,
    qi: q.clone().invert(),
    ...extra,
  }
}
const capsule = (name, a, b, radius, extra = {}) => ({
  kind: "capsule",
  name,
  a: V(...a),
  b: V(...b),
  radius,
  ...extra,
})
const blend = (name, children, k, extra = {}) => ({
  kind: "blend",
  name,
  children,
  k,
  c: children[0].c,
  ...extra,
})

const smin = (a, b, k) => {
  const h = Math.max(k - Math.abs(a - b), 0) / k
  return Math.min(a, b) - h * h * k * 0.25
}

const tmp = new THREE.Vector3()
const tmp2 = new THREE.Vector3()
export const sdf = (part, p) => {
  if (part.kind === "blend") {
    let d = Infinity
    for (const child of part.children)
      d = d === Infinity ? sdf(child, p) : smin(d, sdf(child, p), part.k)
    return d
  }
  if (part.kind === "ellipsoid") {
    tmp.copy(p).sub(part.c).applyQuaternion(part.qi)
    const k0 = Math.hypot(tmp.x / part.r.x, tmp.y / part.r.y, tmp.z / part.r.z)
    const k1 = Math.hypot(
      tmp.x / part.r.x ** 2,
      tmp.y / part.r.y ** 2,
      tmp.z / part.r.z ** 2
    )
    return k1 === 0
      ? -Math.min(part.r.x, part.r.y, part.r.z)
      : (k0 * (k0 - 1)) / k1
  }
  tmp.copy(p).sub(part.a)
  tmp2.copy(part.b).sub(part.a)
  const h = clamp(tmp.dot(tmp2) / tmp2.lengthSq(), 0, 1)
  return tmp.sub(tmp2.multiplyScalar(h)).length() - part.radius
}

const gradient = (part, p) => {
  const e = 0.0015
  const g = V(
    sdf(part, V(p.x + e, p.y, p.z)) - sdf(part, V(p.x - e, p.y, p.z)),
    sdf(part, V(p.x, p.y + e, p.z)) - sdf(part, V(p.x, p.y - e, p.z)),
    sdf(part, V(p.x, p.y, p.z + e)) - sdf(part, V(p.x, p.y, p.z - e))
  )
  return g.normalize()
}

// Outward surface sample (point + normal) with area-uniform density.
const sampleSurface = (part, random) => {
  if (part.kind === "ellipsoid") {
    const { r } = part
    const max = Math.max(r.y * r.z, r.x * r.z, r.x * r.y)
    for (;;) {
      const u = random() * 2 - 1
      const phi = random() * Math.PI * 2
      const s = Math.sqrt(1 - u * u)
      const x = s * Math.cos(phi)
      const y = s * Math.sin(phi)
      const z = u
      const area = Math.hypot(r.y * r.z * x, r.x * r.z * y, r.x * r.y * z)
      if (random() * max > area) continue
      const p = V(x * r.x, y * r.y, z * r.z)
        .applyQuaternion(part.q)
        .add(part.c)
      const n = V(x / r.x, y / r.y, z / r.z)
        .normalize()
        .applyQuaternion(part.q)
      return { p, n }
    }
  }
  const axis = part.b.clone().sub(part.a)
  const len = axis.length()
  axis.normalize()
  const cylArea = 2 * Math.PI * part.radius * len
  const capArea = 4 * Math.PI * part.radius * part.radius
  const helper = Math.abs(axis.y) < 0.9 ? V(0, 1, 0) : V(1, 0, 0)
  const u1 = helper.clone().cross(axis).normalize()
  const u2 = axis.clone().cross(u1)
  if (random() * (cylArea + capArea) < cylArea) {
    const a = random() * Math.PI * 2
    const n = u1
      .clone()
      .multiplyScalar(Math.cos(a))
      .add(u2.clone().multiplyScalar(Math.sin(a)))
    return {
      p: part.a
        .clone()
        .addScaledVector(axis, random() * len)
        .addScaledVector(n, part.radius),
      n,
    }
  }
  const u = random() * 2 - 1
  const phi = random() * Math.PI * 2
  const s = Math.sqrt(1 - u * u)
  const n = V(s * Math.cos(phi), s * Math.sin(phi), u)
  const end = n.dot(axis) >= 0 ? part.b : part.a
  return { p: end.clone().addScaledVector(n, part.radius), n }
}

// ----------------------------------------------------------------- model ----
// World units; the creature stands on y = 0 and faces +z (the camera).
export function buildModel() {
  const fur = { material: "fur" }
  const skin = { material: "skin" }
  const add = (offset, base) =>
    base
      .clone()
      .add(V(...offset))
      .toArray()
  // Rounded mitten: a palm blended with short finger bumps.
  const mitten = (name, centre, palm, bumps) =>
    blend(
      name,
      [
        ellipsoid(`${name}Palm`, centre, palm),
        ...bumps.map(([offset, radii], i) =>
          ellipsoid(`${name}Bump${i}`, add(offset, V(...centre)), radii)
        ),
      ],
      0.035,
      { ...skin, layer: "body" }
    )
  const foot = (name, centre) =>
    blend(
      name,
      [
        ellipsoid(`${name}Sole`, centre, [0.24, 0.115, 0.27]),
        ...[-0.11, 0, 0.11].map((dx, i) =>
          ellipsoid(
            `${name}Toe${i}`,
            add([dx, -0.03, 0.22 - Math.abs(dx) * 0.4], V(...centre)),
            [0.068, 0.062, 0.072]
          )
        ),
      ],
      0.05,
      { ...skin, layer: "body" }
    )
  return [
    // Body layer.
    ellipsoid("torso", [0, 1.08, 0], [0.84, 0.84, 0.72], {
      ...fur,
      layer: "body",
      furLength: [0.2, 0.3],
      flow: [0, -0.7, 0.05],
    }),
    capsule("legR", [-0.36, 0.5, 0.06], [-0.4, 0.26, 0.16], 0.23, {
      ...fur,
      layer: "body",
      furLength: [0.08, 0.12],
      flow: [0, -0.7, 0.15],
    }),
    capsule("legL", [0.36, 0.5, 0.06], [0.4, 0.26, 0.16], 0.23, {
      ...fur,
      layer: "body",
      furLength: [0.08, 0.12],
      flow: [0, -0.7, 0.15],
    }),
    foot("footR", [-0.43, 0.115, 0.36]),
    foot("footL", [0.43, 0.115, 0.36]),
    // Raised, waving arm on the creature's right (screen left).
    capsule("armR", [-0.62, 1.48, 0.04], [-1.12, 1.66, 0.3], 0.2, {
      ...fur,
      layer: "body",
      furLength: [0.13, 0.19],
      flow: [-0.15, -0.7, 0.15],
    }),
    mitten(
      "handR",
      [-1.24, 1.84, 0.4],
      [0.15, 0.16, 0.1],
      [
        [
          [-0.1, 0.11, 0.01],
          [0.05, 0.075, 0.055],
        ],
        [
          [-0.035, 0.14, 0.02],
          [0.05, 0.08, 0.055],
        ],
        [
          [0.035, 0.135, 0.02],
          [0.05, 0.078, 0.055],
        ],
        [
          [0.1, 0.1, 0.01],
          [0.048, 0.07, 0.052],
        ],
        [
          [0.13, -0.04, 0.03],
          [0.055, 0.06, 0.05],
        ],
      ]
    ),
    // Relaxed arm on the creature's left (screen right).
    capsule("armL", [0.66, 1.44, 0.04], [0.93, 0.88, 0.24], 0.2, {
      ...fur,
      layer: "body",
      furLength: [0.13, 0.19],
      flow: [0.1, -0.8, 0.1],
    }),
    mitten(
      "handL",
      [0.98, 0.73, 0.31],
      [0.14, 0.15, 0.12],
      [
        [
          [-0.065, -0.11, 0.05],
          [0.05, 0.065, 0.055],
        ],
        [
          [0, -0.125, 0.06],
          [0.05, 0.07, 0.055],
        ],
        [
          [0.065, -0.11, 0.05],
          [0.05, 0.065, 0.055],
        ],
      ]
    ),
    // Head layer.
    ellipsoid("head", [0, 2.34, 0.0], [0.86, 0.77, 0.74], {
      ...fur,
      layer: "head",
      furLength: [0.2, 0.3],
      flow: [0, -0.4, 0],
    }),
    blend(
      "face",
      [
        ellipsoid("faceCore", [0, 2.28, 0.46], [0.56, 0.51, 0.38]),
        ellipsoid("muzzle", [0, 2.03, 0.67], [0.27, 0.16, 0.17]),
        ellipsoid("cheekR", [-0.27, 2.06, 0.6], [0.2, 0.15, 0.17]),
        ellipsoid("cheekL", [0.27, 2.06, 0.6], [0.2, 0.15, 0.17]),
      ],
      0.14,
      { ...skin, layer: "head" }
    ),
    ellipsoid("nose", [0, 2.135, 0.865], [0.05, 0.032, 0.036], {
      material: "nose",
      layer: "head",
    }),
    // Large, slightly protruding eyeballs.
    ellipsoid("eyeR", [-0.24, 2.37, 0.71], [0.185, 0.2, 0.17], {
      material: "eye",
      layer: "head",
    }),
    ellipsoid("eyeL", [0.24, 2.37, 0.71], [0.185, 0.2, 0.17], {
      material: "eye",
      layer: "head",
    }),
    // Small round ears clear of the fur at the upper sides of the head.
    ellipsoid("earR", [-1.0, 2.55, 0.14], [0.115, 0.135, 0.1], {
      ...skin,
      layer: "head",
      rot: [0, -0.6, 0.2],
    }),
    ellipsoid("earL", [1.0, 2.55, 0.14], [0.115, 0.135, 0.1], {
      ...skin,
      layer: "head",
      rot: [0, 0.6, -0.2],
    }),
    ellipsoid("earInR", [-1.04, 2.55, 0.2], [0.06, 0.08, 0.05], {
      material: "earInner",
      layer: "head",
      rot: [0, -0.6, 0.2],
    }),
    ellipsoid("earInL", [1.04, 2.55, 0.2], [0.06, 0.08, 0.05], {
      material: "earInner",
      layer: "head",
      rot: [0, 0.6, -0.2],
    }),
  ]
}

// ------------------------------------------------------------------ fur -----
const areaOf = (part) =>
  part.kind === "ellipsoid"
    ? 4 *
      Math.PI *
      ((part.r.x * part.r.y + part.r.x * part.r.z + part.r.y * part.r.z) / 3)
    : 2 * Math.PI * part.radius * part.a.distanceTo(part.b) +
      4 * Math.PI * part.radius ** 2

// Uniform 3D hash grid of points for neighbourhood queries.
class PointGrid {
  constructor(cell) {
    this.cell = cell
    this.map = new Map()
  }
  key(x, y, z) {
    return ((x + 512) * 1024 + (y + 512)) * 1024 + (z + 512)
  }
  add(p, value) {
    const k = this.key(
      Math.floor(p.x / this.cell),
      Math.floor(p.y / this.cell),
      Math.floor(p.z / this.cell)
    )
    let list = this.map.get(k)
    if (!list) this.map.set(k, (list = []))
    list.push(value)
  }
  near(p, visit) {
    const cx = Math.floor(p.x / this.cell)
    const cy = Math.floor(p.y / this.cell)
    const cz = Math.floor(p.z / this.cell)
    for (let x = -1; x <= 1; x++)
      for (let y = -1; y <= 1; y++)
        for (let z = -1; z <= 1; z++) {
          const list = this.map.get(this.key(cx + x, cy + y, cz + z))
          if (list) for (const v of list) visit(v)
        }
  }
}

// Instanced strands: each one is a tapered ribbon that faces the camera.
export function buildFur(parts, { density = 34000, seed = 7 } = {}) {
  const random = rng(seed)
  const furParts = parts.filter((p) => p.material === "fur")
  const face = parts.find((p) => p.name === "face")
  const head = parts.find((p) => p.name === "head")
  const byLayer = { body: [], head: [] }

  for (const part of furParts) {
    const count = Math.round(areaOf(part) * density)
    // Clump centres: tufts of strands pull toward a shared tip.
    const clumps = []
    const clumpGrid = new PointGrid(0.16)
    for (let i = 0; i < count / (part.name === "head" ? 140 : 95); i++) {
      const c = sampleSurface(part, random)
      clumps.push(c)
      clumpGrid.add(c.p, clumps.length - 1)
    }
    const flow = V(...part.flow)
    for (let i = 0; i < count; i++) {
      const { p, n } = sampleSurface(part, random)
      // Strands growing away from the camera are hidden; keep a margin for
      // the silhouette.
      if (n.z < -0.45) continue
      let buried = false
      for (const other of parts) {
        if (other === part) continue
        const margin =
          other.material === "fur"
            ? 0
            : other.name.startsWith("ear")
              ? 0.13
              : other.name === "face"
                ? 0.0
                : 0.015
        if (sdf(other, p) < margin) {
          buried = true
          break
        }
      }
      if (buried) continue

      let [minLen, maxLen] = part.furLength
      const dir = n.clone().add(flow)
      if (part === head) {
        if (n.y > 0.35) {
          // Crown: longer tufts standing up and outward.
          const crown = smoothstep(n.y, 0.35, 0.95)
          maxLen += 0.22 * crown
          minLen += 0.1 * crown
          dir.add(V(0, 0.8 * crown, 0)).addScaledVector(n, 0.55 * crown)
        }
        // At the face the fur drapes over its edge: bangs from above, soft
        // cheek fur from the sides.
        const edge = 1 - smoothstep(sdf(face, p), 0, 0.22)
        if (edge > 0) {
          const toCentre = face.c.clone().sub(p)
          toCentre.z = 0
          toCentre.normalize()
          const above = smoothstep(p.y - face.c.y, 0.05, 0.3)
          dir.lerp(
            toCentre
              .multiplyScalar(0.3)
              .add(V(0, -0.15, 0.95))
              .normalize(),
            0.6 * edge
          )
          maxLen -= (0.1 + 0.08 * above) * edge
          minLen -= (0.06 + 0.06 * above) * edge
        }
      }
      // Shorter fur where the body faces the ground.
      if (part.name === "torso") maxLen -= 0.12 * smoothstep(-n.y, 0.2, 0.9)
      dir
        .add(
          V(random() - 0.5, random() - 0.5, random() - 0.5).multiplyScalar(0.4)
        )
        .normalize()
      const length = minLen + (maxLen - minLen) * Math.pow(random(), 0.7)

      // Ambient occlusion from nearby solids and the ground.
      let occlusion = 0
      for (const other of parts) {
        if (other === part) continue
        if (other.material === "fur") {
          const d = sdf(other, p) - other.furLength[1] * 0.6
          occlusion += Math.max(0, 1 - d / 0.3) * 0.45
        } else {
          occlusion += Math.max(0, 1 - sdf(other, p) / 0.08) * 0.15
        }
      }
      occlusion += Math.max(0, 1 - p.y / 0.45) * 0.4
      const ao = Math.max(0.32, 1 - occlusion)

      // Droop, curl and clumping, applied along t².
      const bend = V(0, -0.46 * length, 0)
      bend.add(
        V(random() - 0.5, random() - 0.5, random() - 0.5).multiplyScalar(
          0.22 * length
        )
      )
      let best = -1
      let bestD = Infinity
      clumpGrid.near(p, (j) => {
        const d = clumps[j].p.distanceToSquared(p)
        if (d < bestD) {
          bestD = d
          best = j
        }
      })
      let tuft = 1
      if (best >= 0) {
        const clump = clumps[best]
        tuft = 0.8 + 0.2 * ((best * 0.6180339) % 1)
        const tip = clump.p
          .clone()
          .addScaledVector(clump.n.clone().add(flow).normalize(), length)
        const crownTuft = part === head ? smoothstep(n.y, 0.35, 0.9) : 0
        bend.addScaledVector(
          tip.sub(p.clone().addScaledVector(dir, length)),
          0.72 + 0.18 * crownTuft
        )
      }
      byLayer[part.layer].push({
        p,
        n,
        dir,
        length,
        ao: ao * tuft,
        seed: random(),
        bend,
        width: 0.0042 + random() * 0.0028,
      })
    }
  }
  return byLayer
}

const lighting = /* glsl */ `
  const vec3 KEY_DIR = normalize(vec3(-0.72, 0.7, 0.55));
  const vec3 KEY = vec3(1.0, 0.955, 0.89) * 1.32;
  const vec3 SKY = vec3(0.56, 0.69, 0.96) * 0.44;
  const vec3 BOUNCE = vec3(0.45, 0.52, 0.34) * 0.26;
  vec3 toSrgb(vec3 c) {
    c = max(c, 0.0);
    c = c / (1.0 + 0.06 * c);
    return mix(12.92 * c, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
  }
`

const furVertex = /* glsl */ `
  attribute float t;
  attribute float side;
  attribute vec3 aRoot;
  attribute vec3 aDir;
  attribute vec3 aNormal;
  attribute vec4 aParams; // length, width, ao, seed
  attribute vec3 aBend;
  varying vec3 vT;
  varying vec3 vN;
  varying float vt;
  varying float vAo;
  varying float vSeed;
  varying vec3 vPos;
  void main() {
    float len = aParams.x;
    vec3 P = aRoot + aDir * (len * t) + aBend * (t * t);
    vec3 T = normalize(aDir * len + 2.0 * aBend * t);
    vec3 perp = normalize(cross(T, aNormal + vec3(0.0001)));
    P += perp * sin(t * 5.0 + aParams.w * 31.0) * 0.03 * t * len;
    vec3 V = normalize(cameraPosition - P);
    vec3 S = normalize(cross(T, V));
    float width = aParams.y * pow(1.0 - t, 0.7);
    P += S * side * width;
    vT = T;
    vN = aNormal;
    vt = t;
    vAo = aParams.z;
    vSeed = aParams.w;
    vPos = P;
    gl_Position = projectionMatrix * viewMatrix * vec4(P, 1.0);
  }
`

const furFragment = /* glsl */ `
  ${lighting}
  uniform float uFlat;
  uniform vec3 uFlatColor;
  varying vec3 vT;
  varying vec3 vN;
  varying float vt;
  varying float vAo;
  varying float vSeed;
  varying vec3 vPos;
  void main() {
    if (uFlat > 0.5) { gl_FragColor = vec4(uFlatColor, 1.0); return; }
    vec3 T = normalize(vT);
    vec3 N = normalize(vN);
    vec3 V = normalize(cameraPosition - vPos);
    float ndl = dot(N, KEY_DIR);
    float shadow = smoothstep(-0.3, 0.65, ndl);
    float tdl = dot(T, KEY_DIR);
    float kk = sqrt(max(0.0, 1.0 - tdl * tdl));
    float diffuse = mix(0.5 + 0.5 * ndl, kk, 0.3) * shadow;
    vec3 H = normalize(KEY_DIR + V);
    vec3 Ts = normalize(T + N * 0.25);
    float th = dot(Ts, H);
    float spec = pow(sqrt(max(0.0, 1.0 - th * th)), 60.0) * 0.14 * shadow;
    float depth = mix(0.3, 1.0, smoothstep(0.0, 0.95, vt));
    float ao = vAo * depth;
    vec3 base = vec3(0.95, 0.955, 0.97) * (0.92 + 0.08 * fract(vSeed * 13.7));
    vec3 c = base * (KEY * diffuse * ao + SKY * (0.62 + 0.38 * N.y) * mix(0.55, 1.0, ao) + BOUNCE * (0.5 - 0.5 * N.y) * ao);
    c += KEY * spec * ao;
    float rim = pow(1.0 - abs(dot(N, V)), 2.0) * smoothstep(0.25, 1.0, vt);
    c += vec3(0.82, 0.9, 1.0) * rim * 0.2;
    gl_FragColor = vec4(toSrgb(c), 1.0);
  }
`

function furMesh(strands, segments = 10) {
  const geometry = new THREE.InstancedBufferGeometry()
  const t = []
  const side = []
  const index = []
  for (let i = 0; i <= segments; i++) {
    const tt = i / segments
    t.push(tt, tt)
    side.push(-1, 1)
    if (i < segments) {
      const a = i * 2
      index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
    }
  }
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(new Float32Array(t.length * 3), 3)
  )
  geometry.setAttribute("t", new THREE.Float32BufferAttribute(t, 1))
  geometry.setAttribute("side", new THREE.Float32BufferAttribute(side, 1))
  geometry.setIndex(index)
  const n = strands.length
  const root = new Float32Array(n * 3)
  const dir = new Float32Array(n * 3)
  const normal = new Float32Array(n * 3)
  const params = new Float32Array(n * 4)
  const bend = new Float32Array(n * 3)
  strands.forEach((s, i) => {
    s.p.toArray(root, i * 3)
    s.dir.toArray(dir, i * 3)
    s.n.toArray(normal, i * 3)
    s.bend.toArray(bend, i * 3)
    params.set([s.length, s.width, s.ao, s.seed], i * 4)
  })
  geometry.setAttribute("aRoot", new THREE.InstancedBufferAttribute(root, 3))
  geometry.setAttribute("aDir", new THREE.InstancedBufferAttribute(dir, 3))
  geometry.setAttribute(
    "aNormal",
    new THREE.InstancedBufferAttribute(normal, 3)
  )
  geometry.setAttribute(
    "aParams",
    new THREE.InstancedBufferAttribute(params, 4)
  )
  geometry.setAttribute("aBend", new THREE.InstancedBufferAttribute(bend, 3))
  geometry.instanceCount = n
  const material = new THREE.ShaderMaterial({
    vertexShader: furVertex,
    fragmentShader: furFragment,
    side: THREE.DoubleSide,
    uniforms: {
      uFlat: { value: 0 },
      uFlatColor: { value: new THREE.Vector3() },
    },
  })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.frustumCulled = false
  mesh.userData.kind = "fur"
  return mesh
}

// ---------------------------------------------------------- solid parts -----
const solidVertex = /* glsl */ `
  attribute float ao;
  varying vec3 vN;
  varying vec3 vPos;
  varying float vAo;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vPos = world.xyz;
    vN = normalize(mat3(modelMatrix) * normal);
    vAo = ao;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`
const solidFragment = /* glsl */ `
  ${lighting}
  uniform vec3 uColor;
  uniform float uSpec;
  uniform float uGloss;
  uniform float uWrap;
  uniform float uFlat;
  uniform vec3 uFlatColor;
  varying vec3 vN;
  varying vec3 vPos;
  varying float vAo;
  void main() {
    if (uFlat > 0.5) { gl_FragColor = vec4(uFlatColor, 1.0); return; }
    vec3 N = normalize(vN);
    vec3 V = normalize(cameraPosition - vPos);
    float ndl = dot(N, KEY_DIR);
    float diffuse = max(0.0, (ndl + uWrap) / (1.0 + uWrap));
    vec3 H = normalize(KEY_DIR + V);
    float spec = pow(max(dot(N, H), 0.0), uGloss) * uSpec;
    float ao = vAo;
    vec3 c = uColor * (KEY * diffuse * ao + SKY * (0.62 + 0.38 * N.y) * mix(0.5, 1.0, ao) + BOUNCE * (0.5 - 0.5 * N.y));
    float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);
    c += uColor * vec3(0.25, 0.3, 0.45) * fres * ao;
    c += KEY * spec * ao;
    gl_FragColor = vec4(toSrgb(c), 1.0);
  }
`

const MATERIALS = {
  // Linear-space albedo.
  fur: { color: [0.7, 0.72, 0.78], spec: 0.0, gloss: 8, wrap: 0.5 },
  skin: { color: [0.33, 0.52, 0.89], spec: 0.1, gloss: 22, wrap: 0.55 },
  earInner: { color: [0.55, 0.69, 0.96], spec: 0.04, gloss: 12, wrap: 0.5 },
  nose: { color: [0.17, 0.3, 0.66], spec: 0.45, gloss: 50, wrap: 0.35 },
  mouth: { color: [0.05, 0.05, 0.14], spec: 0.05, gloss: 20, wrap: 0.2 },
  eye: { color: [0.95, 0.955, 0.97], spec: 0.0, gloss: 30, wrap: 0.6 },
}

// Mesh for any part. Blends are star-shaped around their first child's
// centre: each sphere direction is projected onto the zero level set.
function partGeometry(part) {
  if (part.kind === "ellipsoid") {
    const g = new THREE.SphereGeometry(1, 96, 64)
    g.scale(part.r.x, part.r.y, part.r.z)
    g.applyQuaternion(part.q)
    g.translate(part.c.x, part.c.y, part.c.z)
    g.computeVertexNormals()
    return g
  }
  if (part.kind === "capsule") {
    const axis = part.b.clone().sub(part.a)
    const g = new THREE.CapsuleGeometry(part.radius, axis.length(), 24, 48)
    g.applyQuaternion(
      new THREE.Quaternion().setFromUnitVectors(
        V(0, 1, 0),
        axis.clone().normalize()
      )
    )
    const mid = part.a.clone().add(part.b).multiplyScalar(0.5)
    g.translate(mid.x, mid.y, mid.z)
    g.computeVertexNormals()
    return g
  }
  const g = new THREE.SphereGeometry(1, 160, 120)
  const pos = g.attributes.position
  const nrm = g.attributes.normal
  const d = V(0, 0, 0)
  for (let i = 0; i < pos.count; i++) {
    d.fromBufferAttribute(pos, i).normalize()
    let lo = 0
    let hi = 2
    for (let k = 0; k < 40; k++) {
      const mid = (lo + hi) / 2
      if (sdf(part, part.c.clone().addScaledVector(d, mid)) < 0) lo = mid
      else hi = mid
    }
    const p = part.c.clone().addScaledVector(d, lo)
    pos.setXYZ(i, p.x, p.y, p.z)
    const n = gradient(part, p)
    nrm.setXYZ(i, n.x, n.y, n.z)
  }
  return g
}

function solidMesh(part, parts, cloud) {
  const geometry = partGeometry(part)
  // Per-vertex occlusion: neighbouring solids, strands around skin, ground.
  const pos = geometry.attributes.position
  const ao = new Float32Array(pos.count)
  const p = new THREE.Vector3()
  const r = 0.085
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i)
    let occlusion = 0
    for (const other of parts) {
      if (other === part || other.material === "fur") continue
      if (part.material === "eye" && other.material === "eye") continue
      const reach = part.material === "eye" ? 0.03 : 0.07
      occlusion += Math.max(0, 1 - Math.max(sdf(other, p), 0) / reach) * 0.3
    }
    if (part.material === "fur") {
      for (const other of parts)
        if (other !== part && other.material === "fur")
          occlusion +=
            Math.max(
              0,
              1 - Math.max(sdf(other, p) - other.furLength[1] * 0.6, 0) / 0.3
            ) * 0.45
    } else {
      // Count strand points around this vertex.
      let weight = 0
      const cell = cloud.cell
      const cx = Math.floor(p.x / cell)
      const cy = Math.floor(p.y / cell)
      const cz = Math.floor(p.z / cell)
      for (let x = -1; x <= 1; x++)
        for (let y = -1; y <= 1; y++)
          for (let z = -1; z <= 1; z++) {
            const list = cloud.points.get(cloud.key(cx + x, cy + y, cz + z))
            if (!list) continue
            for (let j = 0; j < list.length; j += 3) {
              const dd = Math.hypot(
                list[j] - p.x,
                list[j + 1] - p.y,
                list[j + 2] - p.z
              )
              if (dd < r) weight += 1 - dd / r
            }
          }
      occlusion +=
        (1 - Math.exp(-weight * (part.material === "eye" ? 0.01 : 0.018))) *
        0.85
    }
    occlusion += Math.max(0, 1 - p.y / 0.3) * 0.35
    ao[i] = Math.max(0.3, 1 - occlusion)
  }
  geometry.setAttribute("ao", new THREE.BufferAttribute(ao, 1))
  const m = MATERIALS[part.material]
  const material = new THREE.ShaderMaterial({
    vertexShader: solidVertex,
    fragmentShader: solidFragment,
    uniforms: {
      uColor: { value: new THREE.Vector3(...m.color) },
      uSpec: { value: m.spec },
      uGloss: { value: m.gloss },
      uWrap: { value: m.wrap },
      uFlat: { value: 0 },
      uFlatColor: { value: new THREE.Vector3() },
    },
  })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.userData.part = part
  mesh.userData.kind = "solid"
  return mesh
}

// Points along every strand (raw coordinates in a hash grid), used for fur
// occlusion on the skin.
function cloudOf(strands) {
  const cell = 0.085
  const points = new Map()
  const key = (x, y, z) => ((x + 512) * 1024 + (y + 512)) * 1024 + (z + 512)
  const add = (x, y, z) => {
    const k = key(
      Math.floor(x / cell),
      Math.floor(y / cell),
      Math.floor(z / cell)
    )
    let list = points.get(k)
    if (!list) points.set(k, (list = []))
    list.push(x, y, z)
  }
  for (const s of [...strands.body, ...strands.head])
    for (const t of [0.3, 0.6, 0.9])
      add(
        s.p.x + s.dir.x * s.length * t + s.bend.x * t * t,
        s.p.y + s.dir.y * s.length * t + s.bend.y * t * t,
        s.p.z + s.dir.z * s.length * t + s.bend.z * t * t
      )
  return { cell, points, key }
}

// ----------------------------------------------------------------- mouth ----
// A small, gentle open smile: the upper lip line curves up at the corners and
// the lower edge is a shallow rounded arc. Built in the face's front plane and
// projected onto the face surface so it follows its curvature and lighting.
const mouthFragment = /* glsl */ `
  ${lighting}
  varying vec2 vUv;
  varying vec3 vN;
  void main() {
    // vUv.x: -1..1 across the mouth; vUv.y: 0 at the lip line, 1 at the bottom.
    float tongue = smoothstep(0.45, 0.9, vUv.y) * (1.0 - smoothstep(0.35, 0.8, abs(vUv.x)));
    vec3 inside = mix(vec3(0.07, 0.025, 0.07), vec3(0.16, 0.045, 0.1), smoothstep(0.0, 0.8, vUv.y));
    vec3 c = mix(inside, vec3(0.62, 0.22, 0.3), tongue * 0.85);
    // Shadow under the upper lip and soft darkening toward the corners.
    c *= mix(0.55, 1.0, smoothstep(0.0, 0.35, vUv.y)) * mix(1.0, 0.7, smoothstep(0.6, 1.0, abs(vUv.x)));
    gl_FragColor = vec4(toSrgb(c), 1.0);
  }
`
const mouthVertex = /* glsl */ `
  attribute vec2 mouthUv;
  varying vec2 vUv;
  varying vec3 vN;
  void main() {
    vUv = mouthUv;
    vN = normal;
    gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0);
  }
`

function mouthMesh(
  face,
  { x = 0, y = 1.985, halfWidth = 0.1, lift = 0.018, depth = 0.05 } = {}
) {
  const cols = 48
  const rows = 12
  const positions = []
  const normals = []
  const uvs = []
  const index = []
  for (let j = 0; j <= rows; j++) {
    for (let i = 0; i <= cols; i++) {
      const u = (i / cols) * 2 - 1
      const v = j / rows
      // Upper lip line: corners lifted. Lower edge: rounded, meeting the
      // corners.
      const top = y + lift * u * u
      const bottom = y + lift * u * u - depth * Math.pow(1 - u * u, 0.75)
      const py = top + (bottom - top) * v
      const px = x + u * halfWidth
      // Project onto the face along -z.
      let lo = -1
      let hi = 2
      for (let k = 0; k < 40; k++) {
        const mid = (lo + hi) / 2
        if (sdf(face, V(px, py, mid)) < 0) lo = mid
        else hi = mid
      }
      const p = V(px, py, lo)
      const n = gradient(face, p)
      p.addScaledVector(n, 0.0025)
      positions.push(p.x, p.y, p.z)
      normals.push(n.x, n.y, n.z)
      uvs.push(u, v)
      if (i < cols && j < rows) {
        const a = j * (cols + 1) + i
        index.push(a, a + cols + 1, a + 1, a + 1, a + cols + 1, a + cols + 2)
      }
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3)
  )
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3))
  geometry.setAttribute("mouthUv", new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setIndex(index)
  const mesh = new THREE.Mesh(
    geometry,
    new THREE.ShaderMaterial({
      vertexShader: mouthVertex,
      fragmentShader: mouthFragment,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    })
  )
  mesh.userData.kind = "mouth"
  return mesh
}

// ----------------------------------------------------------------- scene ----
export function buildCreature({ density, seed } = {}) {
  const parts = buildModel()
  const strands = buildFur(parts, { density, seed })
  const cloud = cloudOf(strands)
  const groups = { body: new THREE.Group(), head: new THREE.Group() }
  for (const part of parts)
    groups[part.layer].add(solidMesh(part, parts, cloud))
  groups.head.add(mouthMesh(parts.find((p) => p.name === "face")))
  groups.body.add(furMesh(strands.body))
  groups.head.add(furMesh(strands.head))
  return {
    parts,
    groups,
    strandCount: strands.body.length + strands.head.length,
  }
}
