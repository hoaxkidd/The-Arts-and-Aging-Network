'use client'

import { useState } from 'react'
import { MapPin, ArrowRight, Search, Filter } from "lucide-react"
import { STYLES } from "@/lib/styles"
import { cn } from "@/lib/utils"
import { MileageApprovalActions } from "@/app/admin/mileage/MileageApprovalActions"
import { MileageStats } from "./MileageStats"

type MileageEntry = {
  id: string
  date: Date
  kilometers: number
  startLocation: string
  endLocation: string
  purpose: string | null
  fundingClass: string | null
  status: string
  user: {
    id: string
    name: string | null
    preferredName: string | null
    image: string | null
  }
}

export function MileageList({ entries }: { entries: MileageEntry[] }) {
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING')
  const [search, setSearch] = useState('')

  const filtered = entries.filter(e => {
    const matchesStatus = filter === 'ALL' || e.status === filter
    const matchesSearch = !search || 
        e.user.name?.toLowerCase().includes(search.toLowerCase()) || 
        e.purpose?.toLowerCase().includes(search.toLowerCase())
    return matchesStatus && matchesSearch
  })

  return (
    <div className="space-y-6">
      <MileageStats entries={entries} />

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row gap-4 justify-between items-center bg-gray-50/50">
            <div className="flex items-center gap-2">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input 
                        type="text" 
                        placeholder="Search staff or purpose..." 
                        className="pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 w-64"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>
            
            <div className="flex bg-gray-100 p-1 rounded-lg">
                {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={cn(
                            "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                            filter === f ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                        )}
                    >
                        {f.charAt(0) + f.slice(1).toLowerCase()}
                    </button>
                ))}
            </div>
        </div>

        {/* Table */}
        <div className="table-scroll-wrapper max-h-[calc(100vh-360px)]">
            <table className={STYLES.table}>
                <thead className="bg-gray-50">
                    <tr>
                        <th className={STYLES.tableHeader}>Staff Member</th>
                        <th className={STYLES.tableHeader}>Date</th>
                        <th className={STYLES.tableHeader}>Route</th>
                        <th className={STYLES.tableHeader}>Distance</th>
                        <th className={STYLES.tableHeader}>Status</th>
                        <th className={cn(STYLES.tableHeader, "text-right")}>Actions</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {filtered.map((entry) => {
                        const displayName = entry.user.preferredName || entry.user.name || 'Unknown'
                        
                        return (
                            <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                        <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-bold text-xs mr-3">
                                            {entry.user.image ? (
                                                <img src={entry.user.image} alt="" className="h-8 w-8 rounded-full object-cover" />
                                            ) : displayName.charAt(0)}
                                        </div>
                                        <div className="text-sm font-medium text-gray-900">{displayName}</div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {new Date(entry.date).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2 text-sm text-gray-900">
                                        <span className="truncate max-w-[100px]" title={entry.startLocation}>{entry.startLocation}</span>
                                        <ArrowRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
                                        <span className="truncate max-w-[100px]" title={entry.endLocation}>{entry.endLocation}</span>
                                    </div>
                                    {entry.purpose && (
                                        <div className="text-xs text-gray-500 mt-1 truncate max-w-[200px]">{entry.purpose}</div>
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-sm font-bold text-gray-900">{entry.kilometers}</span>
                                        <span className="text-xs text-gray-500">km</span>
                                    </div>
                                    {entry.fundingClass && (
                                        <span className="inline-block mt-1 px-1.5 py-0.5 bg-gray-100 text-gray-600 text-[10px] rounded">
                                            {entry.fundingClass}
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={cn(
                                        "px-2 py-1 text-xs font-medium rounded-full",
                                        entry.status === 'APPROVED' ? "bg-green-100 text-green-700" :
                                        entry.status === 'REJECTED' ? "bg-red-100 text-red-700" :
                                        "bg-yellow-100 text-yellow-700"
                                    )}>
                                        {entry.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    {entry.status === 'PENDING' && (
                                        <div className="flex justify-end">
                                            <MileageApprovalActions entryId={entry.id} />
                                        </div>
                                    )}
                                </td>
                            </tr>
                        )
                    })}
                    {filtered.length === 0 && (
                        <tr>
                            <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                No entries found matching your filters.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  )
}
