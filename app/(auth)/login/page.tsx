'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { AlertCircle, Eye, EyeOff, LogIn, Building2 } from 'lucide-react'
import { STYLES } from "@/lib/styles"
import { cn } from "@/lib/utils"
import { HomeRegistrationForm } from '@/components/forms/HomeRegistrationForm'

function LoginPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const tabParam = searchParams.get('tab')
  const [activeTab, setActiveTab] = useState<'login' | 'register'>(tabParam === 'register' ? 'register' : 'login')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const setTab = (tab: 'login' | 'register') => {
    setActiveTab(tab)
    setError(null)
    const url = tab === 'register' ? '/login?tab=register' : '/login'
    router.replace(url, { scroll: false })
  }

  // Sync tab with URL on mount/navigation
  useEffect(() => {
    setActiveTab(tabParam === 'register' ? 'register' : 'login')
  }, [tabParam])

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const form = e.currentTarget
    const email = (form.querySelector<HTMLInputElement>('[name="email"]')?.value ?? '').trim()
    const password = form.querySelector<HTMLInputElement>('[name="password"]')?.value ?? ''
    const callbackUrl = (form.querySelector<HTMLInputElement>('[name="callbackUrl"]')?.value) || '/'
    if (!email || !password) {
      setError('Please enter email and password.')
      return
    }
    setPending(true)
    try {
      const result = await signIn('credentials', {
        email,
        password,
        callbackUrl,
        redirect: false,
      })
      if (result?.ok && result.url) {
        const url = result.url
        if (url.includes('/api/auth/error') || url.includes('error=')) {
          setError(result.error === 'CredentialsSignin' ? 'Invalid credentials.' : 'Something went wrong.')
          setPending(false)
          return
        }
        window.location.href = url
        return
      }
      setError(result?.error === 'CredentialsSignin' ? 'Invalid credentials.' : result?.error ?? 'Sign-in failed.')
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[Login]', err)
      }
      setError('Something went wrong. Please try again.')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex min-h-screen min-h-[100dvh] items-center justify-center bg-background p-4 sm:p-6 relative overflow-hidden safe-area-x safe-area-top safe-area-bottom">
      {/* Decorative background elements */}
      <div className="absolute top-0 left-0 w-40 h-40 sm:w-64 sm:h-64 bg-primary-200 rounded-full mix-blend-multiply filter blur-xl opacity-50 sm:opacity-70 animate-blob -translate-x-1/2 -translate-y-1/2 sm:translate-x-0 sm:translate-y-0"></div>
      <div className="absolute top-0 right-0 w-40 h-40 sm:w-64 sm:h-64 bg-secondary-200 rounded-full mix-blend-multiply filter blur-xl opacity-50 sm:opacity-70 animate-blob animation-delay-2000 translate-x-1/2 -translate-y-1/2 sm:translate-x-0 sm:translate-y-0"></div>
      <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 sm:left-20 sm:translate-x-0 w-48 h-48 sm:w-64 sm:h-64 bg-primary-300 rounded-full mix-blend-multiply filter blur-xl opacity-40 sm:opacity-70 animate-blob animation-delay-4000"></div>

      <div className={cn("w-full relative z-10", activeTab === 'register' ? 'max-w-2xl' : 'max-w-md')}>
        <div className="bg-white/90 sm:bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl sm:shadow-2xl overflow-hidden border border-white/50">
          {/* Tab Bar */}
          <div className="flex border-b border-gray-200">
            <button
              type="button"
              onClick={() => setTab('login')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-4 text-sm font-medium transition-colors min-h-[48px] touch-manipulation",
                activeTab === 'login'
                  ? "bg-white text-primary-600 border-b-2 border-primary-500"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50/50"
              )}
            >
              <LogIn className="w-4 h-4" />
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setTab('register')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-4 text-sm font-medium transition-colors min-h-[48px] touch-manipulation",
                activeTab === 'register'
                  ? "bg-white text-primary-600 border-b-2 border-primary-500"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50/50"
              )}
            >
              <Building2 className="w-4 h-4" />
              Register Facility
            </button>
          </div>

          {activeTab === 'login' ? (
            <div className="p-6 sm:p-8">
              <div className="text-center mb-6 sm:mb-8">
                <h1 className="text-2xl sm:text-3xl font-bold text-primary-900">Arts & Aging</h1>
                <p className="text-gray-600 mt-1 sm:mt-2 text-sm sm:text-base">Admin Portal Access</p>
              </div>
              
              <form onSubmit={handleLogin} className="space-y-5 sm:space-y-6">
                <input type="hidden" name="callbackUrl" value={searchParams.get('callbackUrl') || '/'} />
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
                
                {error && (
                  <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-center gap-2 border border-red-100">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {error}
                  </div>
                )}
                
                <button
                  type="submit"
                  disabled={pending}
                  className={cn(STYLES.btn, STYLES.btnPrimary, "w-full py-3 min-h-[48px] text-base sm:text-lg shadow-lg hover:shadow-xl active:scale-[0.99] sm:hover:-translate-y-0.5 transition-all touch-manipulation")}
                >
                  {pending ? 'Logging in...' : 'Sign In'}
                </button>
              </form>
            </div>
          ) : (
            <div className="max-h-[calc(100dvh-220px)] overflow-y-auto">
              <HomeRegistrationForm embedded />
            </div>
          )}
        </div>
        <p className="text-center text-gray-500 text-xs sm:text-sm mt-4 sm:mt-6 px-2">
          {activeTab === 'login'
            ? 'Authorized personnel only. All actions are logged.'
            : 'Already have an account? Switch to Sign In above.'}
        </p>
      </div>
    </div>
  )
}

function LoginPageFallback() {
  return (
    <div className="flex min-h-screen min-h-[100dvh] items-center justify-center bg-background p-4 sm:p-6 relative overflow-hidden">
      <div className="w-full max-w-md">
        <div className="bg-white/90 sm:bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl overflow-hidden border border-white/50 p-12 flex items-center justify-center">
          <div className="animate-pulse text-gray-400">Loading...</div>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginPageFallback />}>
      <LoginPageContent />
    </Suspense>
  )
}
