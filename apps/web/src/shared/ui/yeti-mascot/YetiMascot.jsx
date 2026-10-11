import posterClosed from "@/shared/assets/yeti-mascot/yeti-rest-closed.webp"
import posterOpen from "@/shared/assets/yeti-mascot/yeti-rest.webp"
import { useEffect, useRef, useState } from "react"

import { YETI_ASPECT, YETI_ASSETS, YETI_FADE_MS } from "./yetiConfig"
import { prefetchYetiModel } from "./yetiPrefetch"
import { canRender3D, chooseYetiQuality, readDeviceHints } from "./yetiQuality"

import "./yetiMascot.css"

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)"
// A lost WebGL context is retried once with a fresh canvas; after that the
// poster stays.
const CONTEXT_RETRIES = 1
// Pause after the canvas has faded in before the greeting wave.
const GREET_DELAY_MS = 200

const scheduleIdle = (callback) => {
  if (typeof window.requestIdleCallback === "function") {
    const handle = window.requestIdleCallback(callback, { timeout: 800 })
    return () => window.cancelIdleCallback(handle)
  }
  const handle = window.setTimeout(callback, 120)
  return () => window.clearTimeout(handle)
}

const query = (text) => {
  try {
    return window.matchMedia(text)
  } catch {
    return null
  }
}

function useMediaFlag(text) {
  const [matches, setMatches] = useState(() => Boolean(query(text)?.matches))
  useEffect(() => {
    const list = query(text)
    if (!list) return undefined
    const update = () => setMatches(list.matches)
    update()
    list.addEventListener?.("change", update)
    return () => list.removeEventListener?.("change", update)
  }, [text])
  return matches
}

// `?yeti=standard|light|static` forces a mode for review; `?yeti-debug` (or
// `window.__PRAHIT_YETI_DEBUG__ = true`, which survives client-side
// navigation) exposes development telemetry in development builds only.
const searchParam = (name) => {
  try {
    return new URLSearchParams(window.location.search).get(name)
  } catch {
    return null
  }
}
const requestedMode = (quality) => {
  const value = searchParam("yeti")
  return ["standard", "light", "static"].includes(value) ? value : quality
}

// `greet="session"`: one greeting per browser session on this page.
const greetedKey = () => `prahit-yeti-greeted:${window.location.pathname}`
const greetedThisSession = () => {
  try {
    return window.sessionStorage.getItem(greetedKey()) === "1"
  } catch {
    return false
  }
}
const rememberGreeting = () => {
  try {
    window.sessionStorage.setItem(greetedKey(), "1")
  } catch {
    // Storage unavailable: the page may greet again next visit.
  }
}

// The Prahit yeti (V4.2 production GLB) as a decorative, interactive 3D
// mascot. The poster — a render of the same model in its rest pose, framed
// identically — shows at once and reserves the space; the WebGL scene loads
// when the page is idle and fades in over it, waves once, blinks, breathes,
// and follows the pointer anywhere on the page (eyes first, then the head).
// `eyesClosed` closes the eyes (password privacy); `greet` is true (each
// mount), "session" (once per browser session on the page) or false; `lean`
// adds a slight upper-body lean toward the pointer; `interactive` lets a
// click or tap on the yeti wave again; `priority` fetches the poster first
// (above the fold). Reduced motion, data saver, missing WebGL or any
// loading/rendering failure keep the poster; the surrounding page never
// depends on the scene. Size and place it with `className`; it keeps the
// aspect ratio YETI_ASPECT.
export default function YetiMascot({
  className = "",
  eyesClosed = false,
  greet = true,
  lean = false,
  interactive = false,
  priority = false,
  quality = "auto",
  style,
}) {
  const stageRef = useRef(null)
  const canvasRef = useRef(null)
  const sceneRef = useRef(null)
  const closedRef = useRef(eyesClosed)
  const greetRef = useRef(greet)
  // One greeting per mount: a scene rebuilt after a lost context does not
  // wave again.
  const greetedRef = useRef(false)
  const reduced = useMediaFlag(REDUCED_MOTION)
  const [attempt, setAttempt] = useState(0)
  const [fallback, setFallback] = useState(false)
  const [liveAttempt, setLiveAttempt] = useState(-1)
  const [modelQuality, setModelQuality] = useState(null)

  const staticOnly = reduced || fallback
  const live = !staticOnly && liveAttempt === attempt
  const state = staticOnly ? "static" : live ? "live" : "loading"

  useEffect(() => {
    closedRef.current = eyesClosed
    sceneRef.current?.setClosed(eyesClosed)
  }, [eyesClosed])

  useEffect(() => {
    greetRef.current = greet
  }, [greet])

  useEffect(() => {
    if (reduced) return undefined
    const stage = stageRef.current
    const canvas = canvasRef.current
    if (!stage || !canvas) return undefined

    let cancelled = false
    let scene = null
    let visible = true
    let greetTimer = 0
    const cleanups = []

    const teardown = () => {
      window.clearTimeout(greetTimer)
      for (const cleanup of cleanups.splice(0)) cleanup()
      scene?.dispose()
      scene = null
      sceneRef.current = null
    }

    const decision = chooseYetiQuality({
      requested: requestedMode(quality),
      stageWidth: stage.getBoundingClientRect().width,
      ...readDeviceHints(),
    })
    if (decision.mode !== "3d" || !canRender3D()) {
      queueMicrotask(() => {
        if (!cancelled) setFallback(true)
      })
      return () => {
        cancelled = true
      }
    }
    const url = YETI_ASSETS[decision.quality]
    prefetchYetiModel(url)

    const syncRunning = () => {
      if (!scene) return
      if (visible && !document.hidden) scene.start()
      else scene.stop()
    }

    const onContextLost = () => {
      queueMicrotask(() => {
        teardown()
        if (cancelled) return
        if (attempt < CONTEXT_RETRIES) setAttempt(attempt + 1)
        else setFallback(true)
      })
    }

    const cancelIdle = scheduleIdle(async () => {
      try {
        const { createYetiScene } = await import("./yetiScene")
        if (cancelled) return
        scene = createYetiScene({
          canvas,
          onContextLost,
          lean,
          debug:
            import.meta.env.DEV &&
            (searchParam("yeti-debug") !== null ||
              globalThis.__PRAHIT_YETI_DEBUG__ === true),
        })
        sceneRef.current = scene
        const loaded = await scene.load(url)
        if (cancelled || !loaded) return
        scene.setClosed(closedRef.current, true)

        // Window-level so the form, overlays and the navbar never block
        // tracking; positions are stored and applied on the next frame.
        const onPointerMove = (event) => {
          // Touch input scrolls the page; the yeti keeps its pose.
          if (event.pointerType === "touch") return
          scene?.setPointer(event.clientX, event.clientY)
        }
        const onPointerAway = () => scene?.clearPointer()
        const onMoved = () => scene?.invalidateRect()
        const onVisibility = () => {
          if (document.hidden) scene?.clearPointer()
          syncRunning()
        }
        window.addEventListener("pointermove", onPointerMove, {
          passive: true,
        })
        document.documentElement.addEventListener("pointerleave", onPointerAway)
        window.addEventListener("blur", onPointerAway)
        window.addEventListener("scroll", onMoved, {
          passive: true,
          capture: true,
        })
        document.addEventListener("visibilitychange", onVisibility)
        cleanups.push(() => {
          window.removeEventListener("pointermove", onPointerMove)
          document.documentElement.removeEventListener(
            "pointerleave",
            onPointerAway
          )
          window.removeEventListener("blur", onPointerAway)
          window.removeEventListener("scroll", onMoved, { capture: true })
          document.removeEventListener("visibilitychange", onVisibility)
        })

        const resize = new ResizeObserver(() => {
          scene?.resize()
          if (!scene?.running) scene?.renderOnce()
        })
        resize.observe(canvas)
        cleanups.push(() => resize.disconnect())

        // Rendering pauses while the stage is scrolled away or the tab is
        // hidden.
        const intersection = new IntersectionObserver(
          ([entry]) => {
            visible = entry.isIntersecting
            syncRunning()
          },
          { threshold: 0.01 }
        )
        intersection.observe(stage)
        cleanups.push(() => intersection.disconnect())

        syncRunning()
        setModelQuality(decision.quality)
        setLiveAttempt(attempt)
        const greeting = greetRef.current
        if (
          !greetedRef.current &&
          (greeting === true ||
            (greeting === "session" && !greetedThisSession()))
        )
          greetTimer = window.setTimeout(() => {
            if (!scene?.greet()) return
            greetedRef.current = true
            if (greeting === "session") rememberGreeting()
          }, YETI_FADE_MS + GREET_DELAY_MS)
      } catch (error) {
        if (cancelled) return
        if (import.meta.env.DEV)
          console.warn("The yeti mascot is showing its poster:", error)
        teardown()
        setFallback(true)
      }
    })

    return () => {
      cancelled = true
      cancelIdle()
      teardown()
    }
  }, [reduced, attempt, quality, lean])

  const showClosedPoster = eyesClosed && !live
  // Decorative and hidden from assistive technology: the click is a bonus
  // greeting, never the only way to do anything.
  const pokeable = interactive && live
  const onPoke = () => sceneRef.current?.greet()

  return (
    <div
      ref={stageRef}
      className={`sn-yeti ${className}`.trim()}
      aria-hidden="true"
      data-state={state}
      data-quality={live ? modelQuality : undefined}
      data-eyes={eyesClosed ? "closed" : "open"}
      data-interactive={pokeable ? "" : undefined}
      onClick={pokeable ? onPoke : undefined}
      style={{
        "--yeti-aspect": YETI_ASPECT,
        "--yeti-fade": `${YETI_FADE_MS}ms`,
        ...style,
      }}
    >
      <img
        className="sn-yeti-poster"
        src={posterOpen}
        alt=""
        draggable="false"
        decoding="async"
        fetchPriority={priority ? "high" : undefined}
        data-visible={!live}
      />
      {!live && (
        <img
          className="sn-yeti-poster sn-yeti-poster--closed"
          src={posterClosed}
          alt=""
          draggable="false"
          decoding="async"
          data-visible={showClosedPoster}
        />
      )}
      {!staticOnly && (
        <canvas
          key={attempt}
          ref={canvasRef}
          className="sn-yeti-canvas"
          data-visible={live}
        />
      )}
    </div>
  )
}
