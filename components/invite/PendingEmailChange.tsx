'use client'

import { Clock, Mail, AlertCircle } from 'lucide-react'

interface PendingEmailChangeProps {
  originalEmail: string
  requestedEmail: string
  bgBlobs: React.ReactNode
}

export function PendingEmailChange({ originalEmail, requestedEmail, bgBlobs }: PendingEmailChangeProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 relative overflow-hidden">
      {bgBlobs}
      
      <div className="w-full max-w-md relative z-10">
        <div className="bg-white/90 backdrop-blur rounded-2xl shadow-2xl p-8 border border-white/50">
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Email Change Pending Approval</h2>
            <p className="text-gray-600 mb-6">
              Your request to change your registration email is waiting for admin approval.
            </p>
            
            <div className="bg-gray-50 rounded-lg p-4 text-left space-y-3 mb-6">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-gray-400 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Original Email</p>
                  <p className="text-sm font-medium text-gray-900">{originalEmail}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-primary-500 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Requested Email</p>
                  <p className="text-sm font-medium text-primary-700">{requestedEmail}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <p className="font-semibold">What's Next?</p>
                  <p className="mt-1">
                    The administrator will review your request. If approved, you'll receive a new invitation link at <span className="font-medium">{requestedEmail}</span>.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="text-sm text-gray-500">
              <p>Need help? Contact support at</p>
              <p className="font-medium text-primary-600">info@artsandaging.com</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
