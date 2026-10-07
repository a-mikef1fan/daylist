import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { db } from '@/lib/db'
import { authSchema } from '@/lib/db/schema'

function toOrigin(value: string | undefined) {
  if (!value) return undefined
  try {
    return new URL(value.startsWith('http') ? value : `https://${value}`).origin
  } catch {
    return undefined
  }
}

const deploymentOrigins = [
  toOrigin(process.env.VERCEL_URL),
  toOrigin(process.env.VERCEL_BRANCH_URL),
  toOrigin(process.env.VERCEL_PROJECT_PRODUCTION_URL),
].filter((origin): origin is string => Boolean(origin))

const previewOrigins = [
  toOrigin(process.env.V0_RUNTIME_URL),
  toOrigin(process.env.V0_DEV_APP_URL),
  toOrigin(process.env.V0_BUILD_URL),
  toOrigin(process.env.V0_SANDBOX_URL),
].filter((origin): origin is string => Boolean(origin))

const isVercelPreview = process.env.VERCEL_ENV === 'preview'

const baseURL =
  process.env.BETTER_AUTH_URL ??
  (isVercelPreview ? toOrigin(process.env.VERCEL_URL) : undefined) ??
  toOrigin(process.env.VERCEL_PROJECT_PRODUCTION_URL) ??
  toOrigin(process.env.VERCEL_URL) ??
  toOrigin(process.env.V0_RUNTIME_URL) ??
  'http://localhost:3000'

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: authSchema,
  }),
  baseURL,
  trustedOrigins:
    process.env.NODE_ENV === 'development'
      ? ['http://localhost:3000', ...previewOrigins]
      : deploymentOrigins,
  emailAndPassword: {
    enabled: true,
  },
  ...(process.env.NODE_ENV === 'development'
    ? {
        advanced: {
          defaultCookieAttributes: {
            sameSite: 'none' as const,
            secure: true,
          },
        },
      }
    : {}),
})
