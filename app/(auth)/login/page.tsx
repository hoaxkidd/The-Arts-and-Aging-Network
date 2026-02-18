'use client'

import { useActionState, useEffect, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { authenticate, type AuthState } from '@/app/actions/auth'
import { AlertCircle, Eye, EyeOff } from 'lucide-react'
import { STYLES } from "@/lib/styles"
import { cn } from "@/lib/utils"

function LoginButton() {
  const { pending } = useFormStatus()
  return (
    <button 
      className={cn(STYLES.btn, STYLES.btnPrimary, "w-full py-3 min-h-[48px] text-base sm:text-lg shadow-lg hover:shadow-xl active:scale-[0.99] sm:hover:-translate-y-0.5 transition-all touch-manipulation")}
      disabled={pending}
    >
      {pending ? 'Logging in...' : 'Sign In'}
    </button>
  )
}

export default function LoginPage() {
  const [state, dispatch] = useActionState(authenticate, undefined as AuthState)
  const [showPassword, setShowPassword] = useState(false)

  // Full-page redirect after successful login so the session cookie is sent on the next request
  useEffect(() => {
    if (state?.redirect) {
      window.location.href = state.redirect
    }
  }, [state?.redirect])

  return (
    <div className="flex min-h-screen min-h-[100dvh] items-center justify-center bg-background p-4 sm:p-6 relative overflow-hidden safe-area-x safe-area-top safe-area-bottom">
      {/* Decorative background elements - reduced on mobile to avoid overcrowding */}
      <div className="absolute top-0 left-0 w-40 h-40 sm:w-64 sm:h-64 bg-primary-200 rounded-full mix-blend-multiply filter blur-xl opacity-50 sm:opacity-70 animate-blob -translate-x-1/2 -translate-y-1/2 sm:translate-x-0 sm:translate-y-0"></div>
      <div className="absolute top-0 right-0 w-40 h-40 sm:w-64 sm:h-64 bg-secondary-200 rounded-full mix-blend-multiply filter blur-xl opacity-50 sm:opacity-70 animate-blob animation-delay-2000 translate-x-1/2 -translate-y-1/2 sm:translate-x-0 sm:translate-y-0"></div>
      <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 sm:left-20 sm:translate-x-0 w-48 h-48 sm:w-64 sm:h-64 bg-primary-300 rounded-full mix-blend-multiply filter blur-xl opacity-40 sm:opacity-70 animate-blob animation-delay-4000"></div>

      <div className="w-full max-w-md relative z-10">
        <div className="bg-white/90 sm:bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl sm:shadow-2xl p-6 sm:p-8 border border-white/50">
          <div className="text-center mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-primary-900">Arts & Aging</h1>
            <p className="text-gray-600 mt-1 sm:mt-2 text-sm sm:text-base">Admin Portal Access</p>
          </div>
          
          <form action={dispatch} className="space-y-5 sm:space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">Email Address</label>
              <input
                type="email"
                name="email"
                required
                inputMode="email"
                autoComplete="email"
                className={cn(STYLES.input, "py-3 text-base min-h-[44px] touch-manipulation")}
                placeholder="name@artsandaging.com"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  required
                  minLength={6}
                  autoComplete="current-password"
                  className={cn(STYLES.input, "py-3 pr-14 sm:pr-12 text-base min-h-[44px] touch-manipulation")}
                  placeholder="••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-1 top-1/2 -translate-y-1/2 min-w-[44px] min-h-[44px] flex items-center justify-center -mr-1 text-gray-500 hover:text-gray-700 active:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500/50 rounded-lg touch-manipulation"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            
            {state?.error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-center gap-2 border border-red-100">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {state.error}
              </div>
            )}
            
            <LoginButton />
          </form>
        </div>
        <p className="text-center text-gray-500 text-xs sm:text-sm mt-4 sm:mt-6 px-2">
          Authorized personnel only. All actions are logged.
        </p>
      </div>
    </div>
  )
}
