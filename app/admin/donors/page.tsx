import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { Heart, TrendingUp, DollarSign, Users } from "lucide-react"
import { cn } from "@/lib/utils"

export default async function DonorsPage() {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') redirect('/dashboard')

  const donors = await prisma.donor.findMany({
    include: {
      donations: {
        orderBy: { donationDate: 'desc' },
        take: 1
      },
      _count: {
        select: { donations: true }
      }
    },
    orderBy: { totalDonated: 'desc' }
  })

  const stats = {
    totalDonors: donors.length,
    activeDonors: donors.filter(d => d.status === 'ACTIVE').length,
    totalRaised: donors.reduce((sum, d) => sum + d.totalDonated, 0),
    recurringDonors: donors.filter(d => d.isRecurring).length
  }

  const tierColors = {
    'CHAMPION': 'purple',
    'BENEFACTOR': 'blue',
    'PATRON': 'green',
    'SUPPORTER': 'gray'
  }

  return (
    <div className="h-full flex flex-col p-6">
      <div className="flex-shrink-0 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Donor Management</h1>
        <p className="text-sm text-gray-500">Track donations and manage donor relationships</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase flex items-center gap-1">
            <Users className="w-3 h-3" />
            Total Donors
          </p>
          <p className="text-2xl font-bold text-gray-900">{stats.totalDonors}</p>
        </div>
        <div className="bg-white rounded-lg border border-green-200 p-4">
          <p className="text-xs text-green-600 uppercase">Active</p>
          <p className="text-2xl font-bold text-green-600">{stats.activeDonors}</p>
        </div>
        <div className="bg-white rounded-lg border border-blue-200 p-4">
          <p className="text-xs text-blue-600 uppercase flex items-center gap-1">
            <DollarSign className="w-3 h-3" />
            Total Raised
          </p>
          <p className="text-2xl font-bold text-blue-600">${stats.totalRaised.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg border border-purple-200 p-4">
          <p className="text-xs text-purple-600 uppercase flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            Recurring
          </p>
          <p className="text-2xl font-bold text-purple-600">{stats.recurringDonors}</p>
        </div>
      </div>

      {/* Donors List */}
      <div className="flex-1 min-h-0 overflow-auto">
        <div className="bg-white rounded-lg border border-gray-200">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Donor</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Tier</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700">Total Donated</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">Donations</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Last Donation</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {donors.map((donor) => (
                <tr key={donor.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Heart className="w-4 h-4 text-pink-500" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{donor.name}</p>
                        {donor.email && (
                          <p className="text-xs text-gray-500">{donor.email}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
                      {donor.type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "text-xs px-2 py-1 rounded font-medium",
                      `bg-${tierColors[donor.tier as keyof typeof tierColors] || 'gray'}-100`,
                      `text-${tierColors[donor.tier as keyof typeof tierColors] || 'gray'}-700`
                    )}>
                      {donor.tier}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm font-semibold text-gray-900">
                      ${donor.totalDonated.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-sm text-gray-900">{donor._count.donations}</span>
                  </td>
                  <td className="px-4 py-3">
                    {donor.lastDonation ? (
                      <span className="text-xs text-gray-600">
                        {donor.lastDonation.toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "text-xs px-2 py-1 rounded",
                      donor.status === 'ACTIVE' && "bg-green-100 text-green-700",
                      donor.status === 'INACTIVE' && "bg-gray-100 text-gray-600",
                      donor.status === 'LAPSED' && "bg-yellow-100 text-yellow-700"
                    )}>
                      {donor.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
