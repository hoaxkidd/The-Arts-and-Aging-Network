import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { ProfileForm } from "@/components/staff/ProfileForm"
import { Camera } from "lucide-react"

export default async function ProfilePage() {
  const session = await auth()
  if (!session?.user) return <div>Unauthorized</div>

  const prismaClient = prisma as any

  const user = await prismaClient.user.findUnique({
    where: { id: session.user.id },
    include: {
        documents: {
            orderBy: { createdAt: 'desc' }
        }
    }
  })

  if (!user) return <div>User not found</div>

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Banner Header */}
      <div className="relative rounded-lg overflow-hidden bg-white border border-gray-200">
        <div className="h-32 bg-gradient-to-r from-primary-600 to-primary-800"></div>
        <div className="px-8 pb-8 flex items-end -mt-12 gap-6 relative z-10">
          <div className="relative group cursor-pointer">
            {user.image ? (
              <img src={user.image} alt={user.name || 'User'} className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-md bg-white" />
            ) : (
              <div className="w-32 h-32 rounded-full bg-white flex items-center justify-center text-primary-600 text-4xl font-bold border-4 border-white shadow-md">
                {user.name?.[0] || 'U'}
              </div>
            )}
            <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="w-8 h-8 text-white" />
            </div>
          </div>
          <div className="flex-1 pb-2">
            <h1 className="text-3xl font-bold text-gray-900">{user.name}</h1>
            <div className="flex items-center gap-3 text-gray-500 mt-1">
               <span>{user.email}</span>
               <span>•</span>
               <span className="font-medium">{user.role}</span>
               <span>•</span>
               <span className={`px-2 py-0.5 text-xs font-bold rounded-full uppercase ${
                  user.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
               }`}>
                  {user.status}
               </span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <ProfileForm user={user} documents={user.documents || []} />
      </div>
    </div>
  )
}
