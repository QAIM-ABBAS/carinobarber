import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import JalaliDatePicker from './JalaliDatePicker'

afterEach(cleanup)

describe('JalaliDatePicker', () => {
  it('shows the placeholder until a date is picked', () => {
    render(<JalaliDatePicker id="closed-date" value="" onChange={() => {}} />)
    expect(screen.getByRole('button', { name: 'انتخاب تاریخ' })).toBeTruthy()
  })

  it('opens the calendar and reports the picked day', () => {
    const onChange = vi.fn()
    render(<JalaliDatePicker id="closed-date" value="2026-10-22" onChange={onChange} />)

    fireEvent.click(screen.getByRole('button', { name: '۳۰ مهر ۱۴۰۵' }))
    expect(screen.getByRole('dialog', { name: 'انتخاب تاریخ' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: '۱۵ مهر ۱۴۰۵' }))

    expect(onChange).toHaveBeenCalledWith('2026-10-07')
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('closes on Escape', () => {
    render(<JalaliDatePicker id="closed-date" value="" onChange={() => {}} />)

    fireEvent.click(screen.getByRole('button', { name: 'انتخاب تاریخ' }))
    expect(screen.getByRole('dialog')).toBeTruthy()

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
