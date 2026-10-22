import ClosedWeekdaysCard from '../components/ClosedWeekdaysCard'
import WorkingHoursCard from '../components/WorkingHoursCard'
import ClosedDatesCard from './ClosedDatesCard'

/** The settings of the shop: the working hours, the closing days and the holidays. */
export default function SettingsPage() {
  return (
    <div className="ad-page">
      <WorkingHoursCard />
      <ClosedWeekdaysCard />
      <ClosedDatesCard />
    </div>
  )
}
