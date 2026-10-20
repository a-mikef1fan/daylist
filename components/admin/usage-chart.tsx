'use client'

import { useEffect, useRef, useState } from 'react'

export type SeriesPoint = { start: string; pageViews: number; events: number }

const HEIGHT = 260
const MARGIN = { top: 16, right: 16, bottom: 28, left: 40 }
const SERIES = [
  { key: 'pageViews', label: 'Page views', color: 'var(--u-series-1)' },
  { key: 'events', label: 'Feature events', color: 'var(--u-series-2)' },
] as const

// Round the axis maximum up to a clean number (1, 2, 5 x 10^n).
function niceMax(value: number) {
  if (value <= 4) return 4
  const power = 10 ** Math.floor(Math.log10(value))
  const fraction = value / power
  return (fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10) * power
}

const compact = (value: number) => (value >= 1000 ? `${+(value / 1000).toFixed(1)}K` : String(value))

export function UsageChart({ points, unit }: { points: SeriesPoint[]; unit: 'hour' | 'day' }) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(720)
  const [active, setActive] = useState<number | null>(null)

  useEffect(() => {
    const node = wrapRef.current
    if (!node) return
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(280, Math.round(entry.contentRect.width))))
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const innerWidth = width - MARGIN.left - MARGIN.right
  const innerHeight = HEIGHT - MARGIN.top - MARGIN.bottom
  const max = niceMax(Math.max(0, ...points.flatMap((point) => [point.pageViews, point.events])))
  const x = (index: number) => MARGIN.left + (points.length === 1 ? innerWidth / 2 : (index / (points.length - 1)) * innerWidth)
  const y = (value: number) => MARGIN.top + innerHeight - (value / max) * innerHeight
  const ticks = [0, 1, 2, 3, 4].map((step) => (max / 4) * step)

  const formatLabel = (iso: string, long = false) => {
    const date = new Date(iso)
    if (unit === 'hour') return `${String(date.getUTCHours()).padStart(2, '0')}:00${long ? ' UTC' : ''}`
    return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(date)
  }
  // Show about six evenly spaced x labels.
  const labelEvery = Math.max(1, Math.ceil(points.length / 6))

  function handlePointer(event: React.PointerEvent<SVGRectElement>) {
    const box = event.currentTarget.getBoundingClientRect()
    const ratio = (event.clientX - box.left) / box.width
    setActive(Math.min(points.length - 1, Math.max(0, Math.round(ratio * (points.length - 1)))))
  }

  function handleKey(event: React.KeyboardEvent<SVGSVGElement>) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    setActive((current) => {
      const next = (current ?? (event.key === 'ArrowRight' ? -1 : points.length)) + (event.key === 'ArrowRight' ? 1 : -1)
      return Math.min(points.length - 1, Math.max(0, next))
    })
  }

  const activePoint = active === null ? null : points[active]
  const tooltipLeft = active === null ? 0 : Math.min(Math.max(x(active), 80), width - 80)

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm" style={{ color: 'var(--u-text-2)' }}>
        {SERIES.map((series) => (
          <span key={series.key} className="inline-flex items-center gap-2">
            <span aria-hidden="true" className="inline-block h-0.5 w-4 rounded" style={{ background: series.color }} />
            {series.label}
          </span>
        ))}
      </div>
      <div ref={wrapRef} className="relative">
        <svg
          width={width}
          height={HEIGHT}
          role="img"
          tabIndex={0}
          aria-label={`Line chart of page views and feature events per ${unit}. Use the left and right arrow keys to inspect each ${unit}, or open the data table below.`}
          onKeyDown={handleKey}
          onBlur={() => setActive(null)}
          className="block max-w-full"
        >
          {ticks.map((tick) => (
            <g key={tick}>
              <line x1={MARGIN.left} x2={width - MARGIN.right} y1={y(tick)} y2={y(tick)} stroke="var(--u-grid)" strokeWidth={1} />
              <text x={MARGIN.left - 8} y={y(tick)} dy="0.32em" textAnchor="end" fontSize={11} fill="var(--u-muted)">{compact(tick)}</text>
            </g>
          ))}
          {points.map((point, index) =>
            index % labelEvery === 0 ? (
              <text key={point.start} x={x(index)} y={HEIGHT - 8} textAnchor={index === 0 ? 'start' : index === points.length - 1 ? 'end' : 'middle'} fontSize={11} fill="var(--u-muted)">
                {formatLabel(point.start)}
              </text>
            ) : null,
          )}
          {SERIES.map((series) => {
            const line = points.map((point, index) => `${index === 0 ? 'M' : 'L'}${x(index).toFixed(1)},${y(point[series.key]).toFixed(1)}`).join(' ')
            const area = `${line} L${x(points.length - 1).toFixed(1)},${y(0)} L${x(0).toFixed(1)},${y(0)} Z`
            const last = points.length - 1
            return (
              <g key={series.key}>
                <path d={area} fill={series.color} opacity={0.1} />
                <path d={line} fill="none" stroke={series.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                <circle cx={x(last)} cy={y(points[last][series.key])} r={4} fill={series.color} stroke="var(--u-surface)" strokeWidth={2} />
              </g>
            )
          })}
          {active !== null && (
            <g pointerEvents="none">
              <line x1={x(active)} x2={x(active)} y1={MARGIN.top} y2={MARGIN.top + innerHeight} stroke="var(--u-muted)" strokeWidth={1} />
              {SERIES.map((series) => (
                <circle key={series.key} cx={x(active)} cy={y(points[active][series.key])} r={4} fill={series.color} stroke="var(--u-surface)" strokeWidth={2} />
              ))}
            </g>
          )}
          <rect x={MARGIN.left} y={MARGIN.top} width={innerWidth} height={innerHeight} fill="transparent" onPointerMove={handlePointer} onPointerDown={handlePointer} onPointerLeave={() => setActive(null)} />
        </svg>
        {activePoint && (
          <div role="status" className="pointer-events-none absolute top-2 -translate-x-1/2 rounded-lg border px-3 py-2 text-xs shadow-sm" style={{ left: tooltipLeft, background: 'var(--u-surface)', borderColor: 'var(--u-border)', color: 'var(--u-text-2)' }}>
            <div className="mb-1">{formatLabel(activePoint.start, true)}</div>
            {SERIES.map((series) => (
              <div key={series.key} className="flex items-center gap-2">
                <span aria-hidden="true" className="inline-block h-0.5 w-3 rounded" style={{ background: series.color }} />
                <strong className="num text-sm" style={{ color: 'var(--u-text)' }}>{activePoint[series.key].toLocaleString('en')}</strong>
                <span>{series.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <details className="mt-3 text-sm">
        <summary className="cursor-pointer" style={{ color: 'var(--u-text-2)' }}>View as table</summary>
        <div className="mt-2 max-h-64 overflow-auto">
          <table className="w-full text-left text-sm">
            <thead style={{ color: 'var(--u-muted)' }}>
              <tr><th className="py-1 pr-4 font-medium">{unit === 'hour' ? 'Hour (UTC)' : 'Day (UTC)'}</th><th className="py-1 pr-4 text-right font-medium">Page views</th><th className="py-1 text-right font-medium">Feature events</th></tr>
            </thead>
            <tbody>
              {points.map((point) => (
                <tr key={point.start} className="border-t" style={{ borderColor: 'var(--u-grid)' }}>
                  <td className="py-1 pr-4">{formatLabel(point.start, true)}{unit === 'hour' ? ` · ${new Date(point.start).toISOString().slice(0, 10)}` : ''}</td>
                  <td className="num py-1 pr-4 text-right">{point.pageViews}</td>
                  <td className="num py-1 text-right">{point.events}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  )
}
