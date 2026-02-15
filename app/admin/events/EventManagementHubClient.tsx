'use client'

import { useState } from 'react'
import { Calendar, List, ClipboardList, Plus } from "lucide-react"
import { TabNavigation } from "@/components/admin/shared/TabNavigation"
import { EventAdminCard } from "@/components/admin/EventAdminCard"
import { AdminRequestList } from "@/components/event-requests/AdminRequestList"
import Link from "next/link"
import { STYLES } from "@/lib/styles"
import { cn } from "@/lib/utils"

import { AdminCalendarView } from "@/components/admin/events/AdminCalendarView"

function EventListView({ events }: { events: any[] }) {
    return (
        <div className="space-y-4">
             <div className="flex justify-end mb-4">
                <Link
                    href="/admin/events/new"
                    className={cn(STYLES.btn, STYLES.btnPrimary)}
                >
                    <Plus className="w-4 h-4" />
                    Create Event
                </Link>
            </div>
            
            {events.length === 0 ? (
                <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg">
                    No events found.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {events.map(event => (
                        <EventAdminCard key={event.id} event={event} />
                    ))}
                </div>
            )}
        </div>
    )
}

type EventManagementHubClientProps = {
    events: any[]
    requests: any[]
}

export function EventManagementHubClient({ events, requests }: EventManagementHubClientProps) {
    const [activeTab, setActiveTab] = useState('list')

    const tabs = [
        { 
            id: 'list', 
            label: 'All Events', 
            icon: List 
        },
        { 
            id: 'calendar', 
            label: 'Calendar', 
            icon: Calendar 
        },
        { 
            id: 'requests', 
            label: 'Event Requests', 
            icon: ClipboardList,
            count: requests.filter((r: any) => r.status === 'PENDING').length
        }
    ]

    return (
        <div className="h-full flex flex-col p-6">
            <div className="flex-shrink-0 mb-2">
                <h1 className="text-2xl font-bold text-gray-900">Event Management</h1>
                <p className="text-sm text-gray-500">Manage schedule, approvals, and logistics</p>
            </div>

            <TabNavigation 
                tabs={tabs}
                activeTab={activeTab}
                onChange={setActiveTab}
            />

            <div className="flex-1 min-h-0 overflow-auto">
                {activeTab === 'list' && <EventListView events={events} />}
                {activeTab === 'calendar' && <AdminCalendarView events={events} />}
                {activeTab === 'requests' && <AdminRequestList requests={requests} />}
            </div>
        </div>
    )
}
