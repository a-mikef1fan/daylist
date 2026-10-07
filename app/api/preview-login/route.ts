import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getPreviewTestCredentials } from '@/lib/preview-login'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const credentials = getPreviewTestCredentials()
  if (!credentials) return new NextResponse(null, { status: 404 })

  const { email, password } = credentials
  const headers = request.headers

  try {
    const signIn = () =>
      auth.api.signInEmail({ body: { email, password }, headers, asResponse: true })

    let response = await signIn()
    if (!response.ok) {
      // The test account may not exist yet in this database; create it once and retry.
      const signUp = await auth.api.signUpEmail({
        body: { name: 'Preview Test User', email, password },
        headers,
        asResponse: true,
      })
      if (!signUp.ok) {
        return NextResponse.json({ error: 'Test sign-in failed' }, { status: 401 })
      }
      response = await signIn()
      if (!response.ok) {
        return NextResponse.json({ error: 'Test sign-in failed' }, { status: 401 })
      }
    }

    // Forward the session cookies set by Better Auth.
    const result = NextResponse.json({ ok: true })
    for (const cookie of response.headers.getSetCookie()) {
      result.headers.append('set-cookie', cookie)
    }
    return result
  } catch {
    return NextResponse.json({ error: 'Test sign-in failed' }, { status: 500 })
  }
}
