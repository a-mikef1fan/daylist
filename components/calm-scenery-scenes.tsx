import type { ReactNode } from 'react'

// Original, hand-authored SVG landscapes for the "no open tasks" empty state.
// They are drawn from scratch for this project (no photos, no third-party art),
// so there is nothing to license and no network request is ever made.
// Every scene shares one 400x240 canvas; the wrapper crops with `slice`.

export type Scene = {
  id: string
  place: string
  caption: string
  alt: string
  art: ReactNode
}

function Stars({ points, fill = '#fff' }: { points: [number, number, number][]; fill?: string }) {
  return (
    <g fill={fill}>
      {points.map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} opacity={0.35 + ((i * 37) % 60) / 100} />
      ))}
    </g>
  )
}

const starField: [number, number, number][] = [
  [24, 20, 0.9], [58, 46, 0.7], [92, 14, 1], [128, 38, 0.7], [160, 18, 0.9], [196, 52, 0.6],
  [228, 12, 1], [262, 36, 0.8], [296, 20, 0.7], [330, 50, 1], [366, 16, 0.8], [386, 42, 0.6],
  [40, 70, 0.6], [110, 66, 0.8], [180, 78, 0.6], [250, 64, 0.7], [320, 80, 0.6], [372, 72, 0.8],
]

/* ------------------------------------------------------------------ */
/* Mount Fuji, Japan: dawn, lake reflection, cherry blossom branch     */
/* ------------------------------------------------------------------ */
const fujiPath = 'M20 168 C100 160 146 96 178 68 L188 61 L212 61 L222 68 C254 96 300 160 380 168 Z'

const fuji = (
  <>
    <defs>
      <linearGradient id="fj-sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#a9c4ea" />
        <stop offset="0.55" stopColor="#f4d3d6" />
        <stop offset="1" stopColor="#fbe6c9" />
      </linearGradient>
      <linearGradient id="fj-mtn" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#7d8fbf" />
        <stop offset="1" stopColor="#b7bfdc" />
      </linearGradient>
      <linearGradient id="fj-lake" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#cdd3e6" />
        <stop offset="1" stopColor="#8fa6cf" />
      </linearGradient>
      <clipPath id="fj-clip"><path d={fujiPath} /></clipPath>
      <filter id="fj-blur"><feGaussianBlur stdDeviation="1.6" /></filter>
    </defs>
    <rect width="400" height="240" fill="url(#fj-sky)" />
    <circle cx="300" cy="70" r="16" fill="#fff6e4" opacity="0.8" />
    <ellipse cx="110" cy="62" rx="46" ry="5" fill="#fff" opacity="0.55" />
    <ellipse cx="320" cy="96" rx="40" ry="4" fill="#fff" opacity="0.5" />
    <path d="M0 168 C40 148 80 150 120 164 L120 170 L0 170 Z" fill="#9fb0d4" opacity="0.7" />
    <path d="M280 170 C310 150 360 148 400 160 L400 170 L280 170 Z" fill="#9fb0d4" opacity="0.7" />
    <path d={fujiPath} fill="url(#fj-mtn)" />
    <g clipPath="url(#fj-clip)">
      <path d="M150 60 L178 80 L186 72 L194 92 L202 74 L210 94 L218 76 L228 84 L252 60 Z" fill="#fff" opacity="0.95" />
      <path d="M200 61 L214 66 C246 96 296 160 380 168 L300 168 C262 130 232 100 200 61 Z" fill="#5d6fa3" opacity="0.28" />
    </g>
    <rect y="168" width="400" height="72" fill="url(#fj-lake)" />
    <g transform="translate(0 336) scale(1 -1)" opacity="0.3" filter="url(#fj-blur)">
      <path d="M100 168 C140 150 164 110 188 61 L212 61 C236 110 260 150 300 168 Z" fill="#7d8fbf" />
    </g>
    <g stroke="#fff" strokeWidth="0.8" opacity="0.5" strokeLinecap="round">
      <path d="M60 184 h40 M150 192 h60 M250 186 h50 M120 206 h80 M240 214 h70 M40 226 h60" />
    </g>
    <path d="M-4 20 C40 30 70 22 120 44 C150 56 170 52 196 66" fill="none" stroke="#5a3f4a" strokeWidth="3.2" strokeLinecap="round" />
    <path d="M70 28 C80 40 84 48 98 56 M120 44 C126 62 134 72 150 80" fill="none" stroke="#5a3f4a" strokeWidth="2" strokeLinecap="round" />
    <g>
      {[
        [20, 24, 7], [38, 30, 8], [54, 22, 6], [70, 30, 8], [88, 40, 7], [104, 44, 9], [118, 40, 6],
        [138, 52, 8], [156, 60, 6], [176, 62, 7], [96, 56, 6], [150, 80, 6], [128, 70, 7], [84, 46, 5],
      ].map(([x, y, r], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r={r} fill={i % 3 === 0 ? '#f6b9c9' : '#fad4de'} />
          <circle cx={x - 1} cy={y - 1} r={r / 3} fill="#fff1f4" opacity="0.9" />
        </g>
      ))}
    </g>
    <g fill="#f8c5d1" opacity="0.9">
      <ellipse cx="236" cy="104" rx="3" ry="1.8" transform="rotate(30 236 104)" />
      <ellipse cx="270" cy="140" rx="3" ry="1.8" transform="rotate(-20 270 140)" />
      <ellipse cx="320" cy="120" rx="2.6" ry="1.6" transform="rotate(50 320 120)" />
      <ellipse cx="206" cy="150" rx="2.6" ry="1.6" transform="rotate(10 206 150)" />
    </g>
  </>
)

/* ------------------------------------------------------------------ */
/* Lofoten, Norway: blue hour, red cabins, mirror sea                  */
/* ------------------------------------------------------------------ */
const lofotenPeaks = 'M0 150 L0 98 L26 70 L44 92 L70 44 L96 88 L118 66 L150 112 L176 78 L206 120 L240 60 L270 104 L300 84 L336 128 L362 74 L400 112 L400 150 Z'

const lofoten = (
  <>
    <defs>
      <linearGradient id="lf-sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#27346a" />
        <stop offset="0.6" stopColor="#8a78b3" />
        <stop offset="1" stopColor="#f3bba4" />
      </linearGradient>
      <linearGradient id="lf-sea" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#e2a9a6" />
        <stop offset="0.35" stopColor="#8570a6" />
        <stop offset="1" stopColor="#2b3768" />
      </linearGradient>
      <linearGradient id="lf-peak" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#6c6aa3" />
        <stop offset="1" stopColor="#3b4276" />
      </linearGradient>
      <filter id="lf-blur"><feGaussianBlur stdDeviation="1.4" /></filter>
    </defs>
    <rect width="400" height="150" fill="url(#lf-sky)" />
    <Stars points={starField.slice(0, 12)} />
    <path d={lofotenPeaks} fill="url(#lf-peak)" />
    <path d="M240 60 L252 82 L244 78 L240 96 L232 76 L226 80 Z M70 44 L82 66 L72 62 L66 76 L60 62 Z M362 74 L372 92 L364 88 L358 100 L352 88 Z" fill="#dfe0f2" opacity="0.85" />
    <rect y="150" width="400" height="90" fill="url(#lf-sea)" />
    <g transform="translate(0 300) scale(1 -1)" opacity="0.4" filter="url(#lf-blur)">
      <path d={lofotenPeaks} fill="#3b4276" />
    </g>
    <g stroke="#f7d6c9" strokeWidth="0.8" opacity="0.4" strokeLinecap="round">
      <path d="M30 168 h50 M180 176 h70 M300 170 h60 M90 190 h90 M250 200 h80" />
    </g>
    <path d="M200 150 C240 144 330 142 400 146 L400 160 C340 158 250 160 210 158 Z" fill="#2a2f56" />
    {[
      [236, 134, 16, 12], [262, 136, 14, 11], [286, 134, 18, 13], [314, 136, 14, 11], [338, 134, 16, 12],
    ].map(([x, y, w, h], i) => (
      <g key={i}>
        <rect x={x} y={y} width={w} height={h} fill={i % 2 ? '#b8453d' : '#c9563f'} />
        <path d={`M${x - 2} ${y} L${x + w / 2} ${y - 8} L${x + w + 2} ${y} Z`} fill="#3a2f4a" />
        <rect x={x + w / 2 - 2} y={y + 4} width="4" height="4" fill="#ffd89c" />
      </g>
    ))}
    <g opacity="0.35" filter="url(#lf-blur)">
      <rect x="236" y="158" width="16" height="10" fill="#c9563f" />
      <rect x="286" y="158" width="18" height="10" fill="#b8453d" />
      <rect x="338" y="158" width="16" height="10" fill="#c9563f" />
    </g>
  </>
)

/* ------------------------------------------------------------------ */
/* Santorini, Greece: whitewashed terraces and blue domes over the sea  */
/* ------------------------------------------------------------------ */
const santoriniHouses: [number, number, number, number][] = [
  [226, 98, 26, 16], [256, 92, 22, 22], [282, 100, 24, 14], [312, 94, 22, 20], [340, 104, 26, 14],
  [208, 120, 24, 18], [236, 122, 28, 16], [270, 118, 22, 20], [296, 122, 26, 16], [326, 120, 24, 18], [356, 124, 28, 14],
  [196, 144, 26, 18], [228, 146, 24, 16], [256, 142, 28, 20], [290, 146, 24, 16], [318, 144, 28, 18], [350, 146, 26, 16],
]

const santorini = (
  <>
    <defs>
      <linearGradient id="st-sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#6fb0e3" />
        <stop offset="1" stopColor="#d9eef9" />
      </linearGradient>
      <linearGradient id="st-sea" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#7fc0e3" />
        <stop offset="1" stopColor="#2b72b3" />
      </linearGradient>
      <linearGradient id="st-cliff" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#d9a38e" />
        <stop offset="1" stopColor="#a8665c" />
      </linearGradient>
    </defs>
    <rect width="400" height="240" fill="url(#st-sky)" />
    <circle cx="90" cy="54" r="22" fill="#fffbe8" opacity="0.7" />
    <circle cx="90" cy="54" r="12" fill="#fffdf2" />
    <ellipse cx="170" cy="40" rx="40" ry="6" fill="#fff" opacity="0.7" />
    <ellipse cx="130" cy="82" rx="30" ry="4" fill="#fff" opacity="0.6" />
    <rect y="130" width="400" height="110" fill="url(#st-sea)" />
    <path d="M0 132 L400 132" stroke="#eaf6fc" strokeWidth="1" opacity="0.6" />
    <g stroke="#fff" strokeWidth="0.8" opacity="0.5" strokeLinecap="round">
      <path d="M20 160 h50 M110 176 h70 M30 200 h80 M130 218 h60 M60 144 h40" />
    </g>
    <path d="M400 70 L190 160 L170 240 L400 240 Z" fill="url(#st-cliff)" />
    <path d="M400 70 L300 114 L330 240 L400 240 Z" fill="#8f5754" opacity="0.35" />
    {santoriniHouses.map(([x, y, w, h], i) => (
      <g key={i}>
        <rect x={x} y={y} width={w} height={h} fill="#fdfcf8" />
        <rect x={x + w * 0.65} y={y} width={w * 0.35} height={h} fill="#e5e1dc" />
        <rect x={x + 4} y={y + h - 8} width="4" height="6" rx="2" fill="#3f78b6" />
      </g>
    ))}
    <path d="M262 92 a11 11 0 0 1 22 0 Z" fill="#2f6fb5" />
    <rect x="272" y="76" width="1.6" height="6" fill="#fdfcf8" />
    <path d="M214 120 a10 10 0 0 1 20 0 Z" fill="#3d7fc0" />
    <path d="M300 94 a9 9 0 0 1 18 0 Z" fill="#2f6fb5" />
    <rect x="334" y="74" width="12" height="30" fill="#fdfcf8" />
    <rect x="344" y="74" width="4" height="30" fill="#e5e1dc" />
    <path d="M334 74 a6 6 0 0 1 12 0 Z" fill="#fdfcf8" />
    <rect x="337" y="80" width="6" height="8" rx="3" fill="#3f78b6" />
    <g fill="#d96a8a">
      <circle cx="224" cy="150" r="3" /><circle cx="232" cy="152" r="2.4" />
      <circle cx="306" cy="150" r="3" /><circle cx="344" cy="152" r="2.6" />
    </g>
  </>
)

/* ------------------------------------------------------------------ */
/* Banff, Canada: alpenglow over a turquoise glacial lake              */
/* ------------------------------------------------------------------ */
const banffRange = 'M0 150 L0 110 L30 80 L50 96 L84 46 L110 84 L134 62 L168 100 L196 54 L226 92 L258 40 L288 90 L318 66 L350 104 L376 76 L400 100 L400 150 Z'

const banff = (
  <>
    <defs>
      <linearGradient id="bf-sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#8ab0dd" />
        <stop offset="1" stopColor="#fbe0bd" />
      </linearGradient>
      <linearGradient id="bf-rock" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#f4a46c" />
        <stop offset="0.35" stopColor="#b98897" />
        <stop offset="1" stopColor="#6a7fa6" />
      </linearGradient>
      <linearGradient id="bf-lake" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#7fd3cc" />
        <stop offset="1" stopColor="#1e8c98" />
      </linearGradient>
      <filter id="bf-blur"><feGaussianBlur stdDeviation="1.5" /></filter>
    </defs>
    <rect width="400" height="150" fill="url(#bf-sky)" />
    <ellipse cx="80" cy="30" rx="50" ry="5" fill="#fff" opacity="0.55" />
    <ellipse cx="300" cy="24" rx="44" ry="4" fill="#fff" opacity="0.5" />
    <path d={banffRange} fill="url(#bf-rock)" />
    <path d="M84 46 L96 70 L88 66 L84 82 L78 64 L70 70 Z M258 40 L272 66 L262 62 L256 80 L248 62 L240 68 Z M196 54 L206 74 L198 70 L194 84 L188 70 Z M318 66 L328 82 L320 80 L316 92 L310 80 Z" fill="#fdf4ee" opacity="0.92" />
    <path d="M0 150 L0 126 C60 118 120 128 190 124 C260 120 330 128 400 122 L400 150 Z" fill="#4c6e72" opacity="0.7" />
    <rect y="146" width="400" height="94" fill="url(#bf-lake)" />
    <g transform="translate(0 296) scale(1 -1)" opacity="0.22" filter="url(#bf-blur)">
      <path d={banffRange} fill="#a77d8f" />
    </g>
    <g stroke="#e9fbf6" strokeWidth="0.8" opacity="0.45" strokeLinecap="round">
      <path d="M120 168 h60 M230 178 h80 M70 192 h70 M200 206 h90 M300 220 h60" />
    </g>
    {[
      [8, 150, 34], [28, 140, 44], [50, 154, 30], [70, 148, 36], [86, 160, 26],
      [392, 148, 36], [372, 138, 46], [350, 152, 32], [330, 146, 36], [314, 158, 24],
    ].map(([x, y, h], i) => (
      <path key={i} d={`M${x} ${y - h} L${x + 10} ${y} L${x - 10} ${y} Z`} fill={i % 2 ? '#1f4a3f' : '#2c5c4c'} />
    ))}
    <path d="M0 240 L0 200 C20 190 50 196 80 214 L120 240 Z M400 240 L400 196 C380 188 340 196 310 216 L280 240 Z" fill="#6a665f" />
  </>
)

/* ------------------------------------------------------------------ */
/* Sahara dunes, Morocco: low sun, sculpted ridges, a camel caravan    */
/* ------------------------------------------------------------------ */
const sahara = (
  <>
    <defs>
      <linearGradient id="sh-sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#f2b98c" />
        <stop offset="0.6" stopColor="#f9dcae" />
        <stop offset="1" stopColor="#fdeccd" />
      </linearGradient>
      <radialGradient id="sh-sun" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stopColor="#fffbe9" />
        <stop offset="0.4" stopColor="#fff0c4" stopOpacity="0.9" />
        <stop offset="1" stopColor="#ffe0a0" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="sh-d1" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#efc08a" /><stop offset="1" stopColor="#e2a46b" />
      </linearGradient>
      <linearGradient id="sh-d2" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#e4a468" /><stop offset="1" stopColor="#cf7f4a" />
      </linearGradient>
      <linearGradient id="sh-d3" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#d58a52" /><stop offset="1" stopColor="#a85c3a" />
      </linearGradient>
    </defs>
    <rect width="400" height="240" fill="url(#sh-sky)" />
    <circle cx="276" cy="92" r="64" fill="url(#sh-sun)" />
    <circle cx="276" cy="92" r="18" fill="#fffaf0" />
    <path d="M0 130 C60 110 120 112 200 126 C280 138 340 118 400 112 L400 240 L0 240 Z" fill="url(#sh-d1)" />
    <path d="M0 160 C70 128 130 124 210 152 C270 172 340 146 400 140 L400 240 L0 240 Z" fill="url(#sh-d2)" />
    <path d="M210 152 C250 168 300 160 340 150 L400 140 L400 240 L300 240 C260 200 240 170 210 152 Z" fill="#b8693e" opacity="0.5" />
    <path d="M0 214 C60 170 140 170 220 196 C290 218 350 190 400 184 L400 240 L0 240 Z" fill="url(#sh-d3)" />
    <path d="M220 196 C262 208 300 206 336 196 L400 184 L400 240 L330 240 C290 220 250 204 220 196 Z" fill="#7d3f30" opacity="0.4" />
    <g stroke="#f7d9ae" strokeWidth="0.9" opacity="0.5" fill="none" strokeLinecap="round">
      <path d="M30 196 C60 188 90 188 120 196 M150 214 C180 206 210 208 240 216 M260 232 C290 226 320 226 350 232" />
    </g>
    <g fill="#5a3a30">
      {[0, 1, 2].map((i) => (
        <g key={i} transform={`translate(${96 + i * 22} ${126 + i * 1.5})`}>
          <path d="M0 0 C2 -6 6 -7 8 -4 C10 -7 13 -7 14 -3 L16 -8 L17 -7 L15 0 L13 6 L12 0 L9 0 L8 6 L6 0 L3 0 L2 6 L1 0 Z" />
        </g>
      ))}
    </g>
  </>
)

/* ------------------------------------------------------------------ */
/* Torres del Paine, Chile: granite towers at first light              */
/* ------------------------------------------------------------------ */
const paine = (
  <>
    <defs>
      <linearGradient id="pn-sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#9db8de" />
        <stop offset="0.7" stopColor="#f2d4b6" />
        <stop offset="1" stopColor="#f9e4c4" />
      </linearGradient>
      <linearGradient id="pn-lake" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#8fcfd0" />
        <stop offset="1" stopColor="#2f8fa3" />
      </linearGradient>
      <linearGradient id="pn-tower" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#f0b58a" />
        <stop offset="0.5" stopColor="#a7808a" />
        <stop offset="1" stopColor="#5c5b7c" />
      </linearGradient>
      <filter id="pn-blur"><feGaussianBlur stdDeviation="1.5" /></filter>
    </defs>
    <rect width="400" height="240" fill="url(#pn-sky)" />
    <ellipse cx="110" cy="46" rx="70" ry="6" fill="#fff" opacity="0.5" />
    <ellipse cx="320" cy="64" rx="60" ry="5" fill="#fff" opacity="0.45" />
    <path d="M0 150 L0 112 C40 100 80 108 110 120 C150 104 190 112 220 124 C270 106 330 112 400 108 L400 150 Z" fill="#9aa0c4" opacity="0.75" />
    <path d="M144 134 L150 74 L158 36 L166 30 L174 44 L178 90 L184 134 Z" fill="url(#pn-tower)" />
    <path d="M190 134 L194 82 L202 44 L212 34 L220 48 L222 96 L228 134 Z" fill="url(#pn-tower)" />
    <path d="M236 136 L240 100 L248 62 L258 56 L264 76 L268 110 L274 136 Z" fill="url(#pn-tower)" />
    <path d="M158 36 L166 30 L168 56 L162 62 Z M202 44 L212 34 L214 66 L206 70 Z M248 62 L258 56 L260 82 L252 86 Z" fill="#fff5ea" opacity="0.5" />
    <path d="M0 150 L0 132 C70 126 110 138 180 134 C250 130 320 138 400 132 L400 150 Z" fill="#7a7da0" opacity="0.8" />
    <rect y="146" width="400" height="94" fill="url(#pn-lake)" />
    <g transform="translate(0 292) scale(1 -1)" opacity="0.35" filter="url(#pn-blur)">
      <path d="M144 134 L150 74 L158 36 L166 30 L174 44 L178 90 L184 134 Z M190 134 L194 82 L202 44 L212 34 L220 48 L222 96 L228 134 Z M236 136 L240 100 L248 62 L258 56 L264 76 L268 110 L274 136 Z" fill="#7b6a86" />
    </g>
    <g stroke="#eafaf6" strokeWidth="0.8" opacity="0.45" strokeLinecap="round">
      <path d="M40 170 h60 M210 178 h70 M110 194 h80 M280 204 h70" />
    </g>
    <path d="M0 240 L0 206 C60 196 130 214 190 222 C250 230 320 214 400 204 L400 240 Z" fill="#c59b5a" />
    <path d="M0 240 L0 222 C80 214 150 232 230 236 C300 238 350 226 400 222 L400 240 Z" fill="#9a7440" />
    <g stroke="#e6c27c" strokeWidth="1.2" strokeLinecap="round" opacity="0.9">
      {Array.from({ length: 28 }, (_, i) => {
        const x = 8 + i * 14
        const y = 218 + ((i * 7) % 10)
        return <path key={i} d={`M${x} ${y} l${(i % 3) - 1} -9`} />
      })}
    </g>
  </>
)

/* ------------------------------------------------------------------ */
/* Iceland: aurora over a frozen lake                                  */
/* ------------------------------------------------------------------ */
const icelandRidge = 'M0 160 L0 140 L40 116 L70 134 L110 100 L150 130 L190 112 L230 138 L270 108 L310 132 L350 114 L400 136 L400 160 Z'

const iceland = (
  <>
    <defs>
      <linearGradient id="ic-sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#050a22" />
        <stop offset="1" stopColor="#103552" />
      </linearGradient>
      <linearGradient id="ic-aur" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#8e6bff" stopOpacity="0.1" />
        <stop offset="0.5" stopColor="#4dffb0" stopOpacity="0.75" />
        <stop offset="1" stopColor="#25d9a6" stopOpacity="0.1" />
      </linearGradient>
      <linearGradient id="ic-ice" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#1c5b66" />
        <stop offset="1" stopColor="#081c33" />
      </linearGradient>
      <filter id="ic-blur" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="5" /></filter>
      <filter id="ic-blur2"><feGaussianBlur stdDeviation="2" /></filter>
    </defs>
    <rect width="400" height="240" fill="url(#ic-sky)" />
    <Stars points={starField} />
    <g filter="url(#ic-blur)">
      <path d="M-20 100 C40 40 90 20 150 60 C200 90 250 40 310 30 C350 24 390 50 420 70 L420 96 C380 76 340 60 310 66 C250 76 200 128 150 98 C90 62 50 80 -20 140 Z" fill="url(#ic-aur)" />
      <path d="M60 120 C110 70 170 60 220 92 C260 114 320 70 380 84 L380 100 C320 92 270 136 220 118 C170 96 120 100 60 140 Z" fill="#7affc8" opacity="0.35" />
    </g>
    <g stroke="#b9ffdf" strokeWidth="1" opacity="0.35" filter="url(#ic-blur2)">
      {[70, 110, 150, 190, 230, 270, 310].map((x, i) => (
        <path key={x} d={`M${x} ${40 + (i % 3) * 10} L${x + 6} ${100 + (i % 2) * 8}`} />
      ))}
    </g>
    <path d={icelandRidge} fill="#0a1d33" />
    <path d="M110 100 L122 118 L114 114 L108 126 L100 112 Z M270 108 L282 124 L274 122 L266 132 L260 118 Z M40 116 L50 128 L42 126 L36 134 Z" fill="#cfe9f2" opacity="0.75" />
    <rect y="160" width="400" height="80" fill="url(#ic-ice)" />
    <g transform="translate(0 320) scale(1 -1)" opacity="0.4" filter="url(#ic-blur2)">
      <path d="M-20 100 C40 40 90 20 150 60 C200 90 250 40 310 30 C350 24 390 50 420 70 L420 96 C380 76 340 60 310 66 C250 76 200 128 150 98 C90 62 50 80 -20 140 Z" fill="#4dffb0" opacity="0.5" />
    </g>
    <g stroke="#bfeee6" strokeWidth="0.7" opacity="0.28" fill="none">
      <path d="M20 186 L120 178 L230 192 L400 182 M0 214 L140 206 L300 220 L400 210 M80 170 L150 240 M300 168 L260 240" />
    </g>
    <g>
      <rect x="326" y="150" width="14" height="10" fill="#1b2336" />
      <path d="M324 150 L333 142 L342 150 Z" fill="#101626" />
      <rect x="331" y="153" width="4" height="4" fill="#ffc874" />
      <rect x="330" y="166" width="6" height="4" fill="#ffc874" opacity="0.28" />
    </g>
  </>
)

/* ------------------------------------------------------------------ */
/* Ha Long Bay, Vietnam: misty limestone karsts and a junk boat        */
/* ------------------------------------------------------------------ */
const halong = (
  <>
    <defs>
      <linearGradient id="hl-sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#f6dccb" />
        <stop offset="1" stopColor="#e1eeea" />
      </linearGradient>
      <linearGradient id="hl-sea" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#bddad4" />
        <stop offset="1" stopColor="#5f9ea0" />
      </linearGradient>
      <linearGradient id="hl-mist" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#f3f6f2" stopOpacity="0" />
        <stop offset="1" stopColor="#f3f6f2" stopOpacity="0.85" />
      </linearGradient>
    </defs>
    <rect width="400" height="240" fill="url(#hl-sky)" />
    <circle cx="86" cy="64" r="20" fill="#fff4de" opacity="0.8" />
    <path d="M30 140 C44 120 52 90 62 90 C72 90 80 120 92 140 Z M300 138 C312 112 322 84 334 84 C346 84 352 114 368 138 Z" fill="#b7cfcc" />
    <path d="M110 144 C122 128 128 108 140 108 C152 108 160 130 172 144 Z M230 142 C240 120 252 98 264 100 C276 102 280 126 292 142 Z" fill="#9bbcb8" />
    <rect y="108" width="400" height="40" fill="url(#hl-mist)" />
    <path d="M0 150 L400 150 L400 240 L0 240 Z" fill="url(#hl-sea)" />
    <path d="M-10 168 C10 130 30 100 52 100 C74 100 86 130 100 168 Z" fill="#7aa5a2" />
    <path d="M52 100 C50 120 56 150 62 168 L40 168 C44 140 46 120 52 100 Z" fill="#5d8c8a" opacity="0.55" />
    <path d="M300 172 C312 140 326 106 346 104 C368 102 380 140 396 172 Z" fill="#6c9996" />
    <path d="M346 104 C340 130 346 152 354 172 L330 172 C334 146 338 124 346 104 Z" fill="#4f7d7a" opacity="0.55" />
    <g fill="#4f7d68" opacity="0.7">
      <circle cx="52" cy="100" r="5" /><circle cx="346" cy="105" r="5" /><circle cx="64" cy="112" r="3.5" /><circle cx="334" cy="116" r="3.5" />
    </g>
    <rect y="146" width="400" height="26" fill="url(#hl-mist)" opacity="0.7" />
    <g transform="translate(0 340) scale(1 -1)" opacity="0.18">
      <path d="M-10 168 C10 130 30 100 52 100 C74 100 86 130 100 168 Z M300 172 C312 140 326 106 346 104 C368 102 380 140 396 172 Z" fill="#2f5e5c" />
    </g>
    <g transform="translate(170 176)">
      <path d="M0 22 L60 22 L54 30 L8 30 Z" fill="#5a3a30" />
      <path d="M30 22 L30 -20" stroke="#4a3128" strokeWidth="1.6" />
      <path d="M31 -20 C48 -12 54 4 56 20 L31 20 Z" fill="#b8553f" />
      <path d="M31 -10 H52 M31 0 H55 M31 10 H56" stroke="#8a3a2d" strokeWidth="0.8" />
      <path d="M-2 31 C20 34 40 34 62 31" fill="none" stroke="#fff" strokeWidth="0.8" opacity="0.6" />
    </g>
    <g stroke="#f2fbf8" strokeWidth="0.8" opacity="0.5" strokeLinecap="round">
      <path d="M40 190 h60 M270 196 h70 M120 214 h90 M250 226 h60" />
    </g>
  </>
)

/* ------------------------------------------------------------------ */
/* Zhangjiajie, China: sandstone pillars rising through the mist       */
/* ------------------------------------------------------------------ */
function Pillar({ x, w, top, base, tone, canopy }: { x: number; w: number; top: number; base: number; tone: string; canopy: string }) {
  return (
    <g>
      <path d={`M${x} ${base} L${x + 2} ${top + 10} Q${x + w / 2} ${top - 2} ${x + w - 2} ${top + 10} L${x + w} ${base} Z`} fill={tone} />
      <path d={`M${x + w * 0.62} ${top + 6} L${x + w - 2} ${top + 10} L${x + w} ${base} L${x + w * 0.7} ${base} Z`} fill="#000" opacity="0.1" />
      <path d={`M${x - 1} ${top + 12} Q${x + w / 2} ${top - 12} ${x + w + 1} ${top + 12} Q${x + w / 2} ${top + 6} ${x - 1} ${top + 12} Z`} fill={canopy} />
    </g>
  )
}

const zhangjiajie = (
  <>
    <defs>
      <linearGradient id="zj-sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#cfdfe6" />
        <stop offset="1" stopColor="#f3efe0" />
      </linearGradient>
      <filter id="zj-blur" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="6" /></filter>
    </defs>
    <rect width="400" height="240" fill="url(#zj-sky)" />
    <circle cx="320" cy="48" r="16" fill="#fffbee" opacity="0.8" />
    <g opacity="0.55">
      <Pillar x={20} w={26} top={60} base={200} tone="#a9b7b4" canopy="#8fae9c" />
      <Pillar x={130} w={22} top={48} base={200} tone="#a9b7b4" canopy="#8fae9c" />
      <Pillar x={250} w={28} top={56} base={200} tone="#a9b7b4" canopy="#8fae9c" />
      <Pillar x={350} w={24} top={70} base={200} tone="#a9b7b4" canopy="#8fae9c" />
    </g>
    <ellipse cx="200" cy="124" rx="240" ry="16" fill="#f6f4ea" opacity="0.8" filter="url(#zj-blur)" />
    <g opacity="0.85">
      <Pillar x={70} w={34} top={36} base={220} tone="#8c9a96" canopy="#5f8a6f" />
      <Pillar x={196} w={30} top={24} base={220} tone="#8c9a96" canopy="#5f8a6f" />
      <Pillar x={296} w={36} top={44} base={220} tone="#8c9a96" canopy="#5f8a6f" />
    </g>
    <ellipse cx="120" cy="170" rx="220" ry="18" fill="#f6f4ea" opacity="0.85" filter="url(#zj-blur)" />
    <g>
      <Pillar x={-6} w={46} top={90} base={240} tone="#6e7e79" canopy="#3f6e55" />
      <Pillar x={150} w={40} top={110} base={240} tone="#6e7e79" canopy="#3f6e55" />
      <Pillar x={334} w={56} top={84} base={240} tone="#6e7e79" canopy="#3f6e55" />
    </g>
    <ellipse cx="260" cy="214" rx="260" ry="22" fill="#f6f4ea" opacity="0.9" filter="url(#zj-blur)" />
    <ellipse cx="40" cy="236" rx="200" ry="18" fill="#f6f4ea" opacity="0.8" filter="url(#zj-blur)" />
  </>
)

/* ------------------------------------------------------------------ */
/* Maldives: sunset lagoon and overwater bungalows                     */
/* ------------------------------------------------------------------ */
const maldives = (
  <>
    <defs>
      <linearGradient id="md-sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#6d8fd0" />
        <stop offset="0.55" stopColor="#f6b6a0" />
        <stop offset="1" stopColor="#fde3b6" />
      </linearGradient>
      <linearGradient id="md-sea" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#f7cfa7" />
        <stop offset="0.3" stopColor="#5fd0c8" />
        <stop offset="1" stopColor="#14899f" />
      </linearGradient>
      <radialGradient id="md-sun" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stopColor="#fffbe8" />
        <stop offset="0.35" stopColor="#ffe4a8" stopOpacity="0.8" />
        <stop offset="1" stopColor="#ffd09a" stopOpacity="0" />
      </radialGradient>
    </defs>
    <rect width="400" height="240" fill="url(#md-sky)" />
    <ellipse cx="90" cy="46" rx="60" ry="5" fill="#fff" opacity="0.4" />
    <ellipse cx="300" cy="70" rx="50" ry="4" fill="#fde3ef" opacity="0.5" />
    <circle cx="230" cy="136" r="56" fill="url(#md-sun)" />
    <path d="M206 140 a24 24 0 0 1 48 0 Z" fill="#fffaf0" />
    <rect y="140" width="400" height="100" fill="url(#md-sea)" />
    <path d="M214 142 h32 M206 150 h48 M200 160 h60 M192 172 h74 M186 186 h86" stroke="#fff3d6" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
    <g stroke="#e9fffb" strokeWidth="0.8" opacity="0.45" strokeLinecap="round">
      <path d="M20 200 h50 M300 196 h60 M120 222 h80 M310 224 h60" />
    </g>
    <path d="M0 192 L180 192" stroke="#8a6a4a" strokeWidth="2.4" />
    {[16, 34, 52, 70, 88, 106, 124, 142, 160].map((x) => (
      <path key={x} d={`M${x} 192 V204`} stroke="#6f5238" strokeWidth="1.6" />
    ))}
    {[
      [18, 176, 40],
      [98, 180, 36],
    ].map(([x, y, w]) => (
      <g key={x}>
        <rect x={x + 3} y={y} width={w - 6} height={192 - y} fill="#f3e5cc" />
        <rect x={x + w / 2 - 3} y={y + 6} width="6" height={192 - y - 6} fill="#9a7a56" opacity="0.8" />
        <path d={`M${x - 4} ${y} L${x + w / 2} ${y - 18} L${x + w + 4} ${y} Z`} fill="#9b7448" />
        <path d={`M${x + w / 2} ${y - 18} L${x + w + 4} ${y} L${x + w / 2} ${y} Z`} fill="#7d5a36" opacity="0.7" />
      </g>
    ))}
    <g opacity="0.25">
      <path d="M14 204 h50 M94 206 h46" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
    </g>
    <path d="M350 240 C352 200 356 170 366 140" fill="none" stroke="#3b3028" strokeWidth="4" strokeLinecap="round" />
    <g fill="#2f5a3e">
      <path d="M366 140 C346 128 330 136 322 150 C340 140 354 142 366 140 Z" />
      <path d="M366 140 C386 126 400 134 408 148 C392 138 378 140 366 140 Z" />
      <path d="M366 140 C352 120 340 116 326 118 C344 122 356 130 366 140 Z" />
      <path d="M366 140 C380 118 392 114 404 116 C388 122 376 130 366 140 Z" />
      <path d="M366 140 C364 124 366 112 372 104 C372 118 370 128 366 140 Z" />
    </g>
    <path d="M0 240 L0 226 C60 218 140 232 240 232 C300 232 350 224 400 226 L400 240 Z" fill="#f4e2bd" />
  </>
)

export const scenes: Scene[] = [
  {
    id: 'fuji',
    place: 'Mount Fuji, Japan',
    caption: 'Breathe in. The lake is still, and so are you.',
    alt: 'Illustration of Mount Fuji at dawn with a snowy peak reflected in a calm lake, framed by cherry blossoms',
    art: fuji,
  },
  {
    id: 'lofoten',
    place: 'Lofoten Islands, Norway',
    caption: 'Blue hour settles over the fjord. Nothing left to chase.',
    alt: 'Illustration of red fishing cabins beneath jagged peaks at blue hour in the Lofoten Islands, mirrored in still water',
    art: lofoten,
  },
  {
    id: 'santorini',
    place: 'Santorini, Greece',
    caption: 'Warm stone, white walls, a wide blue sea.',
    alt: 'Illustration of whitewashed Santorini buildings with blue domes on a cliff above the Aegean Sea',
    art: santorini,
  },
  {
    id: 'banff',
    place: 'Moraine Lake, Banff, Canada',
    caption: 'First light on the peaks. Your list can wait.',
    alt: 'Illustration of glowing mountain peaks above a turquoise glacial lake with pine trees in Banff National Park',
    art: banff,
  },
  {
    id: 'sahara',
    place: 'Sahara Desert, Morocco',
    caption: 'Slow dunes, slow breath, a quiet evening.',
    alt: 'Illustration of golden Sahara dunes at sunset with a small camel caravan crossing the ridge',
    art: sahara,
  },
  {
    id: 'paine',
    place: 'Torres del Paine, Chile',
    caption: 'Granite towers keep watch while you rest.',
    alt: 'Illustration of the three granite towers of Torres del Paine above a turquoise lake and golden grass at sunrise',
    art: paine,
  },
  {
    id: 'iceland',
    place: 'Northern Lights, Iceland',
    caption: 'The sky is dancing. Just watch for a while.',
    alt: 'Illustration of green aurora ribbons over snowy Icelandic mountains and a frozen lake with a small glowing cabin',
    art: iceland,
  },
  {
    id: 'halong',
    place: 'Ha Long Bay, Vietnam',
    caption: 'Soft mist, quiet water, a sail drifting by.',
    alt: 'Illustration of misty limestone islands in Ha Long Bay with a traditional junk boat on calm green water',
    art: halong,
  },
  {
    id: 'zhangjiajie',
    place: 'Zhangjiajie, China',
    caption: 'Stone pillars float in the morning cloud.',
    alt: 'Illustration of tall forested sandstone pillars rising out of layers of mist in Zhangjiajie National Forest Park',
    art: zhangjiajie,
  },
  {
    id: 'maldives',
    place: 'Maldives',
    caption: 'Warm water, a low sun, nowhere to be.',
    alt: 'Illustration of a sunset over a turquoise lagoon with overwater bungalows and a palm tree in the Maldives',
    art: maldives,
  },
]
