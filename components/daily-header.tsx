'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { Laugh, Lightbulb } from 'lucide-react'
import { getDailyFun, toDateKey } from '@/lib/daily-fun'

type DailyHeaderProps = {
  /** Day to show, as 'YYYY-MM-DD'. Defaults to the viewer's local today. */
  date?: string
  /** Extra daily content (for example a quote card) rendered above the fact and joke. */
  children?: ReactNode
}

// Shared "daily header" area at the top of the task view. Other daily items can be
// passed as children and will sit above the Fun fact and Joke cards.
export function DailyHeader({ date, children }: DailyHeaderProps) {
  // Local today is only known in the browser. Resolving it after mount keeps the server
  // and first client render identical (no hydration mismatch, no timezone drift).
  const [today, setToday] = useState<string | null>(null)
  useEffect(() => {
    setToday(toDateKey(new Date()))
  }, [])

  const key = date ?? today
  const content = key ? getDailyFun(key) : null

  return (
    <section className="daily-header" aria-label="Daily header">
      {children}
      <div className="daily-cards">
        {content ? (
          <>
            <article className="daily-card" aria-labelledby="daily-fact-label">
              <span className="daily-card-icon"><Lightbulb aria-hidden="true" /></span>
              <div className="daily-card-body">
                <span className="eyebrow" id="daily-fact-label">{content.fact.kind === 'on-this-day' ? 'ON THIS DAY' : 'FUN FACT'}</span>
                <p>{content.fact.year && <strong>{content.fact.year}: </strong>}{content.fact.text}</p>
              </div>
            </article>
            <article className="daily-card is-joke" aria-labelledby="daily-joke-label">
              <span className="daily-card-icon"><Laugh aria-hidden="true" /></span>
              <div className="daily-card-body">
                <span className="eyebrow" id="daily-joke-label">JOKE OF THE DAY</span>
                <p>{content.joke}</p>
              </div>
            </article>
          </>
        ) : (
          <>
            <div className="daily-card is-placeholder" aria-hidden="true" />
            <div className="daily-card is-placeholder" aria-hidden="true" />
          </>
        )}
      </div>
    </section>
  )
}
