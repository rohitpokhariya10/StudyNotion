import {
  detectHeroTier,
  HERO_TIERS,
} from "@/widgets/neet-hero/lib/heroCapabilities"
import { HelixFallback } from "@/widgets/neet-hero/ui/HelixFallback"
import { useEffect, useRef, useState } from "react"

const scheduleIdle = (callback) => {
  if (typeof window.requestIdleCallback === "function") {
    const handle = window.requestIdleCallback(callback, { timeout: 1500 })
    return () => window.cancelIdleCallback(handle)
  }
  const handle = window.setTimeout(callback, 300)
  return () => window.clearTimeout(handle)
}

// Layered hero art. The static SVG renders immediately and is the complete
// experience; the WebGL scene is fetched after the page is idle, fades in
// over it, pauses whenever it is off-screen or the tab is hidden, and is fully
// disposed on unmount (including its GPU context).
export function HeroBackdrop({ onModeChange }) {
  const containerRef = useRef(null)
  const canvasRef = useRef(null)
  const [tier] = useState(() => detectHeroTier())
  const [mode, setMode] = useState(
    tier === HERO_TIERS.OFF ? "static" : "pending"
  )

  useEffect(() => {
    onModeChange?.(mode)
  }, [mode, onModeChange])

  useEffect(() => {
    if (tier === HERO_TIERS.OFF) return undefined
    let cancelled = false
    let scene = null
    let visible = true
    let frameRequest = 0
    const cleanups = []

    const syncRunning = () => {
      if (!scene) return
      if (visible && !document.hidden) scene.start()
      else scene.stop()
    }

    const cancelIdle = scheduleIdle(async () => {
      try {
        const { createHelixScene } =
          await import("@/widgets/neet-hero/lib/helixScene")
        if (cancelled || !canvasRef.current) return
        scene = createHelixScene({
          canvas: canvasRef.current,
          tier,
          onFallback: () => {
            setMode("static")
            queueMicrotask(() => {
              scene?.dispose()
              scene = null
            })
          },
          onPerformance: (sample) => {
            if (import.meta.env.DEV)
              console.info("[project-neet] hero performance", sample)
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
        intersection.observe(containerRef.current)
        cleanups.push(() => intersection.disconnect())

        const resize = new ResizeObserver(() => scene?.resize())
        resize.observe(canvasRef.current)
        cleanups.push(() => resize.disconnect())

        document.addEventListener("visibilitychange", syncRunning)
        cleanups.push(() =>
          document.removeEventListener("visibilitychange", syncRunning)
        )

        const readScroll = () => {
          frameRequest = 0
          const height =
            containerRef.current?.offsetHeight || window.innerHeight
          scene?.setMorph(window.scrollY / (height * 0.85))
        }
        const onScroll = () => {
          if (!frameRequest)
            frameRequest = window.requestAnimationFrame(readScroll)
        }
        window.addEventListener("scroll", onScroll, { passive: true })
        cleanups.push(() => window.removeEventListener("scroll", onScroll))
        readScroll()

        if (window.matchMedia?.("(pointer: fine)").matches) {
          const onPointer = (event) => {
            scene?.setPointer(
              event.clientX / window.innerWidth - 0.5,
              event.clientY / window.innerHeight - 0.5
            )
          }
          window.addEventListener("pointermove", onPointer, { passive: true })
          cleanups.push(() =>
            window.removeEventListener("pointermove", onPointer)
          )
        }
        syncRunning()
      } catch {
        if (!cancelled) setMode("static")
      }
    })

    return () => {
      cancelled = true
      cancelIdle()
      if (frameRequest) window.cancelAnimationFrame(frameRequest)
      for (const cleanup of cleanups) cleanup()
      scene?.dispose()
      scene = null
    }
  }, [tier])

  return (
    <div
      ref={containerRef}
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden="true"
      data-hero-mode={mode}
    >
      <div className="absolute -top-40 -left-32 h-[38rem] w-[38rem] rounded-full bg-neet-accent/10 blur-3xl" />
      <div className="absolute top-1/3 -right-24 h-[30rem] w-[30rem] rounded-full bg-neet-cell/10 blur-3xl" />
      <HelixFallback
        animated={tier !== HERO_TIERS.OFF}
        className={`transition-opacity duration-1000 ${mode === "webgl" ? "opacity-0" : "opacity-100"}`}
      />
      {tier !== HERO_TIERS.OFF && (
        <canvas
          ref={canvasRef}
          className={`absolute inset-0 h-full w-full transition-opacity duration-1000 ${
            mode === "webgl" ? "opacity-100" : "opacity-0"
          }`}
        />
      )}
      {/* Contrast scrim: the headline always sits on a calm surface. */}
      <div className="absolute inset-y-0 left-0 w-full bg-linear-to-r from-neet-canvas via-neet-canvas/75 to-transparent md:w-3/4" />
      <div className="absolute inset-x-0 bottom-0 h-48 bg-linear-to-b from-transparent to-neet-canvas" />
    </div>
  )
}
