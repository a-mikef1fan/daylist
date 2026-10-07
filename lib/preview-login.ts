// Preview-only test sign-in gate. Inert unless this is a Vercel Preview
// deployment AND both credentials are configured as server-side env vars.
export function getPreviewTestCredentials() {
  if (process.env.VERCEL_ENV !== 'preview') return null
  const email = process.env.PREVIEW_TEST_EMAIL
  const password = process.env.PREVIEW_TEST_PASSWORD
  if (!email || !password) return null
  return { email, password }
}

export function isPreviewTestLoginEnabled() {
  return getPreviewTestCredentials() !== null
}
