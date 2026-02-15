'use client'

import { useState } from 'react'
import { DollarSign, Clock, MapPin, FileText } from "lucide-react"
import { TabNavigation } from "@/components/admin/shared/TabNavigation"
import { TimesheetList } from "@/components/admin/financials/TimesheetList"
import { MileageList } from "@/components/admin/financials/MileageList"
import { ExpenseRequestList } from "@/components/admin/financials/ExpenseRequestList"

type FinancialsHubClientProps = {
    timesheets: any[]
    mileageEntries: any[]
    expenseRequests: any[]
}

export function FinancialsHubClient({ timesheets, mileageEntries, expenseRequests }: FinancialsHubClientProps) {
    const [activeTab, setActiveTab] = useState('timesheets')

    const tabs = [
        { 
            id: 'timesheets', 
            label: 'Timesheets', 
            icon: Clock,
            count: timesheets.filter(t => t.status === 'PENDING').length
        },
        { 
            id: 'mileage', 
            label: 'Mileage', 
            icon: MapPin,
            count: mileageEntries.filter(m => m.status === 'PENDING').length
        },
        { 
            id: 'expenses', 
            label: 'Requests & Expenses', 
            icon: DollarSign,
            count: expenseRequests.filter(r => r.status === 'PENDING').length
        }
    ]

    return (
        <div className="h-full flex flex-col p-6">
            <div className="flex-shrink-0 mb-2">
                <h1 className="text-2xl font-bold text-gray-900">Financial Management</h1>
                <p className="text-sm text-gray-500">Approve timesheets, mileage, and reimbursement requests</p>
            </div>

            <TabNavigation 
                tabs={tabs}
                activeTab={activeTab}
                onChange={setActiveTab}
            />

            <div className="flex-1 min-h-0 overflow-auto">
                {activeTab === 'timesheets' && <TimesheetList timesheets={timesheets} />}
                {activeTab === 'mileage' && <MileageList entries={mileageEntries} />}
                {activeTab === 'expenses' && <ExpenseRequestList requests={expenseRequests} />}
            </div>
        </div>
    )
}
