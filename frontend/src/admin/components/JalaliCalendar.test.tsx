import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import JalaliCalendar from './JalaliCalendar'

afterEach(cleanup)

describe('JalaliCalendar', () => {
  it('opens on the month of the chosen day', () => {
    render(<JalaliCalendar id="date" value="2026-10-22" onChange={() => {}} />)
    expect(screen.getByText('مهر ۱۴۰۵')).toBeTruthy()
  })

  it('sends the Gregorian date of the picked day', () => {
    const onChange = vi.fn()
    render(<JalaliCalendar id="date" value="2026-10-22" onChange={onChange} />)

    fireEvent.click(screen.getByRole('button', { name: '۱۵ مهر ۱۴۰۵' }))

    expect(onChange).toHaveBeenCalledWith('2026-10-07')
  })

  it('marks the chosen day', () => {
    render(<JalaliCalendar id="date" value="2026-10-22" onChange={() => {}} />)

    const chosen = screen.getByRole('button', { name: '۳۰ مهر ۱۴۰۵' })
    expect(chosen.getAttribute('aria-pressed')).toBe('true')
  })

  it('disables the days outside the allowed range', () => {
    // ۲۰ مهر ۱۴۰۵ = 2026-10-20 and ۲۱ مهر ۱۴۰۵ = 2026-10-21.
    render(
      <JalaliCalendar
        id="date"
        value="2026-10-22"
        onChange={() => {}}
        min="2026-10-20"
        max="2026-10-21"
      />,
    )

    expect((screen.getByRole('button', { name: '۲۷ مهر ۱۴۰۵' }) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole('button', { name: '۳۰ مهر ۱۴۰۵' }) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole('button', { name: '۲۹ مهر ۱۴۰۵' }) as HTMLButtonElement).disabled).toBe(false)
  })

  it('moves to the next month', () => {
    render(<JalaliCalendar id="date" value="2026-10-22" onChange={() => {}} />)

    fireEvent.click(screen.getByRole('button', { name: 'ماه بعد' }))

    expect(screen.getByText('آبان ۱۴۰۵')).toBeTruthy()
  })
})
