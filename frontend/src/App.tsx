import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import Hero from './components/Hero'
import AccountPage from './pages/AccountPage'
import BookingPage from './pages/BookingPage'
import ServicesPage from './pages/ServicesPage'

// The admin panel is loaded on demand so the public bundle stays small.
const AdminApp = lazy(() => import('./admin/AdminApp'))

export default function App() {
  return (
    <main>
      <Routes>
        <Route path="/" element={<Hero />} />
        <Route path="/book" element={<BookingPage />} />
        <Route path="/services" element={<ServicesPage />} />
        <Route path="/account" element={<AccountPage />} />
        <Route
          path="/admin/*"
          element={
            <Suspense fallback={null}>
              <AdminApp />
            </Suspense>
          }
        />
        <Route path="*" element={<Hero />} />
      </Routes>
    </main>
  )
}
