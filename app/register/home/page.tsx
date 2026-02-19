import { HomeRegistrationForm } from "@/components/forms/HomeRegistrationForm"
import { Building2 } from "lucide-react"
import Link from "next/link"

export default function GeriatricHomeRegistrationPage() {
  return (
    <div className="flex min-h-screen min-h-[100dvh] items-center justify-center bg-background p-4 sm:p-6 relative overflow-hidden safe-area-x safe-area-top safe-area-bottom">
      {/* Decorative background - matches login page */}
      <div className="absolute top-0 left-0 w-40 h-40 sm:w-64 sm:h-64 bg-primary-200 rounded-full mix-blend-multiply filter blur-xl opacity-50 sm:opacity-70 animate-blob -translate-x-1/2 -translate-y-1/2 sm:translate-x-0 sm:translate-y-0" />
      <div className="absolute top-0 right-0 w-40 h-40 sm:w-64 sm:h-64 bg-secondary-200 rounded-full mix-blend-multiply filter blur-xl opacity-50 sm:opacity-70 animate-blob animation-delay-2000 translate-x-1/2 -translate-y-1/2 sm:translate-x-0 sm:translate-y-0" />
      <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 sm:left-20 sm:translate-x-0 w-48 h-48 sm:w-64 sm:h-64 bg-primary-300 rounded-full mix-blend-multiply filter blur-xl opacity-40 sm:opacity-70 animate-blob animation-delay-4000" />

      <div className="w-full max-w-2xl relative z-10">
        <div className="bg-white/90 sm:bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl sm:shadow-2xl overflow-hidden border border-white/50">
          {/* Header */}
          <div className="px-6 sm:px-8 pt-6 sm:pt-8 pb-4 text-center">
            <Link
              href="/login"
              className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary-600 text-white mb-4 shadow-lg hover:bg-primary-700 transition-colors"
            >
              <Building2 className="w-6 h-6" />
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold text-primary-900">
              Partner with Arts & Aging
            </h1>
            <p className="mt-2 text-sm sm:text-base text-gray-600 max-w-xl mx-auto">
              Register your facility to access our network of artists, manage events, and enrich the lives of your residents.
            </p>
          </div>

          <HomeRegistrationForm embedded />
        </div>

        <p className="text-center text-gray-500 text-xs sm:text-sm mt-4 sm:mt-6 px-2">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary-600 hover:text-primary-500">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
