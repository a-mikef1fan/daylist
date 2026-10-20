import { betterAuth } from 'better-auth'
import { APIError, createAuthMiddleware } from 'better-auth/api'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { db } from '@/lib/db'
import { authSchema } from '@/lib/db/schema'
import { GOOGLE_TASKS_SCOPE, isGoogleConfigured } from '@/lib/google-tasks'

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

const vercelPreviewURL =
  process.env.VERCEL_ENV === 'preview'
    ? (toOrigin(process.env.VERCEL_BRANCH_URL) ??
      toOrigin(process.env.VERCEL_URL))
    : undefined

const baseURL =
  vercelPreviewURL ??
  process.env.BETTER_AUTH_URL ??
  toOrigin(process.env.VERCEL_PROJECT_PRODUCTION_URL) ??
  toOrigin(process.env.VERCEL_URL) ??
  toOrigin(process.env.V0_RUNTIME_URL) ??
  'http://localhost:3000'

// Google is registered only when its credentials are set, so the app builds and
// runs without them. It is used to connect Google Tasks to an existing account,
// not as a way to sign in or sign up (see the hook below).
const googleProvider = isGoogleConfigured()
  ? {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID as string,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
        scope: [GOOGLE_TASKS_SCOPE],
        // A refresh token is only issued with offline access and a consent prompt.
        accessType: 'offline' as const,
        prompt: 'consent' as const,
        disableSignUp: true,
      },
    }
  : {}

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
  socialProviders: googleProvider,
  account: {
    accountLinking: {
      enabled: true,
      // The Google account used for Tasks need not share the Daylist email.
      allowDifferentEmails: true,
      // Never merge a Google sign-in into an existing account by email match.
      disableImplicitLinking: true,
    },
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path === '/sign-in/social') {
        throw new APIError('FORBIDDEN', { message: 'Google can only be connected from inside the app.' })
      }
    }),
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
