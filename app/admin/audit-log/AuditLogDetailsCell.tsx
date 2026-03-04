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
    
    const parsed = safeJsonParse<any>(dets, {})
    
    if (parsed.updates && typeof parsed.updates === 'object') {
      const changes = Object.keys(parsed.updates)
      if (changes.length === 1) return `Changed ${changes[0]}`
      if (changes.length === 2) return `Changed ${changes[0]} and ${changes[1]}`
      return `Changed ${changes.slice(0, 2).join(', ')} and ${changes.length - 2} more`
    }
    
    if (parsed.name) return parsed.name
    if (parsed.title) return parsed.title
    if (parsed.email) return parsed.email
    if (parsed.eventId) return 'Event action'
    
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
    const parsed = safeJsonParse<any>(details, {})
    if (parsed.updates && typeof parsed.updates === 'object') {
      return Object.keys(parsed.updates).map(key => ({
        key,
        value: String(parsed.updates[key])
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
