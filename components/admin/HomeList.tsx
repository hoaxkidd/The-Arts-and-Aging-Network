'use client'

import { useState } from 'react'
import { Building2, MapPin, Search, Eye, Phone, Zap } from 'lucide-react'
import Link from 'next/link'
import { HomeQuickView } from './HomeQuickView'
import { cn } from '@/lib/utils'

type Home = {
  id: string
  name: string
  address: string
  residentCount: number
  maxCapacity: number
  contactName: string
  contactPhone: string
  user: {
    email: string
  }
}

export function HomeList({ initialHomes }: { initialHomes: Home[] }) {
  const [search, setSearch] = useState('')
  const [selectedHomeId, setSelectedHomeId] = useState<string | null>(null)

  const filteredHomes = initialHomes.filter(home =>
    home.name.toLowerCase().includes(search.toLowerCase()) ||
    home.address.toLowerCase().includes(search.toLowerCase()) ||
    home.contactName.toLowerCase().includes(search.toLowerCase())
  )

  const getCapacityColor = (current: number, max: number) => {
    const ratio = current / max
    if (ratio >= 0.9) return 'bg-red-500'
    if (ratio >= 0.7) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search homes by name, address, or contact..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow"
        />
      </div>

      {/* List */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="table-scroll-wrapper max-h-[calc(100vh-320px)]">
          <table className="w-full text-left text-sm min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Facility Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Location</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Capacity</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredHomes.length > 0 ? (
                filteredHomes.map(home => (
                  <tr key={home.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                          <Building2 className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{home.name}</div>
                          <div className="text-xs text-gray-500">{home.user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-gray-600">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span className="truncate max-w-[200px]">{home.address}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-full max-w-[80px] h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all",
                              getCapacityColor(home.residentCount, home.maxCapacity)
                            )}
                            style={{ width: `${Math.min((home.residentCount / home.maxCapacity) * 100, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-gray-600">
                          {home.residentCount}/{home.maxCapacity}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-0.5">
                        <div className="font-medium text-gray-900">{home.contactName}</div>
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <Phone className="w-3 h-3" /> {home.contactPhone}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Quick View Button */}
                        <button
                          onClick={() => setSelectedHomeId(home.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary-50 border border-primary-100 text-primary-700 hover:bg-primary-100 hover:border-primary-200 transition-all shadow-sm"
                          title="Quick View & Edit"
                        >
                          <Zap className="w-3.5 h-3.5" /> Quick View
                        </button>
                        {/* Full Details Link */}
                        <Link
                          href={`/admin/homes/${home.id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-primary-600 hover:border-primary-200 transition-all shadow-sm"
                        >
                          <Eye className="w-3.5 h-3.5" /> Details
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    No homes found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick View Modal */}
      <HomeQuickView
        homeId={selectedHomeId || ''}
        isOpen={!!selectedHomeId}
        onClose={() => setSelectedHomeId(null)}
      />
    </div>
  )
}
