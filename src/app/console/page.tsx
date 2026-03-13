import { getCurrentWeekNumber } from '@/db/client'
import { redirect } from 'next/navigation'

export default function ConsolePage() {
  redirect(`/console/${getCurrentWeekNumber()}`)
}
