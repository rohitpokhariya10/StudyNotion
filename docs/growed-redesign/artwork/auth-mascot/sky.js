// Browser module: soft sky with volumetric cumulus clouds, rendered as an
// opaque image. Each cloud is listed explicitly and expanded into a cluster
// of puffs; 3D noise erodes them into billows and a short march toward the
// sun gives them self-shadowing. Rendered in tiles to keep each draw short.
import * as THREE from "three"

const MAX_PUFFS = 12

const fragment = /* glsl */ `
  precision highp float;
  uniform vec2 uRes;
  uniform vec4 uPuffs[${MAX_PUFFS}];
  uniform int uCount;
  uniform vec3 uTop;
  uniform vec3 uBottom;
  uniform float uSeed;
  varying vec2 vUv;

  float hash3(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }
  float noise3(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(hash3(i), hash3(i + vec3(1, 0, 0)), f.x),
                   mix(hash3(i + vec3(0, 1, 0)), hash3(i + vec3(1, 1, 0)), f.x), f.y),
               mix(mix(hash3(i + vec3(0, 0, 1)), hash3(i + vec3(1, 0, 1)), f.x),
                   mix(hash3(i + vec3(0, 1, 1)), hash3(i + vec3(1, 1, 1)), f.x), f.y), f.z);
  }
  float fbm3(vec3 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 5; i++) {
      v += a * noise3(p);
      p = p * 2.03 + vec3(1.7, 9.2, 3.1);
      a *= 0.5;
    }
    return v;
  }
  float hash2(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  // Billowy turbulence: rounded lumps rather than ridges.
  float billows(vec3 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 5; i++) {
      v += a * abs(noise3(p) * 2.0 - 1.0);
      p = p * 2.07 + vec3(3.1, 1.7, 5.3);
      a *= 0.5;
    }
    return v;
  }
  // Soft envelope of each cloud: broad rounded top, flat base.
  float shape(vec3 p) {
    float m = -1.0;
    for (int k = 0; k < ${MAX_PUFFS}; k++) {
      if (k >= uCount) break;
      vec4 c = uPuffs[k];
      vec3 centre = vec3(c.x, c.y + c.w * 0.42, 0.0);
      vec3 d = (p - centre) / vec3(c.z, c.w * 0.62, c.w * 0.75);
      float e = 1.0 - dot(d, d);
      e = min(e, (p.y - c.y) / (c.w * 0.22) - 0.1);
      m = max(m, e);
    }
    return m;
  }
  float density(vec3 p) {
    float s = shape(p);
    if (s <= -0.6) return 0.0;
    vec3 warp = vec3(fbm3(p * 2.6 + uSeed), fbm3(p * 2.6 + uSeed + 4.1), fbm3(p * 2.6 + uSeed + 8.3)) - 0.5;
    float lumps = billows(p * 4.4 + warp * 1.6 + uSeed);
    float detail = fbm3(p * 19.0 + warp * 3.0 + uSeed);
    float d = s * 1.15 - 0.18 + (lumps - 0.38) * 1.35 + (detail - 0.5) * 0.22;
    return clamp(d * 2.2, 0.0, 1.0) * smoothstep(-0.3, -0.02, s);
  }
  vec3 toSrgb(vec3 c) {
    return mix(12.92 * c, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
  }
  void main() {
    float aspect = uRes.x / uRes.y;
    vec2 xy = vec2(vUv.x * aspect, vUv.y);
    vec3 sky = mix(uBottom, uTop, pow(vUv.y, 0.9));
    // Skip the march for pixels outside every cloud's bounds.
    bool inside = false;
    for (int i = 0; i < ${MAX_PUFFS}; i++) {
      if (i >= uCount) break;
      vec4 b = uPuffs[i];
      if (abs(xy.x - b.x) < b.z * 1.35 && xy.y > b.y - 0.05 && xy.y < b.y + b.w * 1.4) inside = true;
    }
    vec3 col = vec3(0.0);
    float T = 1.0;
    if (inside) {
      const int STEPS = 64;
      float z0 = -0.7;
      float dt = 1.4 / float(STEPS);
      vec3 L = normalize(vec3(-0.5, 0.75, -0.45));
      vec3 sun = vec3(1.0, 0.975, 0.94) * 1.55;
      float jitter = hash2(gl_FragCoord.xy) * dt * 0.5;
      for (int s = 0; s < STEPS; s++) {
        vec3 p = vec3(xy, z0 + float(s) * dt + jitter);
        float d = density(p);
        if (d < 0.002) continue;
        float sumL = 0.0;
        for (int l = 1; l <= 5; l++) sumL += density(p + L * (0.035 * float(l)));
        float Tl = exp(-sumL * 0.035 * 26.0);
        float powder = 1.0 - exp(-d * 4.0);
        // Ambient light falls off inside the cloud and toward its base.
        float above = density(p + vec3(0.0, 0.05, 0.0)) + density(p + vec3(0.0, 0.12, 0.0));
        float amb = exp(-above * 1.1);
        vec3 ambCol = vec3(0.58, 0.68, 0.86) * 0.78;
        vec3 light = sun * Tl * mix(0.55, 1.0, powder) + ambCol * mix(0.45, 1.0, amb);
        float S = d * 20.0 * dt;
        col += T * light * (1.0 - exp(-S));
        T *= exp(-S);
        if (T < 0.01) break;
      }
    }
    vec3 c = sky * T + col;
    c = toSrgb(clamp(c, 0.0, 1.0));
    c += (hash2(gl_FragCoord.xy + uSeed) - 0.5) / 255.0;
    gl_FragColor = vec4(c, 1.0);
  }
`

const vertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`

const linear = (hex) => {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
}

export function renderSky(
  renderer,
  { width, height, clouds, seed = 3.1, top, bottom }
) {
  // Clouds: [centre x, base y, width, height] -> [x, base, half width, height].
  const puffs = clouds.map(([x, y, w, h]) => [x, y, w / 2, h])
  const material = new THREE.ShaderMaterial({
    vertexShader: vertex,
    fragmentShader: fragment,
    uniforms: {
      uRes: { value: new THREE.Vector2(width, height) },
      uPuffs: {
        value: Array.from(
          { length: MAX_PUFFS },
          (_, i) => new THREE.Vector4(...(puffs[i] || [0, 0, 0, 0.0001]))
        ),
      },
      uCount: { value: puffs.length },
      uTop: { value: new THREE.Vector3(...linear(top)) },
      uBottom: { value: new THREE.Vector3(...linear(bottom)) },
      uSeed: { value: seed },
    },
    depthTest: false,
  })
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material)
  const scene = new THREE.Scene()
  scene.add(quad)
  const camera = new THREE.Camera()
  const target = new THREE.WebGLRenderTarget(width, height, {
    colorSpace: THREE.NoColorSpace,
  })
  const tile = 160
  target.scissorTest = true
  for (let y = 0; y < height; y += tile)
    for (let x = 0; x < width; x += tile) {
      target.scissor.set(x, y, tile, tile)
      renderer.setRenderTarget(target)
      renderer.render(scene, camera)
      renderer.getContext().finish()
    }
  target.scissorTest = false
  renderer.setRenderTarget(target)
  const raw = new Uint8Array(width * height * 4)
  renderer.readRenderTargetPixels(target, 0, 0, width, height, raw)
  renderer.setRenderTarget(null)
  target.dispose()
  material.dispose()
  const out = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y++)
    out.set(
      raw.subarray((height - 1 - y) * width * 4, (height - y) * width * 4),
      y * width * 4
    )
  return { data: out, width, height, puffCount: puffs.length }
}
