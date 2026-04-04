import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { canMergeRoles, normalizeRoleList } from "@/lib/roles"

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
          const user = await prisma.user.findUnique({
            where: { email },
            include: {
              roleAssignments: {
                where: { isActive: true },
                orderBy: [
                  { isPrimary: 'desc' },
                  { assignedAt: 'asc' },
                ],
              },
            },
          })
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
          const assignedRoles = user.roleAssignments.map((assignment) => assignment.role)
          const normalizedAssignedRoles = normalizeRoleList(assignedRoles)

          // Repair guard: board cannot coexist with any other role.
          if (normalizedAssignedRoles.includes('BOARD')) {
            for (const role of normalizedAssignedRoles) {
              const check = canMergeRoles(['BOARD'], role)
              if (!check.ok && role !== 'BOARD') {
                console.error('[Auth] Invalid role assignment state for user:', user.id)
                return null
              }
            }
          }

          const primaryAssignment = user.roleAssignments.find((assignment) => assignment.isPrimary)
          const primaryRole = primaryAssignment?.role || user.role
          const roles = normalizedAssignedRoles.length > 0 ? normalizedAssignedRoles : [user.role]

          return {
            ...user,
            role: primaryRole,
            primaryRole,
            activeRole: primaryRole,
            roles,
          }
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
        token.roles = Array.isArray(user.roles) ? user.roles : [user.role]
        token.primaryRole = user.primaryRole || user.role
        token.activeRole = user.activeRole || token.primaryRole
        token.role = token.activeRole
        token.onboardingCompletedAt = user.onboardingCompletedAt?.toISOString() ?? undefined
        token.onboardingSkipCount = user.onboardingSkipCount ?? 0
        token.volunteerReviewStatus = user.volunteerReviewStatus ?? null
        return token
      }

      // Skip database check in JWT callback - this causes issues in Edge Runtime
      // The database status check will happen in server actions when needed
      // For now, we trust the token is valid once established
      if (token.id) {
        // Keep volunteerReviewStatus from initial login if available
        // This avoids Prisma calls in middleware which fail on Edge Runtime
        console.log('[Auth] Using cached session for user:', token.id)
      }

      if (!token.primaryRole && token.role) {
        token.primaryRole = token.role
      }
      if (!token.activeRole && token.role) {
        token.activeRole = token.role
      }
      if (!Array.isArray(token.roles) || token.roles.length === 0) {
        token.roles = token.role ? [token.role] : []
      }

      if (token.activeRole) {
        token.role = token.activeRole
      }

      return token
    },
    async session({ session, token }: { session: any; token: any }) {
      if (token && session.user) {
        session.user.role = token.role
        session.user.roles = token.roles || [token.role]
        session.user.primaryRole = token.primaryRole || token.role
        session.user.activeRole = token.activeRole || token.role
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
