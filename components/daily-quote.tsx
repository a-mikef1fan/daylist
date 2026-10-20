'use client'

import { useEffect, useState } from 'react'
import { getQuoteForDate, type Quote } from '@/lib/quotes'

// Picked on the client after mount (local calendar date), so server and client
// markup match on first render. The reserved height avoids layout shift.
export function DailyQuote() {
  const [quote, setQuote] = useState<Quote | null>(null)

  useEffect(() => {
    setQuote(getQuoteForDate(new Date()))
  }, [])

  return (
    <figure className="mt-5 min-h-[3.25rem] border-l-2 border-[var(--sage-deep)]/30 pl-4" aria-label="Quote of the day">
      {quote && (
        <>
          <blockquote className="m-0 font-[family-name:var(--font-display)] text-[15px] italic leading-relaxed text-[var(--ink-soft)]">
            “{quote.text}”
          </blockquote>
          <figcaption className="mt-1 text-xs text-muted-foreground">— {quote.author}</figcaption>
        </>
      )}
    </figure>
  )
}
