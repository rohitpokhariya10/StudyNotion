import { useId } from "react"

// Authored cloud contours: broad sunlit crowns, shaded undersides and a few
// wisps. No tiled raster, turbulence filter, or pointer-intercepting layer.
export default function AuthSky({ panel = false }) {
  const id = useId().replace(/:/g, "")
  const cloud = `cloud-${id}`
  const shade = `shade-${id}`
  return (
    <svg
      className={`sn-auth-sky${panel ? " sn-auth-sky--panel" : ""}`}
      viewBox={panel ? "0 0 600 800" : "0 0 1600 1000"}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <filter id={`soft-${id}`} x="-10%" y="-15%" width="120%" height="135%">
          <feGaussianBlur stdDeviation="0.65" />
          <feDropShadow
            dx="0"
            dy="3"
            stdDeviation="3"
            floodColor="#6289ad"
            floodOpacity="0.1"
          />
        </filter>
        <filter
          id={`volume-${id}`}
          x="-10%"
          y="-20%"
          width="120%"
          height="140%"
        >
          <feGaussianBlur stdDeviation="3" />
        </filter>
        <radialGradient id={`light-${id}`} cx=".36" cy=".12" r=".86">
          <stop stopColor="#fff" />
          <stop offset=".52" stopColor="#f8fcff" />
          <stop offset="1" stopColor="#afc9dc" stopOpacity=".08" />
        </radialGradient>
        <linearGradient id={cloud} x1="0" y1="0" x2="0.12" y2="1">
          <stop offset="0.12" stopColor="#fff" />
          <stop offset="0.58" stopColor="#f8fcff" />
          <stop offset="1" stopColor="#d2e4f0" />
        </linearGradient>
        <linearGradient id={shade} x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#e3f0f7" stopOpacity="0" />
          <stop offset="1" stopColor="#aec9de" stopOpacity="0.55" />
        </linearGradient>
        <g id={`crown-${id}`} filter={`url(#soft-${id})`}>
          <path
            fill={`url(#${cloud})`}
            d="M7 120C-2 116 0 106 11 102C6 90 20 81 34 85C31 70 45 61 60 64C65 47 83 48 92 51C91 40 98 33 110 34C109 17 124 8 138 14C148 3 163 6 170 11C179-1 196 0 207 8C223 5 235 18 235 33C245 28 258 32 263 39C278 33 291 43 289 56C302 57 311 65 312 76C327 68 344 75 347 88C362 82 376 92 373 105C386 107 393 116 386 124C411 131 393 143 371 144C350 150 329 145 309 149C289 150 276 145 257 150C234 156 216 151 197 153C175 158 156 151 138 153C117 154 102 148 85 151C61 154 40 148 25 148C10 147-5 136 7 120Z"
          />
          <path
            fill={`url(#${shade})`}
            d="M8 119C42 128 57 112 88 119C121 104 143 125 175 118C205 101 231 113 252 116C288 105 310 130 340 119C359 112 378 116 390 127C387 144 343 146 308 146C274 151 234 151 203 153C157 151 125 159 91 152C55 146 22 153 8 136Z"
          />
          <path
            fill="#fff"
            opacity=".55"
            d="M83 58C89 43 105 42 117 47C127 18 154 16 172 30C189 13 211 23 218 37C195 30 181 36 173 44C151 30 129 35 121 58C105 50 93 51 83 58Z"
          />
          <g filter={`url(#volume-${id})`}>
            <path
              fill={`url(#light-${id})`}
              d="M46 112C38 98 57 75 76 81C73 62 96 48 116 60C121 32 155 20 177 43C201 21 231 41 233 64C257 53 282 76 270 94C238 104 215 93 194 104C161 96 139 112 112 108C91 119 68 110 46 112Z"
            />
            <path
              fill="#b3cede"
              opacity=".24"
              d="M132 122C162 105 188 121 209 111C231 96 247 105 268 98C287 96 305 110 327 109C336 112 341 119 338 125C306 129 291 121 269 130C244 129 222 139 201 132C174 139 153 135 132 133Z"
            />
          </g>
        </g>
        <g id={`wisp-${id}`} filter={`url(#soft-${id})`}>
          <path
            fill={`url(#${cloud})`}
            d="M0 58C29 44 57 52 75 43C92 18 115 21 135 31C152 10 185 14 200 35C215 27 235 30 248 44C275 38 300 44 323 53C351 55 376 59 398 66C350 75 316 71 278 75C237 79 208 74 176 77C133 77 99 71 65 74C39 74 15 70 0 66Z"
          />
        </g>
      </defs>
      {panel ? (
        <>
          <use
            href={`#crown-${id}`}
            transform="translate(-155 67) scale(.9)"
            opacity=".85"
          />
          <use
            href={`#wisp-${id}`}
            transform="translate(322 195) scale(.75)"
            opacity=".8"
          />
          <use
            href={`#wisp-${id}`}
            transform="translate(-115 400) scale(.8)"
            opacity=".58"
          />
          <use
            href={`#crown-${id}`}
            transform="translate(425 455) scale(.62)"
            opacity=".68"
          />
        </>
      ) : (
        <>
          <use
            href={`#crown-${id}`}
            transform="translate(1195 30) scale(1.45)"
            opacity=".9"
          />
          <use
            href={`#wisp-${id}`}
            transform="translate(225 10) scale(.9)"
            opacity=".5"
          />
          <use
            href={`#crown-${id}`}
            transform="translate(-205 560) scale(1.45)"
            opacity=".78"
          />
          <use
            href={`#wisp-${id}`}
            transform="translate(1235 660) scale(1.25)"
            opacity=".65"
          />
          <use
            href={`#wisp-${id}`}
            transform="translate(400 870) scale(.85)"
            opacity=".45"
          />
        </>
      )}
    </svg>
  )
}
