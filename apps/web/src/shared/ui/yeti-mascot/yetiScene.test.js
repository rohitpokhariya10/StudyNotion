import {
  BoxGeometry,
  DataTexture,
  Group,
  Mesh,
  MeshPhysicalMaterial,
  Texture,
} from "three"
import { describe, expect, it, vi } from "vitest"

import { releaseGpuResources } from "./yetiScene"

const watch = (object) => {
  const listener = vi.fn()
  object.addEventListener("dispose", listener)
  return listener
}

describe("releaseGpuResources", () => {
  // Regression: three.js binds a module-level DFG LUT texture to every
  // physical material's program uniforms and never removes the renderer's
  // dispose listener from it, which kept every unmounted mascot's WebGL
  // context and canvas alive. Teardown must dispose it explicitly.
  it("disposes geometry, materials, their maps and uniform-only textures", () => {
    const geometry = new BoxGeometry()
    const normalMap = new Texture()
    const material = new MeshPhysicalMaterial({ normalMap })
    const root = new Group().add(new Mesh(geometry, material))
    const lut = new DataTexture()
    const renderer = {
      properties: {
        get: (object) =>
          object === material
            ? { uniforms: { dfgLUT: { value: lut }, roughness: { value: 1 } } }
            : {},
      },
    }
    const disposed = [geometry, material, normalMap, lut].map(watch)

    releaseGpuResources(root, renderer)

    for (const listener of disposed) expect(listener).toHaveBeenCalledOnce()
  })

  it("disposes shared objects once and works without a renderer", () => {
    const geometry = new BoxGeometry()
    const material = new MeshPhysicalMaterial()
    const root = new Group().add(
      new Mesh(geometry, material),
      new Mesh(geometry, material)
    )
    const geometryDisposed = watch(geometry)
    const materialDisposed = watch(material)

    expect(() => releaseGpuResources(root)).not.toThrow()

    expect(geometryDisposed).toHaveBeenCalledOnce()
    expect(materialDisposed).toHaveBeenCalledOnce()
    // Disposing only releases GPU copies: the shared data is intact.
    expect(geometry.attributes.position.count).toBeGreaterThan(0)
  })
})
