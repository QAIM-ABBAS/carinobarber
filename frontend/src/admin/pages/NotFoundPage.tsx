import { Link } from 'react-router-dom'

/** The 404 page of the admin area. */
export default function NotFoundPage() {
  return (
    <div className="ad-page ad-notfound">
      <h1 className="ad-page-header__title">صفحه پیدا نشد</h1>
      <p className="ad-empty__description">
        این صفحه در پنل مدیریت وجود ندارد. شاید نشانی را اشتباه وارد کرده‌اید.
      </p>
      <Link className="ad-btn ad-btn--primary ad-btn--md" to="/admin">
        بازگشت به داشبورد
      </Link>
    </div>
  )
}