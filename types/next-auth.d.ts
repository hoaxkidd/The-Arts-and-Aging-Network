import { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: string
      roles?: string[]
      primaryRole?: string
      activeRole?: string
      onboardingCompletedAt?: string | null
      onboardingSkipCount?: number
      volunteerReviewStatus?: string | null
    } & DefaultSession["user"]
  }

  interface User {
    role: string
    roles?: string[]
    primaryRole?: string
    activeRole?: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: string
    roles?: string[]
    primaryRole?: string
    activeRole?: string
    id: string
    onboardingCompletedAt?: string | null
    onboardingSkipCount?: number
    volunteerReviewStatus?: string | null
  }
}
