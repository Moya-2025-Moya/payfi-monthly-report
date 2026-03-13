import { NextResponse } from 'next/server'
import { getCurrentWeekNumber } from '@/db/client'
import { getWeeklySnapshotRow } from '@/lib/weekly-data'

export async function GET() {
  const weekNumber = getCurrentWeekNumber()
  const data = await getWeeklySnapshotRow(weekNumber)

  if (!data) {
    return NextResponse.json({ error: 'No snapshot found' }, { status: 500 })
  }

  return NextResponse.json(data)
}
