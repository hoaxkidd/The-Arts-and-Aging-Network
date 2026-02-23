import NextAuth, { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: string
      onboardingCompletedAt?: string | null
      onboardingSkipCount?: number
    } & DefaultSession["user"]
  }

  interface User {
    role: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: string
    id: string
    onboardingCompletedAt?: string | null
    onboardingSkipCount?: number
  }
}
