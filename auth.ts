import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import type { User } from "@prisma/client"

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true, // Required for Vercel – uses request host for redirects
  providers: [
    Credentials({
      async authorize(credentials) {
        try {
            const parsedCredentials = z
            .object({ email: z.string().email(), password: z.string().min(6) })
            .safeParse(credentials)

            if (parsedCredentials.success) {
            const { email, password } = parsedCredentials.data
            const user = await prisma.user.findUnique({ where: { email } })
            if (!user) return null
            if (!user.password) return null
            if (user.status !== 'ACTIVE') return null

            const passwordsMatch = await bcrypt.compare(password, user.password)
            if (passwordsMatch) {
              // Update last login timestamp
              await prisma.user.update({
                where: { id: user.id },
                data: { lastLoginAt: new Date() }
              })
              return user
            }
            }
            return null
        } catch (error) {
            console.error('Auth Error:', error)
            return null
        }
      },
    }),
  ],
  pages: {
    signIn: '/login',
  },
  callbacks: {
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
