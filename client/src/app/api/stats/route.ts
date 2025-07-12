import { NextRequest, NextResponse } from 'next/server'
import { getUserStats } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const stats = await getUserStats()
    
    return NextResponse.json(stats)
  } catch (error) {
    console.error('Failed to get user stats:', error)
    return NextResponse.json(
      { error: 'Failed to get user stats' },
      { status: 500 }
    )
  }
} 