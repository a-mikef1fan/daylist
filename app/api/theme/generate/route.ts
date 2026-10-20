import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { generateTheme, hasApiKey, ThemeGenerationError } from '@/lib/custom-theme/generate'
import { MAX_DESCRIPTION_LENGTH, MIN_DESCRIPTION_LENGTH } from '@/lib/custom-theme/schema'
import { checkRateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const RATE_LIMIT = 10
const RATE_WINDOW_MS = 10 * 60 * 1000

const fail = (error: string, status: number, headers?: HeadersInit) => NextResponse.json({ error }, { status, headers })

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user) return fail('Please sign in to create a theme.', 401)

  if (!hasApiKey()) return fail('Theme generation is not set up on this server yet.', 503)

  let description = ''
  try {
    const body: unknown = await request.json()
    const value = typeof body === 'object' && body !== null ? (body as { description?: unknown }).description : undefined
    // Collapse whitespace and drop control characters before measuring length.
    description = typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim() : ''
  } catch {
    return fail('Send a JSON body with a description.', 400)
  }
  if (description.length < MIN_DESCRIPTION_LENGTH) return fail('Describe the theme you would like.', 400)
  if (description.length > MAX_DESCRIPTION_LENGTH) return fail(`Keep the description under ${MAX_DESCRIPTION_LENGTH} characters.`, 400)

  const limit = checkRateLimit(`theme:${session.user.id}`, RATE_LIMIT, RATE_WINDOW_MS)
  if (!limit.ok) {
    return fail('You have created a lot of themes. Please try again in a few minutes.', 429, { 'Retry-After': String(limit.retryAfterSeconds) })
  }

  try {
    const { theme, warnings } = await generateTheme(description)
    return NextResponse.json({ theme, warnings })
  } catch (error) {
    if (error instanceof ThemeGenerationError) {
      if (error.kind === 'refused') return fail('That description could not be turned into a theme. Try rewording it.', 422)
      if (error.kind === 'busy') return fail('The theme service is busy. Please try again shortly.', 429)
      if (error.kind === 'invalid') return fail('The generated theme was not usable. Please try again.', 502)
    }
    return fail('Could not create a theme right now. Please try again.', 502)
  }
}
