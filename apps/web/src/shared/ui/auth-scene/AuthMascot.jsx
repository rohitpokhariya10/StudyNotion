import bodyImage from "@/shared/assets/auth-scene/yeti/body.webp"
import headImage from "@/shared/assets/auth-scene/yeti/head.webp"
import lid0 from "@/shared/assets/auth-scene/yeti/lid-0.webp"
import lid1 from "@/shared/assets/auth-scene/yeti/lid-1.webp"
import opening0 from "@/shared/assets/auth-scene/yeti/opening-0.webp"
import opening1 from "@/shared/assets/auth-scene/yeti/opening-1.webp"
import pupil0 from "@/shared/assets/auth-scene/yeti/pupil-0.webp"
import pupil1 from "@/shared/assets/auth-scene/yeti/pupil-1.webp"
import rig from "@/shared/assets/auth-scene/yeti/yeti-layers.json"
import { useEffect, useId, useRef, useState } from "react"

import { createMascotController } from "./mascotController"

// Layers cut from the supplied artwork (see
// docs/growed-redesign/artwork/auth-yeti). Coordinates are canvas pixels of
// that artwork; `frame` is the box every part stays inside at its extreme
// pose, so nothing is ever clipped by the stage.
const { frame, pivots, layers } = rig
const LAYER_IMAGES = {
  body: bodyImage,
  head: headImage,
}
const EYE_IMAGES = [
  { pupil: pupil0, opening: opening0, lid: lid0 },
  { pupil: pupil1, opening: opening1, lid: lid1 },
]
const CONTROLLER_RIG = { frame, pivots, eyes: rig.eyes }
// Only the region around the eyes is drawn as SVG (a small layer).
const EYE_BOX = (() => {
  const boxes = rig.eyes.map((eye) => eye.lid)
  const x = Math.min(...boxes.map((b) => b.x)) - 16
  const y = Math.min(...boxes.map((b) => b.y)) - 16
  const right = Math.max(...boxes.map((b) => b.x + b.width)) + 16
  const bottom = Math.max(...boxes.map((b) => b.y + b.height)) + 16
  return { x, y, width: right - x, height: bottom - y }
})()

const pct = (value, of) => `${(value / of) * 100}%`
const box = ({ x, y, width, height }) => ({
  left: pct(x - frame.x, frame.width),
  top: pct(y - frame.y, frame.height),
  width: pct(width, frame.width),
  height: pct(height, frame.height),
})
const origin = ({ x, y }) =>
  `${pct(x - frame.x, frame.width)} ${pct(y - frame.y, frame.height)}`
const turn = (eye) => `rotate(${eye.angle} ${eye.cx} ${eye.cy})`
// Everything around an eye but the eye itself (where the lid skin fades in
// over the outline as the eye closes).
const ringPath = ({ cx, cy, rx, ry }) =>
  `M ${cx - 3 * rx} ${cy - 3 * ry} H ${cx + 3 * rx} V ${cy + 3 * ry} H ${cx - 3 * rx} Z ` +
  `M ${cx - rx} ${cy} A ${rx} ${ry} 0 1 1 ${cx + rx} ${cy} A ${rx} ${ry} 0 1 1 ${cx - rx} ${cy} Z`

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

// The permanent standing body includes both connected relaxed arms. The
// head and both masked eye openings share one gaze direction. Full-page
// pointer coordinates use a stable rest anchor (no transform feedback).
// Password privacy, touch and reduced-motion preferences override tracking.
export default function AuthMascot({ eyesClosed = false }) {
  const id = useId().replace(/:/g, "")
  const stageRef = useRef(null)
  const headRef = useRef(null)
  const bodyRef = useRef(null)
  const pupilRefs = useRef([])
  const lidRefs = useRef([{}, {}])
  const controllerRef = useRef(null)
  const closedRef = useRef(eyesClosed)
  const [loaded, setLoaded] = useState(() => new Set())
  const [failed, setFailed] = useState(false)
  const reduced = useMediaFlag("(prefers-reduced-motion: reduce)")
  const coarse = useMediaFlag("(hover: none) and (pointer: coarse)")

  const onLoad = (name) => () =>
    setLoaded((current) =>
      current.has(name) ? current : new Set(current).add(name)
    )
  const onError = () => setFailed(true)
  // The yeti appears in its permanent standing pose once every layer loads;
  // it is never seen half assembled.
  const ready =
    loaded.has("eyes") &&
    Object.keys(LAYER_IMAGES).every((name) => loaded.has(name))

  useEffect(() => {
    let active = true
    const images = EYE_IMAGES.flatMap((eye) => Object.values(eye)).map(
      (src) => {
        const image = new Image()
        image.src = src
        return image
      }
    )
    Promise.all(
      images.map((image) =>
        image.decode
          ? image.decode()
          : new Promise((resolve, reject) => {
              image.onload = resolve
              image.onerror = reject
            })
      )
    )
      .then(() => {
        if (active) setLoaded((current) => new Set(current).add("eyes"))
      })
      .catch(() => {
        if (active) setFailed(true)
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    // Images already decoded from cache before their handlers attached.
    const cached = [
      ...(stageRef.current?.querySelectorAll("img[data-layer]") || []),
    ]
      .filter((img) => img.complete && img.naturalWidth > 0)
      .map((img) => img.dataset.layer)
    if (cached.length) setLoaded((current) => new Set([...current, ...cached]))
  }, [])

  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return undefined
    const controller = createMascotController({
      area: document.documentElement,
      elements: {
        stage,
        head: headRef.current,
        body: bodyRef.current,
        pupils: pupilRefs.current,
        lids: lidRefs.current,
      },
      rig: CONTROLLER_RIG,
      tracking: !reduced && !coarse,
      animated: !reduced,
    })
    controller.setClosed(closedRef.current)
    controllerRef.current = controller
    return () => {
      controller.dispose()
      controllerRef.current = null
    }
  }, [reduced, coarse])

  useEffect(() => {
    closedRef.current = eyesClosed
    controllerRef.current?.setClosed(eyesClosed)
  }, [eyesClosed])

  const layer = (name) => (
    <img
      className="sn-mascot-layer"
      src={LAYER_IMAGES[name]}
      alt=""
      data-layer={name}
      style={box(layers[name])}
      onLoad={onLoad(name)}
      onError={onError}
    />
  )
  const lidRef = (i, part) => (node) => {
    lidRefs.current[i][part] = node
  }

  return (
    <div
      ref={stageRef}
      className="sn-mascot"
      aria-hidden="true"
      style={{ "--mascot-aspect": frame.width / frame.height }}
      data-eyes={eyesClosed ? "closed" : "open"}
      data-ready={ready || undefined}
      data-failed={failed || undefined}
    >
      <div
        ref={bodyRef}
        data-part="body"
        className="sn-mascot-part"
        style={{ transformOrigin: origin(pivots.feet) }}
      >
        {layer("body")}
      </div>
      <div
        ref={headRef}
        data-part="head"
        className="sn-mascot-part"
        style={{ transformOrigin: origin(pivots.neck) }}
      >
        {layer("head")}
        <svg
          className="sn-mascot-eyes"
          style={box(EYE_BOX)}
          viewBox={`${EYE_BOX.x} ${EYE_BOX.y} ${EYE_BOX.width} ${EYE_BOX.height}`}
          focusable="false"
        >
          {rig.eyes.map((eye, i) => {
            const images = EYE_IMAGES[i]
            return (
              <g key={i}>
                <defs>
                  {/* The pupil stays inside the eye opening. */}
                  <mask
                    id={`${id}-open-${i}`}
                    maskUnits="userSpaceOnUse"
                    {...eye.opening}
                  >
                    <image href={images.opening} {...eye.opening} />
                  </mask>
                  <clipPath id={`${id}-lid-${i}`}>
                    <path ref={lidRef(i, "clip")} transform={turn(eye)} />
                  </clipPath>
                  <clipPath id={`${id}-ring-${i}`}>
                    <path
                      d={ringPath(eye)}
                      clipRule="evenodd"
                      transform={turn(eye)}
                    />
                  </clipPath>
                  <clipPath id={`${id}-eye-${i}`}>
                    <ellipse
                      cx={eye.cx}
                      cy={eye.cy}
                      rx={eye.rx}
                      ry={eye.ry}
                      transform={turn(eye)}
                    />
                  </clipPath>
                </defs>
                <g mask={`url(#${id}-open-${i})`}>
                  <g
                    ref={(node) => (pupilRefs.current[i] = node)}
                    className="sn-mascot-pupil"
                  >
                    <image href={images.pupil} {...eye.pupil} />
                  </g>
                </g>
                <g
                  ref={lidRef(i, "group")}
                  data-lid="upper"
                  style={{ display: "none" }}
                >
                  {/* The lid's soft shadow on the eye below its rim. */}
                  <g clipPath={`url(#${id}-eye-${i})`}>
                    <path
                      ref={lidRef(i, "shade")}
                      transform={`${turn(eye)} translate(0 4)`}
                      fill="none"
                      stroke="#0d2342"
                      strokeOpacity="0.22"
                      strokeWidth="9"
                    />
                  </g>
                  <g clipPath={`url(#${id}-lid-${i})`}>
                    <image href={images.lid} {...eye.lid} />
                  </g>
                  <g
                    ref={lidRef(i, "ring")}
                    clipPath={`url(#${id}-ring-${i})`}
                    style={{ opacity: 0 }}
                  >
                    <image href={images.lid} {...eye.lid} />
                  </g>
                  <path
                    ref={lidRef(i, "edge")}
                    transform={turn(eye)}
                    fill="none"
                    stroke="#22365c"
                    strokeWidth="3.4"
                    strokeLinecap="round"
                  />
                </g>
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}
