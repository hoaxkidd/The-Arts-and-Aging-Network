'use client'

import { Car, AlertCircle, CheckCircle } from "lucide-react"
import { STYLES } from "@/lib/styles"
import { cn } from "@/lib/utils"

type MileageStatsProps = {
    entries: any[]
}

export function MileageStats({ entries }: MileageStatsProps) {
    const pendingCount = entries.filter(e => e.status === 'PENDING').length
    const approvedCount = entries.filter(e => e.status === 'APPROVED').length
    const totalKm = entries.reduce((sum, e) => sum + e.kilometers, 0)
    
    // Simple calculation for "This Month" vs "Last Month" could be added here
    const currentMonth = new Date().getMonth()
    const thisMonthKm = entries
        .filter(e => new Date(e.date).getMonth() === currentMonth)
        .reduce((sum, e) => sum + e.kilometers, 0)

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg border border-gray-200 flex flex-col">
                <span className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Total Distance</span>
                <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-gray-900">{totalKm.toFixed(1)}</span>
                    <span className="text-sm text-gray-500">km</span>
                </div>
                <div className="mt-2 text-xs text-green-600 flex items-center gap-1">
                    <Car className="w-3 h-3" />
                    <span>All time</span>
                </div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-gray-200 flex flex-col">
                <span className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">This Month</span>
                <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-gray-900">{thisMonthKm.toFixed(1)}</span>
                    <span className="text-sm text-gray-500">km</span>
                </div>
                <div className="mt-2 w-full bg-gray-100 rounded-full h-1.5">
                    <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: '60%' }}></div>
                </div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-gray-200 flex flex-col">
                <span className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Pending Review</span>
                <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-yellow-600">{pendingCount}</span>
                    <span className="text-sm text-gray-500">entries</span>
                </div>
                 <div className="mt-2 text-xs text-yellow-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    <span>Action required</span>
                </div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-gray-200 flex flex-col">
                <span className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Approved</span>
                <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-green-600">{approvedCount}</span>
                    <span className="text-sm text-gray-500">entries</span>
                </div>
                <div className="mt-2 text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    <span>Processed</span>
                </div>
            </div>
        </div>
    )
}
