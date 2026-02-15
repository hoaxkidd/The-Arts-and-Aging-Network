'use client'

import { useState } from 'react'
import { registerGeriatricHome } from '@/app/actions/home-registration'
import { Building2, User, Phone, ShieldAlert, CheckCircle, ArrowRight, ArrowLeft } from 'lucide-react'

export function HomeRegistrationForm() {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Field validation helper
  const validateStep = (currentStep: number) => {
    const form = document.querySelector('form')
    if (!form) return false

    // Get inputs for current step only
    const stepContainer = form.querySelector(`div[data-step="${currentStep}"]`)
    if (!stepContainer) return false

    const inputs = stepContainer.querySelectorAll('input, textarea, select')
    let isValid = true

    inputs.forEach((input) => {
        if (!(input as HTMLInputElement).checkValidity()) {
            (input as HTMLInputElement).reportValidity()
            isValid = false
        }
    })

    return isValid
  }

  const handleNext = () => {
    if (validateStep(step)) {
        setStep(prev => prev + 1)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    // Final validation for all steps
    if (!validateStep(3)) return

    setLoading(true)
    setError('')
    
    try {
        const formData = new FormData(e.currentTarget)
        const result = await registerGeriatricHome(formData)
        
        if (result?.error) {
          setError(result.error)
          setLoading(false)
        }
    } catch (err) {
        setError('An unexpected error occurred. Please try again.')
        setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden max-w-2xl mx-auto border border-gray-100">
      {/* Progress Bar */}
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
            <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step >= 1 ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-500'}`}>1</span>
            <span className="text-sm font-medium text-gray-600 hidden sm:block">Account</span>
        </div>
        <div className={`h-1 flex-1 mx-4 rounded-full ${step >= 2 ? 'bg-primary-600' : 'bg-gray-200'}`}></div>
        <div className="flex items-center gap-2">
            <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step >= 2 ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-500'}`}>2</span>
            <span className="text-sm font-medium text-gray-600 hidden sm:block">Facility</span>
        </div>
        <div className={`h-1 flex-1 mx-4 rounded-full ${step >= 3 ? 'bg-primary-600' : 'bg-gray-200'}`}></div>
        <div className="flex items-center gap-2">
            <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step >= 3 ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-500'}`}>3</span>
            <span className="text-sm font-medium text-gray-600 hidden sm:block">Operations</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-8" noValidate>
        {/* Step 1: Account Info */}
        <div data-step="1" className={step === 1 ? 'block space-y-6' : 'hidden'}>
            <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900">Create Administrator Account</h2>
                <p className="text-gray-500 mt-2">Set up your login credentials to manage the home profile.</p>
            </div>

            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                    <div className="relative">
                        <User className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                        <input name="name" required className="pl-10 w-full rounded-lg border-gray-300 focus:ring-primary-500 focus:border-primary-500" placeholder="John Doe" />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                    <input type="email" name="email" required className="w-full rounded-lg border-gray-300 focus:ring-primary-500 focus:border-primary-500" placeholder="admin@carehome.com" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                    <input type="password" name="password" required className="w-full rounded-lg border-gray-300 focus:ring-primary-500 focus:border-primary-500" placeholder="••••••••" />
                </div>
            </div>
            
            <div className="pt-6 flex justify-end">
                <button type="button" onClick={handleNext} className="bg-primary-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-primary-700 flex items-center gap-2">
                    Next Step <ArrowRight className="w-4 h-4" />
                </button>
            </div>
        </div>

        {/* Step 2: Facility Details */}
        <div data-step="2" className={step === 2 ? 'block space-y-6' : 'hidden'}>
            <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900">Facility Information</h2>
                <p className="text-gray-500 mt-2">Tell us about your geriatric home.</p>
            </div>

            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Home Name</label>
                    <div className="relative">
                        <Building2 className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                        <input name="homeName" required className="pl-10 w-full rounded-lg border-gray-300 focus:ring-primary-500 focus:border-primary-500" placeholder="Sunrise Care Home" />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Physical Address</label>
                    <textarea name="address" required rows={3} className="w-full rounded-lg border-gray-300 focus:ring-primary-500 focus:border-primary-500" placeholder="123 Care Lane, Springfield..." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Current Residents</label>
                        <input type="number" name="residentCount" required className="w-full rounded-lg border-gray-300 focus:ring-primary-500 focus:border-primary-500" placeholder="45" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Max Capacity</label>
                        <input type="number" name="maxCapacity" required className="w-full rounded-lg border-gray-300 focus:ring-primary-500 focus:border-primary-500" placeholder="60" />
                    </div>
                </div>
            </div>

            <div className="pt-6 flex justify-between">
                <button type="button" onClick={() => setStep(1)} className="text-gray-600 px-6 py-2 font-medium flex items-center gap-2 hover:text-gray-900">
                    <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button type="button" onClick={handleNext} className="bg-primary-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-primary-700 flex items-center gap-2">
                    Next Step <ArrowRight className="w-4 h-4" />
                </button>
            </div>
        </div>

        {/* Step 3: Contact & Operations */}
        <div data-step="3" className={step === 3 ? 'block space-y-6' : 'hidden'}>
            <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900">Key Personnel & Operations</h2>
                <p className="text-gray-500 mt-2">Emergency contacts and special considerations.</p>
            </div>

            <div className="space-y-6">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                    <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                        <User className="w-4 h-4" /> Primary Contact Person
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input name="contactName" required placeholder="Full Name" className="rounded-md border-gray-300 text-sm" />
                        <input name="contactPosition" required placeholder="Position/Title" className="rounded-md border-gray-300 text-sm" />
                        <input name="contactEmail" type="email" required placeholder="Email" className="rounded-md border-gray-300 text-sm" />
                        <input name="contactPhone" required placeholder="Phone Number" className="rounded-md border-gray-300 text-sm" />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4 text-red-500" /> Emergency Protocols
                    </label>
                    <textarea name="emergencyProtocol" rows={2} className="w-full rounded-lg border-gray-300 focus:ring-primary-500 focus:border-primary-500" placeholder="E.g., Evacuation point A, Hospital transport via..." />
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Special Considerations / Triggers</label>
                    <textarea name="specialNeeds" rows={2} className="w-full rounded-lg border-gray-300 focus:ring-primary-500 focus:border-primary-500" placeholder="Medical conditions, accessibility needs, noise sensitivity..." />
                </div>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-medium">
                    {error}
                </div>
            )}

            <div className="pt-6 flex justify-between">
                <button type="button" onClick={() => setStep(2)} className="text-gray-600 px-6 py-2 font-medium flex items-center gap-2 hover:text-gray-900">
                    <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button type="submit" disabled={loading} className="bg-green-600 text-white px-8 py-2 rounded-lg font-bold hover:bg-green-700 flex items-center gap-2 shadow-lg hover:shadow-xl transition-all disabled:opacity-50">
                    {loading ? 'Registering...' : (
                        <>Complete Registration <CheckCircle className="w-4 h-4" /></>
                    )}
                </button>
            </div>
        </div>
      </form>
    </div>
  )
}
