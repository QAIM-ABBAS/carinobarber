import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { AuthContext, type AuthContextValue } from '../auth/AuthContext'
import { aboutPage } from '../data/content'
import AboutPage from './AboutPage'

const AUTH: AuthContextValue = {
  user: null,
  token: null,
  isAuthenticated: false,
  login: () => {},
  logout: () => {},
  refreshUser: async () => {},
}

const NUMBERS = ['۰۱', '۰۲', '۰۳', '۰۴']

afterEach(cleanup)

function renderAbout() {
  return render(
    <MemoryRouter>
      <AuthContext.Provider value={AUTH}>
        <AboutPage />
      </AuthContext.Provider>
    </MemoryRouter>,
  )
}

describe('the about page', () => {
  it('shows the title, the tagline and the story', () => {
    renderAbout()

    expect(screen.getByRole('heading', { level: 1, name: aboutPage.title })).toBeTruthy()
    expect(screen.getByText(aboutPage.tagline)).toBeTruthy()
    for (const paragraph of aboutPage.intro) expect(screen.getByText(paragraph)).toBeTruthy()
  })

  it('lists the reasons with their Persian numbers', () => {
    renderAbout()

    expect(screen.getByRole('heading', { level: 2, name: aboutPage.reasons.title })).toBeTruthy()
    aboutPage.reasons.items.forEach((item, i) => {
      expect(screen.getByRole('heading', { level: 3, name: item.title })).toBeTruthy()
      expect(screen.getByText(item.text)).toBeTruthy()
      expect(screen.getByText(NUMBERS[i])).toBeTruthy()
    })
  })

  it('offers the booking call to action and the closing line', () => {
    renderAbout()

    const booking = screen.getAllByRole('link', { name: /رزرو نوبت/ })
    expect(booking.some((link) => link.getAttribute('href') === '/book')).toBe(true)
    expect(screen.getByText(aboutPage.cta.closing)).toBeTruthy()
  })
})
