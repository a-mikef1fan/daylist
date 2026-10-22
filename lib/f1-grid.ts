// The 2026 Formula 1 grid: 11 teams, 22 drivers.
// Sources (checked 2026-10-20): formula1.com "All the 2026 F1 driver numbers confirmed in full", racefans.net
// "2026 F1 drivers and teams", racingnews365.com "Every car name for the 2026 F1 season". No mid-season driver
// changes were found for 2026. A reported 2027 swap (Ocon to Camara at Haas) is not part of this grid.
//
// Colors are approximate livery tones chosen for the on-screen cars. They are not official brand values, and no
// team logos or images are used; cars are drawn on a canvas.

export type F1Driver = {
  id: string
  name: string
  code: string // three-letter timing code
  number: number
  nationality: string // country name
  country: string // three-letter country code
}

export type F1Team = {
  id: string
  name: string
  carName: string
  color: string // main body color
  accent: string // wing / helmet accent
  drivers: [F1Driver, F1Driver]
}

export const F1_SEASON = 2026

export const F1_TEAMS: readonly F1Team[] = [
  {
    id: 'mclaren',
    name: 'McLaren',
    carName: 'MCL40',
    color: '#ff8000',
    accent: '#1b1b1b',
    drivers: [
      { id: 'norris', name: 'Lando Norris', code: 'NOR', number: 1, nationality: 'British', country: 'GBR' },
      { id: 'piastri', name: 'Oscar Piastri', code: 'PIA', number: 81, nationality: 'Australian', country: 'AUS' },
    ],
  },
  {
    id: 'mercedes',
    name: 'Mercedes',
    carName: 'W17',
    color: '#27f4d2',
    accent: '#1b1b1b',
    drivers: [
      { id: 'russell', name: 'George Russell', code: 'RUS', number: 63, nationality: 'British', country: 'GBR' },
      { id: 'antonelli', name: 'Kimi Antonelli', code: 'ANT', number: 12, nationality: 'Italian', country: 'ITA' },
    ],
  },
  {
    id: 'red-bull',
    name: 'Red Bull Racing',
    carName: 'RB22',
    color: '#3671c6',
    accent: '#e8002d',
    drivers: [
      { id: 'verstappen', name: 'Max Verstappen', code: 'VER', number: 3, nationality: 'Dutch', country: 'NED' },
      { id: 'hadjar', name: 'Isack Hadjar', code: 'HAD', number: 6, nationality: 'French', country: 'FRA' },
    ],
  },
  {
    id: 'ferrari',
    name: 'Ferrari',
    carName: 'SF-26',
    color: '#e8002d',
    accent: '#fff200',
    drivers: [
      { id: 'leclerc', name: 'Charles Leclerc', code: 'LEC', number: 16, nationality: 'Monegasque', country: 'MON' },
      { id: 'hamilton', name: 'Lewis Hamilton', code: 'HAM', number: 44, nationality: 'British', country: 'GBR' },
    ],
  },
  {
    id: 'williams',
    name: 'Williams',
    carName: 'FW48',
    color: '#1868db',
    accent: '#ffffff',
    drivers: [
      { id: 'albon', name: 'Alex Albon', code: 'ALB', number: 23, nationality: 'Thai', country: 'THA' },
      { id: 'sainz', name: 'Carlos Sainz', code: 'SAI', number: 55, nationality: 'Spanish', country: 'ESP' },
    ],
  },
  {
    id: 'racing-bulls',
    name: 'Racing Bulls',
    carName: 'VCARB 03',
    color: '#6692ff',
    accent: '#ffffff',
    drivers: [
      { id: 'lawson', name: 'Liam Lawson', code: 'LAW', number: 30, nationality: 'New Zealander', country: 'NZL' },
      { id: 'lindblad', name: 'Arvid Lindblad', code: 'LIN', number: 41, nationality: 'British', country: 'GBR' },
    ],
  },
  {
    id: 'aston-martin',
    name: 'Aston Martin',
    carName: 'AMR26',
    color: '#229971',
    accent: '#cedc00',
    drivers: [
      { id: 'alonso', name: 'Fernando Alonso', code: 'ALO', number: 14, nationality: 'Spanish', country: 'ESP' },
      { id: 'stroll', name: 'Lance Stroll', code: 'STR', number: 18, nationality: 'Canadian', country: 'CAN' },
    ],
  },
  {
    id: 'haas',
    name: 'Haas',
    carName: 'VF-26',
    color: '#d9dcde',
    accent: '#e6002b',
    drivers: [
      { id: 'bearman', name: 'Oliver Bearman', code: 'BEA', number: 87, nationality: 'British', country: 'GBR' },
      { id: 'ocon', name: 'Esteban Ocon', code: 'OCO', number: 31, nationality: 'French', country: 'FRA' },
    ],
  },
  {
    id: 'alpine',
    name: 'Alpine',
    carName: 'A526',
    color: '#ff87bc',
    accent: '#0093cc',
    drivers: [
      { id: 'gasly', name: 'Pierre Gasly', code: 'GAS', number: 10, nationality: 'French', country: 'FRA' },
      { id: 'colapinto', name: 'Franco Colapinto', code: 'COL', number: 43, nationality: 'Argentine', country: 'ARG' },
    ],
  },
  {
    id: 'audi',
    name: 'Audi',
    carName: 'R26',
    color: '#c7ccd1',
    accent: '#f50537',
    drivers: [
      { id: 'bortoleto', name: 'Gabriel Bortoleto', code: 'BOR', number: 5, nationality: 'Brazilian', country: 'BRA' },
      { id: 'hulkenberg', name: 'Nico Hülkenberg', code: 'HUL', number: 27, nationality: 'German', country: 'GER' },
    ],
  },
  {
    id: 'cadillac',
    name: 'Cadillac',
    carName: 'MAC-26',
    color: '#3a3f47',
    accent: '#d4d8dd',
    drivers: [
      { id: 'perez', name: 'Sergio Pérez', code: 'PER', number: 11, nationality: 'Mexican', country: 'MEX' },
      { id: 'bottas', name: 'Valtteri Bottas', code: 'BOT', number: 77, nationality: 'Finnish', country: 'FIN' },
    ],
  },
]

export type GridEntry = { team: F1Team; driver: F1Driver }

export const F1_ENTRIES: readonly GridEntry[] = F1_TEAMS.flatMap((team) => team.drivers.map((driver) => ({ team, driver })))

export const DEFAULT_DRIVER_ID = 'norris'

export function findEntry(driverId: string): GridEntry | undefined {
  return F1_ENTRIES.find((entry) => entry.driver.id === driverId)
}
