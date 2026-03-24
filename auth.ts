import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

if (!process.env.AUTH_SECRET) {
  throw new Error('AUTH_SECRET environment variable is required')
}

const nextAuthConfig = {
  trustHost: true,
  secret: process.env.AUTH_SECRET,
  providers: [
    Credentials({
      async authorize(credentials) {
        try {
          const parsedCredentials = z
            .object({ email: z.string().email(), password: z.string().min(6) })
            .safeParse(credentials)

          if (!parsedCredentials.success) {
            console.error('[Auth] Invalid credentials shape')
            return null
          }
          const { email, password } = parsedCredentials.data
          const user = await prisma.user.findUnique({ where: { email } })
          if (!user) {
            console.error('[Auth] User not found')
            return null
          }
          if (!user.password) {
            console.error('[Auth] User has no password set')
            return null
          }
          if (user.status !== 'ACTIVE') {
            console.error('[Auth] User not active:', user.status)
            return null
          }
          const passwordsMatch = await bcrypt.compare(password, user.password)
          if (!passwordsMatch) {
            console.error('[Auth] Password mismatch')
            return null
          }
          await prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() }
          })
          return user
        } catch (error) {
          console.error('[Auth] Error:', error)
          return null
        }
      },
    }),
  ],
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async redirect({ url, baseUrl }: { url: string; baseUrl: string }) {
      if (url.startsWith('/')) return `${baseUrl}${url}`
      if (new URL(url).origin === baseUrl) return url
      return baseUrl
    },
    async jwt({ token, user }: { token: any; user?: any }) {
      if (user) {
        token.id = user.id
        token.name = user.name
        token.role = user.role
        token.onboardingCompletedAt = user.onboardingCompletedAt?.toISOString() ?? undefined
        token.onboardingSkipCount = user.onboardingSkipCount ?? 0
        token.volunteerReviewStatus = user.volunteerReviewStatus ?? null
        return token
      }

      if (token.id) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id },
            select: { id: true, status: true, volunteerReviewStatus: true }
          })
          if (!dbUser) {
            console.log('[Auth] User deleted, invalidating session:', token.id)
            return null
          }
          if (dbUser.status !== 'ACTIVE') {
            console.log('[Auth] User deactivated, invalidating session:', token.id)
            return null
          }
          token.volunteerReviewStatus = dbUser.volunteerReviewStatus
        } catch (error) {
          console.error('[Auth] Database check failed:', error)
        }
      }

      return token
    },
    async session({ session, token }: { session: any; token: any }) {
      if (token && session.user) {
        session.user.role = token.role
        session.user.id = token.id
        session.user.name = token.name
        session.user.onboardingCompletedAt = token.onboardingCompletedAt
        session.user.onboardingSkipCount = token.onboardingSkipCount
        session.user.volunteerReviewStatus = token.volunteerReviewStatus
      }
      return session
    },
  },
  session: {
    strategy: "jwt" as const,
  },
}

// Export NextAuth - the TypeScript error about portable types is a known issue with NextAuth v5
// https://github.com/nextauthjs/next-auth/issues/11070
const nextAuthInstance = NextAuth(nextAuthConfig as any)
 
export const { handlers, signIn, signOut } = nextAuthInstance
export const auth = nextAuthInstance.auth as any
