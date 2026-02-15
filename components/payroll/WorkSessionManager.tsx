'use client'

import { useState, useEffect } from 'react'
import { startWork, endWork, logActivity } from '@/app/actions/work'
import { Play, Square, ClipboardList, Clock, Briefcase, MapPin, CheckCircle2, AlertCircle } from 'lucide-react'
import { STYLES } from '@/lib/styles'
import { cn } from '@/lib/utils'

export function WorkSessionManager({ activeSession, history }: { activeSession: any, history: any[] }) {
  const [loading, setLoading] = useState(false)
  const [activityText, setActivityText] = useState('')
  const [elapsedTime, setElapsedTime] = useState('00:00:00')
  const [selectedType, setSelectedType] = useState('OFFICE')

  // Calculate elapsed time helper
  const calculateElapsed = (startTime: string | Date) => {
    const start = new Date(startTime).getTime()
    const now = new Date().getTime()
    const diff = now - start
    
    if (diff < 0) return '00:00:00'

    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((diff % (1000 * 60)) / 1000)
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  // Initialize timer immediately
  useEffect(() => {
    if (activeSession) {
        setElapsedTime(calculateElapsed(activeSession.startTime))
    }
  }, [activeSession])

  // Timer logic
  useEffect(() => {
    if (!activeSession) return

    const interval = setInterval(() => {
      setElapsedTime(calculateElapsed(activeSession.startTime))
    }, 1000)

    return () => clearInterval(interval)
  }, [activeSession])

  const handleStart = async () => {
    setLoading(true)
    await startWork({ type: selectedType })
    setLoading(false)
  }

  const handleEnd = async () => {
    if (!confirm('Are you sure you want to end your shift?')) return
    setLoading(true)
    await endWork(activeSession.id)
    setLoading(false)
  }

  const handleLogActivity = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activityText.trim()) return
    
    setLoading(true)
    await logActivity(activeSession.id, activityText)
    setActivityText('')
    setLoading(false)
  }

  if (activeSession) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {/* Light Theme Header */}
        <div className="bg-white px-8 py-6 border-b border-gray-100 flex flex-wrap items-center justify-between gap-6">
            <div className="flex items-center gap-6">
                <div className="flex flex-col items-start gap-1">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Status</span>
                    <div className="flex items-center gap-2 bg-green-50 px-3 py-1 rounded-full border border-green-100">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        <span className="text-xs font-bold text-green-700 uppercase tracking-wide">Active</span>
                    </div>
                </div>
                
                <div className="h-10 w-px bg-gray-100 mx-2 hidden sm:block"></div>
                
                <div className="flex flex-col items-start gap-1">
                     <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Duration</span>
                     <div className="text-4xl font-bold text-gray-900 font-mono tracking-tight tabular-nums leading-none">{elapsedTime}</div>
                </div>
            </div>
            
            <div className="flex items-center gap-6">
                 <div className="flex flex-col items-end gap-1">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Started At</span>
                    <div className="flex items-center gap-1.5 text-gray-700 font-medium">
                        <Clock className="w-4 h-4 text-primary-600" />
                        {new Date(activeSession.startTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                    </div>
                 </div>

                 <div className="flex flex-col items-end gap-1">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Location</span>
                    <div className="flex items-center gap-1.5 text-gray-700 font-medium">
                        <MapPin className="w-4 h-4 text-primary-600" />
                        {activeSession.type}
                    </div>
                 </div>

                 <button 
                    onClick={handleEnd}
                    disabled={loading}
                    className="ml-4 px-4 py-2 rounded-lg bg-white hover:bg-red-50 text-red-600 text-sm font-bold transition-all flex items-center gap-2 border border-gray-200 hover:border-red-200 shadow-sm"
                >
                    <Square className="w-4 h-4 fill-current" /> End Shift
                </button>
            </div>
        </div>

        <div className="p-6 bg-gray-50/50">
             {/* Activity Log - Takes up available space */}
             <div className="flex-1 w-full space-y-2">
                <form onSubmit={handleLogActivity} className="flex gap-2">
                    <div className="relative flex-1">
                        <ClipboardList className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input 
                            type="text" 
                            value={activityText}
                            onChange={(e) => setActivityText(e.target.value)}
                            placeholder="Log a task (e.g., 'Team meeting', 'Project X')..."
                            className={cn(STYLES.input, "pl-9 py-2 text-sm")}
                            disabled={loading}
                        />
                    </div>
                    <button type="submit" disabled={loading || !activityText.trim()} className={cn(STYLES.btn, "bg-gray-100 text-gray-700 hover:bg-gray-200 py-2 px-4 text-sm font-medium")}>
                        Log
                    </button>
                </form>

                {/* Compact Activities List */}
                {activeSession.activities && (
                    <div className="bg-gray-50 rounded-lg border border-gray-100 max-h-48 overflow-y-auto">
                        <div className="p-3 space-y-3">
                            {activeSession.activities.split('\n').filter(Boolean).map((log: string, i: number) => {
                                // Simple parsing for timestamp [Time] Activity
                                const match = log.match(/^\[(.*?)\] (.*)$/);
                                const time = match ? match[1] : '';
                                const content = match ? match[2] : log;
                                
                                return (
                                    <div key={i} className="flex gap-3 text-sm group">
                                        <div className="flex flex-col items-center pt-1.5">
                                            <div className="w-2 h-2 rounded-full bg-primary-200 group-hover:bg-primary-500 transition-colors"></div>
                                            {i !== activeSession.activities.split('\n').filter(Boolean).length - 1 && (
                                                <div className="w-px h-full bg-gray-200 my-0.5"></div>
                                            )}
                                        </div>
                                        <div className="flex-1 pb-1">
                                            <div className="text-gray-900 font-medium">{content}</div>
                                            {time && <div className="text-xs text-gray-400 font-mono mt-0.5">{time}</div>}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}
             </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <div className="w-16 h-16 bg-primary-50 text-primary-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Ready to Start?</h2>
        <p className="text-gray-500 mb-8 max-w-sm mx-auto">Track your daily work hours, log activities, and manage your schedule.</p>

        <div className="max-w-xs mx-auto space-y-4">
            <div className="grid grid-cols-2 gap-3 p-1 bg-gray-100 rounded-lg">
                {['OFFICE', 'REMOTE', 'OVERTIME'].map((type) => (
                    <button
                        key={type}
                        onClick={() => setSelectedType(type)}
                        className={cn(
                            "py-2 text-xs font-bold rounded-md transition-all",
                            selectedType === type ? "bg-white text-primary-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
                        )}
                    >
                        {type}
                    </button>
                ))}
            </div>

            <button 
                onClick={handleStart}
                disabled={loading}
                className={cn(STYLES.btn, STYLES.btnPrimary, "w-full py-3 text-lg shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all")}
            >
                <Play className="w-5 h-5 fill-current mr-2" /> Start Work
            </button>
        </div>
    </div>
  )
}
