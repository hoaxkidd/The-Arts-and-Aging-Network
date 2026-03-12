import { auth } from "@/auth"
import { MessageSquare, Calendar } from "lucide-react"

export default async function EngagementPage() {
  const session = await auth()
  
  return (
    <div className="h-full flex flex-col">
      <div className="flex-shrink-0 pb-3 mb-3 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary-100 text-primary-600 flex items-center justify-center">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Engagement & Feedback</h1>
            <p className="text-sm text-gray-500 mt-1">Connect with the Arts & Aging team and share your thoughts.</p>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Request Meeting */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center mb-4">
                    <Calendar className="w-6 h-6 text-blue-600" />
                </div>
                <h2 className="text-lg font-bold text-gray-900 mb-2">Request a Meeting</h2>
                <p className="text-sm text-gray-500 mb-6">
                    Need to discuss program details, contracts, or partnership opportunities? Schedule a time with our Executive Director.
                </p>
                <button className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors">
                    Book a Time
                </button>
            </div>

            {/* Feedback */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center mb-4">
                    <MessageSquare className="w-6 h-6 text-purple-600" />
                </div>
                <h2 className="text-lg font-bold text-gray-900 mb-2">Provide Feedback</h2>
                <p className="text-sm text-gray-500 mb-6">
                    We value your input! Let us know how recent events went or suggest improvements for future programs.
                </p>
                <button className="w-full bg-purple-600 text-white py-2 rounded-lg font-medium hover:bg-purple-700 transition-colors">
                    Share Feedback
                </button>
            </div>
          </div>

          {/* Quick Links */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Quick Links</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <a href="#" className="block p-4 bg-white rounded-lg border border-gray-200 hover:border-primary-300 transition-colors">
                    <h4 className="font-medium text-gray-900">Program Calendar</h4>
                    <p className="text-xs text-gray-500 mt-1">View Schedule</p>
                </a>
                <a href="#" className="block p-4 bg-white rounded-lg border border-gray-200 hover:border-primary-300 transition-colors">
                    <h4 className="font-medium text-gray-900">Staff Directory</h4>
                    <p className="text-xs text-gray-500 mt-1">Contact Team</p>
                </a>
                <a href="#" className="block p-4 bg-white rounded-lg border border-gray-200 hover:border-primary-300 transition-colors">
                    <h4 className="font-medium text-gray-900">Photo Waiver</h4>
                    <p className="text-xs text-gray-500 mt-1">Download Form</p>
                </a>
                <a href="#" className="block p-4 bg-white rounded-lg border border-gray-200 hover:border-primary-300 transition-colors">
                    <h4 className="font-medium text-gray-900">Safety Policy</h4>
                    <p className="text-xs text-gray-500 mt-1">View Policy</p>
                </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
