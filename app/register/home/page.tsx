import { HomeRegistrationForm } from "@/components/forms/HomeRegistrationForm"
import { Building } from "lucide-react"
import Link from "next/link"

export default function GeriatricHomeRegistrationPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto mb-8 text-center">
        <Link href="/" className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary-600 text-white mb-6 shadow-lg">
            <Building className="w-6 h-6" />
        </Link>
        <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
          Partner with Arts & Aging
        </h1>
        <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
          Register your geriatric home to access our network of artists, manage events, and enrich the lives of your residents.
        </p>
      </div>

      <HomeRegistrationForm />
      
      <p className="text-center text-sm text-gray-500 mt-8">
        Already have an account? <Link href="/login" className="font-medium text-primary-600 hover:text-primary-500">Sign in</Link>
      </p>
    </div>
  )
}
