'use client'

import { useActionState, useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { forgotPassword } from '@/app/actions/auth'
import { AlertCircle, CheckCircle, ArrowLeft, Mail } from 'lucide-react'
import { STYLES } from '@/lib/styles'
import { cn } from '@/lib/utils'
import Link from 'next/link'

type ForgotPasswordState = { success?: boolean; error?: string } | undefined

async function wrappedForgotPassword(
  _prevState: ForgotPasswordState,
  formData: FormData
): Promise<ForgotPasswordState> {
  return forgotPassword(formData)
}

function ForgotPasswordForm() {
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/login'
  
  const [state, formAction] = useActionState(wrappedForgotPassword, undefined)
  
  useEffect(() => {
    if (state?.success) {
      const timer = setTimeout(() => {
        window.location.href = callbackUrl
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [state?.success, callbackUrl])

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
            <h1 className="text-2xl font-bold text-primary-900 mb-2">Check Your Email</h1>
            <p className="text-gray-600 mb-6">
              If an account exists with that email, we&apos;ve sent password reset instructions.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Redirecting you to sign in...
            </p>
            <Link 
              href={callbackUrl}
              className={cn(STYLES.btn, STYLES.btnSecondary, "w-full")}
            >
              Back to Sign In
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
            <Link 
              href={callbackUrl}
              className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6 -mt-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Sign In
            </Link>
            
            <div className="text-center mb-6 sm:mb-8">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-primary-600" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-primary-900">Forgot Password?</h1>
              <p className="text-gray-600 mt-1 sm:mt-2 text-sm sm:text-base">
                Enter your email and we&apos;ll send you reset instructions.
              </p>
            </div>
            
            <form action={formAction} className="space-y-5 sm:space-y-6">
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
                Send Reset Link
              </button>
            </form>
          </div>
        </div>
        <p className="text-center text-gray-500 text-xs sm:text-sm mt-4 sm:mt-6 px-2">
          Remember your password?{' '}
          <Link href={callbackUrl} className="text-primary-600 hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  )
}

function LoadingFallback() {
  return (
    <div className="flex min-h-screen min-h-[100dvh] items-center justify-center bg-background p-4 sm:p-6">
      <div className="w-full max-w-md">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl overflow-hidden border border-white/50 p-12 flex items-center justify-center">
          <div className="animate-pulse text-gray-400">Loading...</div>
        </div>
      </div>
    </div>
  )
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ForgotPasswordForm />
    </Suspense>
  )
}
