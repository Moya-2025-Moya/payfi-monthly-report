import { getCurrentWeekNumber } from '@/db/client'
import { Landing } from './Landing'

export default function HomePage() {
  const currentWeek = getCurrentWeekNumber()
  return <Landing currentWeek={currentWeek} />
}
