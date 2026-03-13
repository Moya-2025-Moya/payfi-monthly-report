import { redirect } from 'next/navigation'
import { getCurrentWeekNumber } from '@/db/client'

export default function HomePage() {
  redirect(`/weekly/${getCurrentWeekNumber()}`)
}
