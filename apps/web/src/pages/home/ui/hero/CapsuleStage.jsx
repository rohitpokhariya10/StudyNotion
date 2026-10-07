import { useEffect, useRef, useState } from "react"

import CapsuleFallback from "./CapsuleFallback"

const INTERACTIVE = "a, button, input, select, textarea, label, summary"

const scheduleIdle = (callback) => {
  if (typeof window.requestIdleCallback === "function") {
    const handle = window.requestIdleCallback(callback, { timeout: 1200 })
    return () => window.cancelIdleCallback(handle)
  }
  const handle = window.setTimeout(callback, 200)
  return () => window.clearTimeout(handle)
}

const motionQuery = () => {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)")
  } catch {
    return null
  }
}

// Data savers, software-only GPUs and environments without WebGL keep the
// static rendering (and never download three.js).
const canRender3D = () => {
  try {
    if (navigator.connection?.saveData === true) return false
    const probe = document.createElement("canvas")
    const options = { failIfMajorPerformanceCaveat: true }
    const context =
      probe.getContext("webgl2", options) || probe.getContext("webgl", options)
    if (!context) return false
    context.getExtension("WEBGL_lose_context")?.loseContext()
    return true
  } catch {
    return false
  }
}

// Decorative 3D characters for the homepage hero. The static SVG renders
// immediately and reserves the space; the WebGL scene is fetched once the page
// is idle, fades in over it, looks at the pointer anywhere on the page (and
// keeps its last gaze when the pointer leaves, as on the reference), jumps
// when a character inside `heroRef` is clicked, pauses while off-screen or
// hidden, and is fully disposed on unmount.
export default function CapsuleStage({ heroRef, className = "" }) {
  const canvasRef = useRef(null)
  const [mode, setMode] = useState("static")

  useEffect(() => {
    const hero = heroRef.current
    const canvas = canvasRef.current
    if (!hero || !canvas || !canRender3D()) return undefined

    let cancelled = false
    let scene = null
    let visible = true
    let frameRequest = 0
    // Last pointer position in viewport pixels. Re-projected whenever the
    // canvas moves (scroll, resize), so the target never goes stale.
    let pointer = null
    const cleanups = []
    const reduce = motionQuery()
    const reduced = () => Boolean(reduce?.matches)

    const syncRunning = () => {
      if (!scene) return
      if (visible && !document.hidden && !reduced()) scene.start()
      else scene.stop()
    }

    const flushPointer = () => {
      frameRequest = 0
      if (!scene || !pointer) return
      const rect = canvas.getBoundingClientRect()
      scene.setPointer(pointer.x - rect.left, pointer.y - rect.top)
    }
    const queueFlush = () => {
      if (!frameRequest) frameRequest = requestAnimationFrame(flushPointer)
    }
    const onPointerMove = (event) => {
      // Touch input scrolls the page; the characters keep their pose.
      if (event.pointerType === "touch" || reduced()) return
      pointer = { x: event.clientX, y: event.clientY }
      queueFlush()
    }
    const onScroll = () => {
      if (pointer) queueFlush()
    }
    const onClick = (event) => {
      if (!scene || reduced() || event.target.closest?.(INTERACTIVE)) return
      const rect = canvas.getBoundingClientRect()
      // Jumps stay below the hero's visible top edge (the navbar above it).
      const visibleTop = Math.max(hero.getBoundingClientRect().top, 0)
      scene.poke(
        event.clientX - rect.left,
        event.clientY - rect.top,
        visibleTop - rect.top
      )
    }

    const cancelIdle = scheduleIdle(async () => {
      try {
        const { createCapsuleScene } = await import("./capsuleScene")
        if (cancelled) return
        scene = createCapsuleScene({
          canvas,
          reducedMotion: reduced(),
          onContextLost: () => {
            setMode("static")
            queueMicrotask(() => {
              scene?.dispose()
              scene = null
            })
          },
        })
        setMode("webgl")

        const intersection = new IntersectionObserver(
          ([entry]) => {
            visible = entry.isIntersecting
            syncRunning()
          },
          { threshold: 0.01 }
        )
        intersection.observe(canvas)
        cleanups.push(() => intersection.disconnect())

        const resize = new ResizeObserver(() => {
          scene?.resize()
          if (reduced()) scene?.renderOnce()
          else if (pointer) queueFlush()
        })
        resize.observe(canvas)
        cleanups.push(() => resize.disconnect())

        const onMotionChange = () => {
          scene?.setMotion(!reduced())
          scene?.renderOnce()
          syncRunning()
        }
        reduce?.addEventListener?.("change", onMotionChange)
        cleanups.push(() =>
          reduce?.removeEventListener?.("change", onMotionChange)
        )

        document.addEventListener("visibilitychange", syncRunning)
        cleanups.push(() =>
          document.removeEventListener("visibilitychange", syncRunning)
        )
        // Window-level so text, overlays and the navbar never block tracking.
        window.addEventListener("pointermove", onPointerMove, { passive: true })
        window.addEventListener("scroll", onScroll, { passive: true })
        hero.addEventListener("click", onClick)
        cleanups.push(() => {
          window.removeEventListener("pointermove", onPointerMove)
          window.removeEventListener("scroll", onScroll)
          hero.removeEventListener("click", onClick)
        })
        syncRunning()
      } catch {
        if (!cancelled) setMode("static")
        scene?.dispose()
        scene = null
      }
    })

    return () => {
      cancelled = true
      cancelIdle()
      if (frameRequest) cancelAnimationFrame(frameRequest)
      for (const cleanup of cleanups) cleanup()
      scene?.dispose()
      scene = null
    }
  }, [heroRef])

  return (
    <div className={className} aria-hidden="true" data-scene-mode={mode}>
      <CapsuleFallback
        className={`sn-capsule-layer transition-opacity duration-700 ${
          mode === "webgl" ? "opacity-0" : "opacity-100"
        }`}
      />
      <canvas
        ref={canvasRef}
        className={`sn-capsule-layer transition-opacity duration-700 ${
          mode === "webgl" ? "opacity-100" : "opacity-0"
        }`}
      />
    </div>
  )
}
