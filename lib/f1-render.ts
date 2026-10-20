import { WORLD_HEIGHT, WORLD_WIDTH, type Car, type Race, type Track } from '@/lib/f1'

// Canvas drawing for the F1 game. Pure functions of the race state; no React in here.

export type RenderColors = { ground: string; asphalt: string; line: string }

export const DEFAULT_RENDER_COLORS: RenderColors = { ground: '#dfe8dd', asphalt: '#3d4148', line: '#f4f4ee' }

function tracePath(ctx: CanvasRenderingContext2D, track: Track) {
  ctx.beginPath()
  track.points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)))
  ctx.closePath()
}

// The circuit never changes, so it is drawn once into an offscreen canvas and copied each frame.
export function drawTrackLayer(ctx: CanvasRenderingContext2D, track: Track, colors: RenderColors) {
  ctx.fillStyle = colors.ground
  ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT)
  ctx.lineJoin = 'round'
  ctx.lineCap = 'butt'

  const width = track.halfWidth * 2
  // Kerbs: a red and white band just wider than the asphalt.
  tracePath(ctx, track)
  ctx.setLineDash([])
  ctx.strokeStyle = '#f4f4ee'
  ctx.lineWidth = width + 9
  ctx.stroke()
  ctx.setLineDash([9, 9])
  ctx.strokeStyle = '#d6402f'
  ctx.stroke()
  ctx.setLineDash([])

  tracePath(ctx, track)
  ctx.strokeStyle = colors.asphalt
  ctx.lineWidth = width
  ctx.stroke()

  // Faint center line.
  tracePath(ctx, track)
  ctx.setLineDash([10, 14])
  ctx.strokeStyle = 'rgba(255,255,255,0.16)'
  ctx.lineWidth = 1.5
  ctx.stroke()
  ctx.setLineDash([])

  // Start / finish line: a two-row checkerboard across the track.
  const i = track.startIndex
  const p = track.points[i]
  const nx = track.nx[i]
  const ny = track.ny[i]
  const tx = Math.cos(track.heading[i])
  const ty = Math.sin(track.heading[i])
  const cell = 6
  const cells = Math.round(width / cell)
  for (let k = 0; k < cells; k++) {
    for (let row = 0; row < 2; row++) {
      const across = (k - cells / 2 + 0.5) * cell
      const along = (row - 0.5) * cell
      ctx.fillStyle = (k + row) % 2 === 0 ? '#ffffff' : '#111111'
      ctx.beginPath()
      const cx = p.x + nx * across + tx * along
      const cy = p.y + ny * across + ty * along
      ctx.moveTo(cx - (nx + tx) * (cell / 2), cy - (ny + ty) * (cell / 2))
      ctx.lineTo(cx + (nx - tx) * (cell / 2), cy + (ny - ty) * (cell / 2))
      ctx.lineTo(cx + (nx + tx) * (cell / 2), cy + (ny + ty) * (cell / 2))
      ctx.lineTo(cx - (nx - tx) * (cell / 2), cy - (ny - ty) * (cell / 2))
      ctx.closePath()
      ctx.fill()
    }
  }
}

// A drawn single-seater, nose pointing along +x. Team colors only: no logos or liveries.
export function drawCar(ctx: CanvasRenderingContext2D, car: Car, scale = 1.5) {
  const { color, accent } = car.entry.team
  ctx.save()
  ctx.translate(car.x, car.y)
  ctx.rotate(car.heading)
  ctx.scale(scale, scale)
  ctx.fillStyle = '#16181b'
  ctx.fillRect(-7.5, -5.4, 4, 2.4)
  ctx.fillRect(-7.5, 3, 4, 2.4)
  ctx.fillRect(3.2, -5.2, 3, 2.1)
  ctx.fillRect(3.2, 3.1, 3, 2.1)
  ctx.fillStyle = accent
  ctx.fillRect(-9.5, -4.1, 2, 8.2)
  ctx.fillRect(8, -4, 1.8, 8)
  ctx.beginPath()
  ctx.moveTo(-7.5, -2)
  ctx.lineTo(1, -2.4)
  ctx.lineTo(9, -0.9)
  ctx.lineTo(9, 0.9)
  ctx.lineTo(1, 2.4)
  ctx.lineTo(-7.5, 2)
  ctx.closePath()
  ctx.fillStyle = color
  ctx.fill()
  ctx.lineWidth = 0.7
  ctx.strokeStyle = 'rgba(0,0,0,0.45)'
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(-1.5, 0, 1.5, 0, Math.PI * 2)
  ctx.fillStyle = accent
  ctx.fill()
  ctx.restore()
}

export function drawRace(ctx: CanvasRenderingContext2D, race: Race, trackLayer: HTMLCanvasElement | null, colors: RenderColors, now: number) {
  if (trackLayer) ctx.drawImage(trackLayer, 0, 0, WORLD_WIDTH, WORLD_HEIGHT)
  else drawTrackLayer(ctx, race.track, colors)

  const player = race.cars[race.playerIndex]
  race.cars.forEach((car) => {
    if (car !== player) drawCar(ctx, car)
  })
  drawCar(ctx, player, 1.7)

  // Marker so the player's car is easy to find in the pack.
  const pulse = 0.5 + 0.5 * Math.sin(now / 220)
  ctx.save()
  ctx.beginPath()
  ctx.arc(player.x, player.y, 13 + pulse * 2.5, 0, Math.PI * 2)
  ctx.lineWidth = 2
  ctx.strokeStyle = `rgba(255,255,255,${0.55 + pulse * 0.35})`
  ctx.stroke()
  ctx.font = '700 11px system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'bottom'
  const label = player.entry.driver.code
  const labelY = player.y - 17
  const labelWidth = ctx.measureText(label).width + 8
  ctx.fillStyle = 'rgba(20,22,25,0.82)'
  ctx.fillRect(player.x - labelWidth / 2, labelY - 13, labelWidth, 14)
  ctx.fillStyle = '#ffffff'
  ctx.fillText(label, player.x, labelY)
  ctx.restore()
}
