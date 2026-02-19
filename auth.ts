import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import type { User } from "@prisma/client"

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true, // Required for Vercel – uses request host for redirects
  secret: process.env.AUTH_SECRET, // Required: use a fixed secret so sessions stay valid across restarts
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        try {
          const parsedCredentials = z
            .object({ email: z.string().email(), password: z.string().min(6) })
            .safeParse(credentials)

          if (!parsedCredentials.success) {
            console.error('[Auth] Invalid credentials shape:', parsedCredentials.error.flatten())
            return null
          }
          const { email, password } = parsedCredentials.data
          const emailNorm = email.trim().toLowerCase()
          const user = await prisma.user.findUnique({ where: { email: emailNorm } })
          if (!user) {
            console.error('[Auth] User not found:', email)
            return null
          }
          if (!user.password) {
            console.error('[Auth] User has no password set:', email)
            return null
          }
          if (user.status !== 'ACTIVE') {
            console.error('[Auth] User not active:', email, 'status=', user.status)
            return null
          }
          const passwordsMatch = await bcrypt.compare(password, user.password)
          if (!passwordsMatch) {
            console.error('[Auth] Password mismatch for:', email)
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
    async redirect({ url, baseUrl }) {
      // Allow relative callbackUrl from signIn
      if (url.startsWith('/')) return `${baseUrl}${url}`
      if (new URL(url).origin === baseUrl) return url
      return baseUrl
    },
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
        token.id = user.id
      }
      // Refresh name and role from DB to keep session in sync with profile changes
      if (token.id) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { name: true, role: true }
          })
          if (dbUser) {
            token.name = dbUser.name
            token.role = dbUser.role
          }
        } catch {
          // Silently continue with existing token data if DB query fails
        }
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.role = token.role as string
        session.user.id = token.id as string
        session.user.name = token.name as string
      }
      return session
    },
  },
  session: {
    strategy: "jwt",
  },
})
