import { Route, Routes } from 'react-router-dom'
import Hero from './components/Hero'
import BookingPage from './pages/BookingPage'

export default function App() {
  return (
    <main>
      <Routes>
        <Route path="/" element={<Hero />} />
        <Route path="/book" element={<BookingPage />} />
        <Route path="*" element={<Hero />} />
      </Routes>
    </main>
  )
}
