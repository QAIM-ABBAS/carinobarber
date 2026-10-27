import { lazy, Suspense, useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthProvider'
import RequireAuth from './auth/RequireAuth'
import { ToastProvider } from './components/Toast'
import AdminLayout from './layout/AdminLayout'
import AdminSsoPage from './pages/AdminSsoPage'
import LoginPage from './pages/LoginPage'
import NotFoundPage from './pages/NotFoundPage'
import './admin.css'

const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const BookingsPage = lazy(() => import('./pages/BookingsPage'))
const AdminServicesPage = lazy(() => import('./pages/AdminServicesPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: true,
    },
  },
})

/** The title of the tab while the admin panel is open. */
const ADMIN_TITLE = 'پنل مدیریت | باشگاه جنتلمن‌ها'

/** The admin area of the site: the routes, the session and the query cache. */
export default function AdminApp() {
  useEffect(() => {
    const previousTitle = document.title
    document.title = ADMIN_TITLE

    // The admin area must never be indexed.
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex'
    document.head.appendChild(meta)

    return () => {
      document.title = previousTitle
      meta.remove()
    }
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="login" element={<LoginPage />} />
            <Route path="sso" element={<AdminSsoPage />} />
            <Route
              element={
                <RequireAuth>
                  <AdminLayout />
                </RequireAuth>
              }
            >
              <Route
                index
                element={
                  <Suspense fallback={null}>
                    <DashboardPage />
                  </Suspense>
                }
              />
              <Route
                path="bookings"
                element={
                  <Suspense fallback={null}>
                    <BookingsPage />
                  </Suspense>
                }
              />
              <Route
                path="services"
                element={
                  <Suspense fallback={null}>
                    <AdminServicesPage />
                  </Suspense>
                }
              />
              <Route
                path="settings"
                element={
                  <Suspense fallback={null}>
                    <SettingsPage />
                  </Suspense>
                }
              />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}
