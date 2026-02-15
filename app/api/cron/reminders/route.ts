import { NextRequest, NextResponse } from 'next/server'
import { processPendingReminders } from '@/app/actions/email-reminders'

// API route for cron job to process pending email reminders
// Configure your cron service (Vercel Cron, GitHub Actions, etc.) to call this endpoint
// Example: Every hour at :00
export async function GET(request: NextRequest) {
  try {
    // Verify the request is from your cron service
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Process pending reminders
    const result = await processPendingReminders()

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      results: result.results,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Cron job error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Also support POST for manual triggers
export async function POST(request: NextRequest) {
  return GET(request)
}
