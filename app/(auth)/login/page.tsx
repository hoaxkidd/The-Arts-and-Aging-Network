'use client'

import { useActionState, useEffect } from 'react'
import { useFormStatus } from 'react-dom'
import { authenticate } from '@/app/actions/auth'
import { AlertCircle } from 'lucide-react'
import { STYLES } from "@/lib/styles"
import { cn } from "@/lib/utils"

function LoginButton() {
  const { pending } = useFormStatus()
  return (
    <button 
      className={cn(STYLES.btn, STYLES.btnPrimary, "w-full py-3 text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all")}
      disabled={pending}
    >
      {pending ? 'Logging in...' : 'Sign In'}
    </button>
  )
}

export default function LoginPage() {
  const [state, dispatch] = useActionState(authenticate, undefined as { error?: string; redirect?: string } | undefined)

  // Full-page redirect after successful login so the session cookie is sent on the next request
  useEffect(() => {
    if (state?.redirect) {
      window.location.href = state.redirect
    }
  }, [state?.redirect])

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-primary-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
      <div className="absolute top-0 right-0 w-64 h-64 bg-secondary-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-8 left-20 w-64 h-64 bg-primary-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>

      <div className="w-full max-w-md relative z-10">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-white/50">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-primary-900">Arts & Aging</h1>
            <p className="text-gray-600 mt-2">Admin Portal Access</p>
          </div>
          
          <form action={dispatch} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
              <input
                type="email"
                name="email"
                required
                className={cn(STYLES.input, "py-3")}
                placeholder="name@artsandaging.com"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
              <input
                type="password"
                name="password"
                required
                minLength={6}
                className={cn(STYLES.input, "py-3")}
                placeholder="••••••"
              />
            </div>
            
            {state?.error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-center gap-2 border border-red-100">
                <AlertCircle className="w-4 h-4" />
                {state.error}
              </div>
            )}
            
            <LoginButton />
          </form>
        </div>
        <p className="text-center text-gray-500 text-sm mt-6">
          Authorized personnel only. All actions are logged.
        </p>
      </div>
    </div>
  )
}
