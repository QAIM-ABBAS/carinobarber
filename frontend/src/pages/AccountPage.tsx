import Header from '../components/Header'
import Footer from '../components/Footer'
import HeroBackground from '../components/HeroBackground'
import { useAuth } from '../auth/AuthContext'
import LoginCard from '../account/LoginCard'
import ProfileCard from '../account/ProfileCard'
import BookingsSection from '../account/BookingsSection'
import '../account.css'

/**
 * The «حساب» page. Logged out it shows the login card (phone + OTP), logged in
 * the profile card and the bookings of the customer (upcoming / history).
 */
export default function AccountPage() {
  const { user } = useAuth()

  return (
    <section className="hero hero--page" aria-labelledby="account-title">
      <HeroBackground />
      <Header />

      <div className="ac">
        <div className="ac__head">
          <h1 id="account-title" className="ac__title">
            {user ? 'حساب من' : 'حساب'}
          </h1>
          <p className="ac__lead">
            {user
              ? 'مشخصات و نوبت‌های شما همیشه همین‌جاست.'
              : 'برای رزرو سریع‌تر و پیگیری نوبت‌هایتان وارد شوید؛ کد ورود به موبایل شما ارسال می‌شود.'}
          </p>
        </div>

        {user ? (
          <div className="ac-stack">
            <ProfileCard />
            <BookingsSection />
          </div>
        ) : (
          <LoginCard />
        )}
      </div>

      <Footer />
    </section>
  )
}
