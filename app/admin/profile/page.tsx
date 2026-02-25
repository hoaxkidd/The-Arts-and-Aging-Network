import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { updateStaffProfile } from "@/app/actions/staff"
import { Save, UserCircle, Phone, Mail, FileText, Camera } from "lucide-react"
import { STYLES } from "@/lib/styles"
import { cn } from "@/lib/utils"

export default async function ProfilePage() {
  const session = await auth()
  if (!session?.user) return <div>Unauthorized</div>

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  })

  if (!user) return <div>User not found</div>

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Profile</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Profile Card */}
        <div className={cn(STYLES.card, "text-center h-fit")}>
          <div className="relative inline-block mb-4 group cursor-pointer">
            {user.image ? (
              <img src={user.image} alt={user.name || 'User'} className="w-32 h-32 rounded-full object-cover border-4 border-primary-50 mx-auto" />
            ) : (
              <div className="w-32 h-32 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 text-4xl font-bold border-4 border-white shadow-inner mx-auto">
                {user.name?.[0] || 'U'}
              </div>
            )}
            <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="w-8 h-8 text-white" />
            </div>
          </div>
          
          <h2 className="text-xl font-bold text-gray-900">{user.name}</h2>
          <p className="text-primary-600 font-medium">{user.role}</p>
          <div className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-500">
            <Mail className="w-4 h-4" /> {user.email}
          </div>
          <div className="mt-6 pt-6 border-t border-gray-100">
             <div className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Account Status</div>
             <span className="mt-2 inline-block px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-bold border border-green-200">
               {user.status}
             </span>
          </div>
        </div>

        {/* Right Column: Edit Form */}
        <div className="md:col-span-2">
          <div className={STYLES.card}>
            <div className="flex items-center gap-2 mb-6 pb-4 border-b border-gray-100">
              <UserCircle className="w-5 h-5 text-primary-600" />
              <h3 className="text-lg font-semibold text-gray-900">Personal Information</h3>
            </div>

            <form action={async (formData) => {
              'use server'
              await updateStaffProfile(formData)
            }} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name</label>
                  <div className="relative">
                    <UserCircle className="w-5 h-5 text-gray-400 absolute left-3 top-3" />
                    <input 
                      type="text" 
                      name="name" 
                      defaultValue={user.name || ''} 
                      className={cn(STYLES.input, "pl-10")} 
                    />
                  </div>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
                  <div className="relative">
                    <Mail className="w-5 h-5 text-gray-400 absolute left-3 top-3" />
                    <input 
                      type="email" 
                      value={user.email || ''} 
                      disabled 
                      className={cn(STYLES.input, "pl-10 bg-gray-50 text-gray-500 cursor-not-allowed")} 
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1 ml-1">Email cannot be changed directly.</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number</label>
                  <div className="relative">
                    <Phone className="w-5 h-5 text-gray-400 absolute left-3 top-3" />
                    <input 
                      type="tel" 
                      name="phone" 
                      defaultValue={user.phone || ''} 
                      className={cn(STYLES.input, "pl-10")}
                      placeholder="+1 (555) 000-0000" 
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Profile Image URL</label>
                  <div className="relative">
                    <Camera className="w-5 h-5 text-gray-400 absolute left-3 top-3" />
                    <input 
                      type="url" 
                      name="image" 
                      defaultValue={user.image || ''} 
                      className={cn(STYLES.input, "pl-10")} 
                      placeholder="https://..."
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1 ml-1">Paste a direct image URL (e.g. from Imgur or Unsplash)</p>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Bio</label>
                  <div className="relative">
                    <FileText className="w-5 h-5 text-gray-400 absolute left-3 top-3" />
                    <textarea 
                      name="bio" 
                      rows={4} 
                      defaultValue={user.bio || ''} 
                      className={cn(STYLES.input, "pl-10 pt-3")}
                      placeholder="Tell us a little about yourself..." 
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button type="submit" className={cn(STYLES.btn, STYLES.btnPrimary)}>
                  <Save className="w-4 h-4" /> Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
