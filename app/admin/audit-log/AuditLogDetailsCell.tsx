'use client'

import { useState, useRef } from 'react'
import { safeJsonParse } from '@/lib/utils'

interface AuditLogDetailsCellProps {
  details: string | null
  children?: React.ReactNode
}

export function AuditLogDetailsCell({ details, children }: AuditLogDetailsCellProps) {
  const [showTooltip, setShowTooltip] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const cellRef = useRef<HTMLTableCellElement>(null)

  function formatAuditDetails(dets: string | null): string {
    if (!dets) return '-'
    
    const parsed = safeJsonParse<Record<string, unknown>>(dets, {} as Record<string, unknown>)
    const updates = parsed.updates as Record<string, unknown> | undefined
    
    if (updates && typeof updates === 'object') {
      const changes = Object.keys(updates)
      if (changes.length === 1) return `Changed ${changes[0]}`
      if (changes.length === 2) return `Changed ${changes[0]} and ${changes[1]}`
      return `Changed ${changes.slice(0, 2).join(', ')} and ${changes.length - 2} more`
    }
    
    const name = parsed.name as string | undefined
    const title = parsed.title as string | undefined
    const email = parsed.email as string | undefined
    const eventId = parsed.eventId as string | undefined
    
    if (name) return name
    if (title) return title
    if (email) return email
    if (eventId) return 'Event action'
    
    return '-'
  }

  function handleMouseEnter() {
    if (cellRef.current) {
      const rect = cellRef.current.getBoundingClientRect()
      setPosition({ x: rect.left, y: rect.top })
      setShowTooltip(true)
    }
  }

  const tooltipContent = (() => {
    const parsed = safeJsonParse<Record<string, unknown>>(details, {} as Record<string, unknown>)
    const updates = parsed.updates as Record<string, unknown> | undefined
    if (updates && typeof updates === 'object') {
      return Object.keys(updates).map(key => ({
        key,
        value: String(updates[key])
      }))
    }
    return null
  })()

  return (
    <td 
      className="px-3 py-2.5 w-[40%]"
      ref={cellRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div className="relative">
        <span className="text-sm text-gray-600 block truncate">
          {children || formatAuditDetails(details)}
        </span>
        
        {showTooltip && details && tooltipContent && (
          <div 
            className="fixed z-50 w-64 bg-gray-800 text-white text-xs p-3 rounded-lg shadow-xl"
            style={{ 
              left: `${Math.min(position.x, window.innerWidth - 280)}px`,
              top: `${position.y - 8}px`,
              transform: 'translateY(-100%)'
            }}
          >
            <p className="font-semibold mb-2">Changed fields:</p>
            <ul className="space-y-1">
              {tooltipContent.map((item: { key: string; value: string }) => (
                <li key={item.key}>
                  <span className="text-gray-400">{item.key}:</span>{' '}
                  <span className="text-white">{item.value.slice(0, 30)}{item.value.length > 30 ? '...' : ''}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </td>
  )
}
