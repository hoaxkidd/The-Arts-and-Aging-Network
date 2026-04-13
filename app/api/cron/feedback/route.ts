import { NextRequest, NextResponse } from 'next/server'
import { sendFeedbackRequests, type FeedbackEmailResult } from '@/app/actions/feedback'
import { logger } from '@/lib/logger'

interface FeedbackResult {
  success: boolean
  results: FeedbackEmailResult[]
  totalSent: number
  totalFailed: number
}

// API route for cron job to send post-booking feedback requests
// Configure your cron service (Vercel Cron, GitHub Actions, etc.) to call this endpoint
// Example: Every hour at :00
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Verify the request is from your cron service
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    const isProduction = process.env.NODE_ENV === 'production'

    if (isProduction && !cronSecret) {
      return NextResponse.json({ error: 'CRON_SECRET is not configured' }, { status: 500 })
    }

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Default: send feedback requests 1 hour after event ends
    const result: FeedbackResult = await sendFeedbackRequests(1)

    return NextResponse.json({
      success: result.success,
      results: result.results,
      totalSent: result.totalSent,
      totalFailed: result.totalFailed,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    logger.serverAction('Feedback cron job error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Also support POST for manual triggers
export async function POST(request: NextRequest): Promise<NextResponse> {
  return GET(request)
}
