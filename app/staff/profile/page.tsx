import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { User, Mail, Shield, Calendar, CheckCircle } from "lucide-react"

const db = prisma as any

export default async function StaffProfilePage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: {
      _count: {
        select: {
          eventAttendances: true
        }
      }
    }
  })

  // Get attendance stats
  const attendanceStats = await db.eventAttendance.aggregate({
    where: {
      userId: session.user.id,
      status: 'YES'
    },
    _count: true
  })

  const checkInStats = await db.eventAttendance.aggregate({
    where: {
      userId: session.user.id,
      checkInTime: { not: null }
    },
    _count: true
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <p className="text-gray-600 mt-1">View your account information and statistics.</p>
      </div>

      {/* Profile Card */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-white text-2xl font-bold">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="text-white">
              <h2 className="text-xl font-bold">{user?.name}</h2>
              <p className="text-purple-200">{user?.role}</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3 text-gray-600">
            <Mail className="w-5 h-5 text-gray-400" />
            <span>{user?.email}</span>
          </div>
          <div className="flex items-center gap-3 text-gray-600">
            <Shield className="w-5 h-5 text-gray-400" />
            <span>Role: {user?.role}</span>
          </div>
          <div className="flex items-center gap-3 text-gray-600">
            <Calendar className="w-5 h-5 text-gray-400" />
            <span>Member since {new Date(user?.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Events Confirmed</p>
              <p className="text-2xl font-bold text-gray-900">{attendanceStats._count}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Check-ins Completed</p>
              <p className="text-2xl font-bold text-gray-900">{checkInStats._count}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-700">
          To update your profile information, please contact an administrator.
        </p>
      </div>
    </div>
  )
}
