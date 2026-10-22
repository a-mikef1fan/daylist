import Link from 'next/link'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { auth } from '@/lib/auth'
import { isAdminEmail } from '@/lib/admin'
import { EVENT_LABELS } from '@/lib/usage'
import { RANGES, getUsageStats, parseRange, type UsageStats } from '@/lib/usage-stats'
import { UsageChart } from '@/components/admin/usage-chart'
import './usage.css'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Usage · daylist', robots: { index: false, follow: false } }

const dateTime = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' })
const formatNumber = (value: number) => value.toLocaleString('en')
const label = (name: string) => EVENT_LABELS[name] ?? name

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="min-w-0 rounded-2xl border p-5" style={{ background: 'var(--u-surface)', borderColor: 'var(--u-border)' }}>
      <h2 className="text-base font-semibold" style={{ fontFamily: 'var(--font-sans)' }}>{title}</h2>
      {subtitle && <p className="mt-0.5 text-sm" style={{ color: 'var(--u-muted)' }}>{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </section>
  )
}

function Table({ head, children }: { head: { text: string; right?: boolean }[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[420px] text-left text-sm">
        <thead style={{ color: 'var(--u-muted)' }}>
          <tr>{head.map((cell) => <th key={cell.text} className={`py-2 pr-4 font-medium last:pr-0 ${cell.right ? 'text-right' : ''}`}>{cell.text}</th>)}</tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}

const rowStyle = { borderColor: 'var(--u-grid)' }

export default async function UsagePage({ searchParams }: { searchParams: Promise<{ range?: string | string[] }> }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!isAdminEmail(session?.user?.email)) notFound()

  const range = parseRange((await searchParams).range)
  let stats: UsageStats | null = null
  try {
    stats = await getUsageStats(range)
  } catch (error) {
    console.error('usage dashboard query failed', error instanceof Error ? error.message : error)
  }

  const tiles = stats && [
    { label: 'Page views', value: stats.totals.pageViews },
    { label: 'Signed-in users', value: stats.totals.users },
    { label: 'Tasks created', value: stats.totals.tasksCreated },
    { label: 'Tasks completed', value: stats.totals.tasksCompleted },
    { label: 'Games started', value: stats.totals.gamesStarted },
  ]

  return (
    <main className="usage-page min-h-screen">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Link href="/" className="inline-flex items-center gap-1 text-sm underline-offset-4 hover:underline" style={{ color: 'var(--u-text-2)' }}><ArrowLeft className="size-4" aria-hidden="true" />Back to daylist</Link>
            <h1 className="mt-2 text-3xl font-semibold">Usage</h1>
            <p className="mt-1 text-sm" style={{ color: 'var(--u-muted)' }}>Page views and feature activity. Times are UTC.</p>
          </div>
          <nav aria-label="Time range" className="inline-flex rounded-full border p-1 text-sm" style={{ borderColor: 'var(--u-border)', background: 'var(--u-surface)' }}>
            {(Object.keys(RANGES) as (keyof typeof RANGES)[]).map((key) => (
              <Link key={key} href={`/admin/usage?range=${key}`} aria-current={key === range ? 'page' : undefined} title={RANGES[key].label} className="rounded-full px-4 py-1.5 font-medium" style={key === range ? { background: 'var(--u-text)', color: 'var(--u-bg)' } : { color: 'var(--u-text-2)' }}>{key}</Link>
            ))}
          </nav>
        </header>

        {!stats || !tiles ? (
          <Card title="Usage data is unavailable">
            <p className="text-sm" style={{ color: 'var(--u-text-2)' }}>The usage query failed. If this is a new deployment, apply <code>migrations/0001_create_usage_events.sql</code> to the database, then reload.</p>
          </Card>
        ) : (
          <>
            <section aria-label="Key numbers" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {tiles.map((tile) => (
                <div key={tile.label} className="rounded-2xl border p-4" style={{ background: 'var(--u-surface)', borderColor: 'var(--u-border)' }}>
                  <div className="text-sm" style={{ color: 'var(--u-text-2)' }}>{tile.label}</div>
                  <div className="num mt-1 text-3xl font-semibold">{formatNumber(tile.value)}</div>
                </div>
              ))}
            </section>

            {stats.totals.events === 0 ? (
              <Card title="No events yet">
                <p className="text-sm" style={{ color: 'var(--u-text-2)' }}>No events yet — data appears once users start using the app.</p>
              </Card>
            ) : (
              <>
                <Card title={stats.unit === 'hour' ? 'Activity by hour' : 'Activity by day'} subtitle={RANGES[range].label}>
                  <UsageChart points={stats.series} unit={stats.unit} />
                </Card>

                <div className="grid gap-6 lg:grid-cols-2">
                  <Card title="Feature usage" subtitle="Events other than page views">
                    {stats.features.length === 0 ? <p className="text-sm" style={{ color: 'var(--u-muted)' }}>No feature events in this range.</p> : (
                      <Table head={[{ text: 'Feature' }, { text: 'Events', right: true }, { text: 'Users', right: true }, { text: 'Last seen', right: true }]}>
                        {stats.features.map((row) => (
                          <tr key={row.name} className="border-t" style={rowStyle}>
                            <td className="py-2 pr-4">{label(row.name)}</td>
                            <td className="num py-2 pr-4 text-right">{formatNumber(row.count)}</td>
                            <td className="num py-2 pr-4 text-right">{formatNumber(row.users)}</td>
                            <td className="num py-2 text-right whitespace-nowrap" style={{ color: 'var(--u-text-2)' }}>{dateTime.format(row.lastSeen)}</td>
                          </tr>
                        ))}
                      </Table>
                    )}
                  </Card>

                  <Card title="Top pages" subtitle="By page views">
                    {stats.pages.length === 0 ? <p className="text-sm" style={{ color: 'var(--u-muted)' }}>No page views in this range.</p> : (
                      <Table head={[{ text: 'Page' }, { text: 'Views', right: true }, { text: 'Users', right: true }]}>
                        {stats.pages.map((row) => (
                          <tr key={row.path ?? 'unknown'} className="border-t" style={rowStyle}>
                            <td className="py-2 pr-4 break-all">{row.path ?? 'Unknown'}</td>
                            <td className="num py-2 pr-4 text-right">{formatNumber(row.count)}</td>
                            <td className="num py-2 text-right">{formatNumber(row.users)}</td>
                          </tr>
                        ))}
                      </Table>
                    )}
                  </Card>
                </div>

                <Card title="Recent events" subtitle="Latest 25 in this range">
                  <Table head={[{ text: 'Time (UTC)' }, { text: 'Event' }, { text: 'Page' }, { text: 'Details' }, { text: 'Visitor' }]}>
                    {stats.recent.map((event) => (
                      <tr key={event.id} className="border-t" style={rowStyle}>
                        <td className="num py-2 pr-4 whitespace-nowrap" style={{ color: 'var(--u-text-2)' }}>{dateTime.format(event.createdAt)}</td>
                        <td className="py-2 pr-4">{event.name === 'page_view' ? 'Page view' : label(event.name)}</td>
                        <td className="py-2 pr-4 break-all">{event.path ?? '—'}</td>
                        <td className="py-2 pr-4" style={{ color: 'var(--u-text-2)' }}>{event.metadata ? Object.entries(event.metadata).map(([key, value]) => `${key}: ${value}`).join(', ') : '—'}</td>
                        <td className="py-2" style={{ color: 'var(--u-text-2)' }}>{event.userId ? `User ${event.userId.slice(0, 4)}` : 'Anonymous'}</td>
                      </tr>
                    ))}
                  </Table>
                </Card>
              </>
            )}
          </>
        )}
      </div>
    </main>
  )
}
