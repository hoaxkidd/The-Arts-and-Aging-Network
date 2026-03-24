'use client'

import { useActionState, useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { resetPassword, type ResetPasswordState } from '@/app/actions/auth'
import { AlertCircle, CheckCircle, Eye, EyeOff, KeyRound } from 'lucide-react'
import { STYLES } from '@/lib/styles'
import { cn } from '@/lib/utils'
import Link from 'next/link'

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || ''
  
  const [state, formAction] = useActionState(resetPassword as (state: ResetPasswordState, formData: FormData) => Promise<ResetPasswordState>, undefined)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [checkingToken, setCheckingToken] = useState(true)
  const [tokenValid, setTokenValid] = useState(false)
  const [tokenError, setTokenError] = useState('')

  useEffect(() => {
    if (!token) {
      setCheckingToken(false)
      setTokenError('No reset token provided.')
      return
    }

    async function checkToken() {
      try {
        const res = await fetch(`/api/auth/validate-reset-token?token=${encodeURIComponent(token)}`)
        const data = await res.json()
        if (data.valid) {
          setTokenValid(true)
        } else {
          setTokenError('This reset link has expired or is invalid.')
        }
      } catch {
        setTokenError('Failed to validate reset link.')
      } finally {
        setCheckingToken(false)
      }
    }

    checkToken()
  }, [token])

  useEffect(() => {
    if (state?.success) {
      const timer = setTimeout(() => {
        window.location.href = '/login'
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [state?.success])

  if (checkingToken) {
    return (
      <div className="flex min-h-screen min-h-[100dvh] items-center justify-center bg-background p-4 sm:p-6">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Validating reset link...</p>
        </div>
      </div>
    )
  }

  if (tokenError) {
    return (
      <div className="flex min-h-screen min-h-[100dvh] items-center justify-center bg-background p-4 sm:p-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-40 h-40 sm:w-64 sm:h-64 bg-primary-200 rounded-full mix-blend-multiply filter blur-xl opacity-50 sm:opacity-70 animate-blob -translate-x-1/2 -translate-y-1/2 sm:translate-x-0 sm:translate-y-0"></div>
        <div className="absolute top-0 right-0 w-40 h-40 sm:w-64 sm:h-64 bg-secondary-200 rounded-full mix-blend-multiply filter blur-xl opacity-50 sm:opacity-70 animate-blob animation-delay-2000 translate-x-1/2 -translate-y-1/2 sm:translate-x-0 sm:translate-y-0"></div>

        <div className="w-full relative z-10 max-w-md">
          <div className="bg-white/90 sm:bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl sm:shadow-2xl overflow-hidden border border-white/50 p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-primary-900 mb-2">Invalid Reset Link</h1>
            <p className="text-gray-600 mb-6">
              {tokenError}
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Please request a new password reset link.
            </p>
            <Link 
              href="/auth/forgot-password"
              className={cn(STYLES.btn, STYLES.btnPrimary, "w-full")}
            >
              Request New Link
            </Link>
            <div className="mt-4">
              <Link 
                href="/login"
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Back to Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (state?.success) {
    return (
      <div className="flex min-h-screen min-h-[100dvh] items-center justify-center bg-background p-4 sm:p-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-40 h-40 sm:w-64 sm:h-64 bg-primary-200 rounded-full mix-blend-multiply filter blur-xl opacity-50 sm:opacity-70 animate-blob -translate-x-1/2 -translate-y-1/2 sm:translate-x-0 sm:translate-y-0"></div>
        <div className="absolute top-0 right-0 w-40 h-40 sm:w-64 sm:h-64 bg-secondary-200 rounded-full mix-blend-multiply filter blur-xl opacity-50 sm:opacity-70 animate-blob animation-delay-2000 translate-x-1/2 -translate-y-1/2 sm:translate-x-0 sm:translate-y-0"></div>

        <div className="w-full relative z-10 max-w-md">
          <div className="bg-white/90 sm:bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl sm:shadow-2xl overflow-hidden border border-white/50 p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-primary-900 mb-2">Password Reset!</h1>
            <p className="text-gray-600 mb-6">
              Your password has been successfully reset.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Redirecting you to sign in...
            </p>
            <Link 
              href="/login"
              className={cn(STYLES.btn, STYLES.btnPrimary, "w-full")}
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen min-h-[100dvh] items-center justify-center bg-background p-4 sm:p-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-40 h-40 sm:w-64 sm:h-64 bg-primary-200 rounded-full mix-blend-multiply filter blur-xl opacity-50 sm:opacity-70 animate-blob -translate-x-1/2 -translate-y-1/2 sm:translate-x-0 sm:translate-y-0"></div>
      <div className="absolute top-0 right-0 w-40 h-40 sm:w-64 sm:h-64 bg-secondary-200 rounded-full mix-blend-multiply filter blur-xl opacity-50 sm:opacity-70 animate-blob animation-delay-2000 translate-x-1/2 -translate-y-1/2 sm:translate-x-0 sm:translate-y-0"></div>

      <div className="w-full relative z-10 max-w-md">
        <div className="bg-white/90 sm:bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl sm:shadow-2xl overflow-hidden border border-white/50">
          <div className="p-6 sm:p-8">
            <div className="text-center mb-6 sm:mb-8">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <KeyRound className="w-8 h-8 text-primary-600" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-primary-900">New Password</h1>
              <p className="text-gray-600 mt-1 sm:mt-2 text-sm sm:text-base">
                Enter your new password below.
              </p>
            </div>
            
            <form action={formAction} className="space-y-5 sm:space-y-6">
              <input type="hidden" name="token" value={token} />
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">New Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    required
                    minLength={6}
                    autoComplete="new-password"
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
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">Confirm Password</label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    name="confirmPassword"
                    required
                    minLength={6}
                    autoComplete="new-password"
                    className={cn(STYLES.input, "py-3 pr-14 sm:pr-12 text-base min-h-[44px] touch-manipulation")}
                    placeholder="••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((prev) => !prev)}
                    className="absolute right-1 top-1/2 -translate-y-1/2 min-w-[44px] min-h-[44px] flex items-center justify-center -mr-1 text-gray-500 hover:text-gray-700 active:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500/50 rounded-lg touch-manipulation"
                    aria-label={showConfirm ? 'Hide password' : 'Show password'}
                  >
                    {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              
              {state?.error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-center gap-2 border border-red-100">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {state.error}
                </div>
              )}
              
              <button 
                type="submit" 
                className={cn(STYLES.btn, STYLES.btnPrimary, "w-full py-3 min-h-[48px] text-base sm:text-lg shadow-lg hover:shadow-xl active:scale-[0.99] sm:hover:-translate-y-0.5 transition-all touch-manipulation")}
              >
                Reset Password
              </button>
            </form>
            
            <div className="mt-6 text-center">
              <Link 
                href="/login"
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Back to Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function LoadingFallback() {
  return (
    <div className="flex min-h-screen min-h-[100dvh] items-center justify-center bg-background p-4 sm:p-6">
      <div className="text-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ResetPasswordForm />
    </Suspense>
  )
}
