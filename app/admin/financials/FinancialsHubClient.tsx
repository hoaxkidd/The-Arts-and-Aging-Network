'use client'

import { useState } from 'react'
import { DollarSign, Clock, MapPin } from "lucide-react"
import { TabNavigation } from "@/components/admin/shared/TabNavigation"
import { TimesheetList } from "@/components/admin/financials/TimesheetList"
import { MileageList } from "@/components/admin/financials/MileageList"
import { ExpenseRequestList } from "@/components/admin/financials/ExpenseRequestList"
import { FinancialReportsPanel } from "./FinancialReportsPanel"

type FinancialsHubClientProps = {
    timesheets: Record<string, unknown>[]
    mileageEntries: Record<string, unknown>[]
    expenseRequests: Record<string, unknown>[]
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
            label: 'Expense Requests', 
            icon: DollarSign,
            count: expenseRequests.filter(r => r.status === 'PENDING').length
        }
    ]

    return (
        <div className="h-full flex flex-col">
            <FinancialReportsPanel />
            <TabNavigation 
                tabs={tabs}
                activeTab={activeTab}
                onChange={setActiveTab}
            />

            <div className="flex-1 min-h-0 overflow-auto">
                {activeTab === 'timesheets' && <TimesheetList timesheets={timesheets as never[]} />}
                {activeTab === 'mileage' && <MileageList entries={mileageEntries as never[]} />}
                {activeTab === 'expenses' && <ExpenseRequestList requests={expenseRequests as never[]} />}
            </div>
        </div>
    )
}
