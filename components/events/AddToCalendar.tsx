'use client'

import { useState } from 'react'
import { Calendar, Download, ExternalLink, ChevronDown } from 'lucide-react'
import { STYLES } from '@/lib/styles'
import { cn } from '@/lib/utils'

interface EventProps {
  title: string
  description: string | null
  location: string
  startDateTime: Date
  endDateTime: Date
}

export function AddToCalendar({ event }: { event: EventProps }) {
  const [isOpen, setIsOpen] = useState(false)

  // Format dates for Google Calendar (YYYYMMDDTHHmmssZ)
  const formatGoogleDate = (date: Date) => {
    return date.toISOString().replace(/-|:|\.\d+/g, '')
  }

  const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${formatGoogleDate(event.startDateTime)}/${formatGoogleDate(event.endDateTime)}&details=${encodeURIComponent(event.description || '')}&location=${encodeURIComponent(event.location)}`

  // Generate ICS file content
  const downloadIcs = () => {
    const formatDate = (date: Date) => date.toISOString().replace(/-|:|\.\d+/g, '')
    
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      `DTSTART:${formatDate(event.startDateTime)}`,
      `DTEND:${formatDate(event.endDateTime)}`,
      `SUMMARY:${event.title}`,
      `DESCRIPTION:${event.description || ''}`,
      `LOCATION:${event.location}`,
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\n')

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `${event.title.replace(/\s+/g, '_')}.ics`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={cn(STYLES.btn, "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm font-medium py-2 px-4 shadow-sm transition-all hover:border-gray-300")}
      >
        <Calendar className="w-4 h-4 text-gray-500" />
        Add to Calendar
        <ChevronDown className={cn("w-3 h-3 text-gray-400 transition-transform duration-200", isOpen ? "rotate-180" : "")} />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)} 
          />
          <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-100 ring-1 ring-black/5 z-20 py-2 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
            <a 
              href={googleUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors group"
            >
              <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" /> 
              <span>Google Calendar</span>
            </a>
            <div className="h-px bg-gray-50 my-1" />
            <button 
              onClick={() => {
                downloadIcs()
                setIsOpen(false)
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left group"
            >
              <Download className="w-4 h-4 text-gray-400 group-hover:text-green-500 transition-colors" /> 
              <span>Download .ICS File</span>
            </button>
          </div>
        </>
      )}
    </div>
  )
}
