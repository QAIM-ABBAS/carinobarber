import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Select from './Select'

const OPTIONS = [
  { value: 'haircut', label: 'کوتاهی مو' },
  { value: 'beard', label: 'اصلاح ریش' },
]

afterEach(cleanup)

describe('Select', () => {
  it('shows the placeholder until a value is chosen', () => {
    render(<Select id="service" value="" onChange={() => {}} options={OPTIONS} />)
    expect(screen.getByRole('button', { name: 'انتخاب کنید' })).toBeTruthy()
  })

  it('opens the list and reports the chosen option', () => {
    const onChange = vi.fn()
    render(<Select id="service" value="" onChange={onChange} options={OPTIONS} />)

    fireEvent.click(screen.getByRole('button', { name: 'انتخاب کنید' }))
    fireEvent.click(screen.getByRole('option', { name: 'اصلاح ریش' }))

    expect(onChange).toHaveBeenCalledWith('beard')
  })

  it('marks the current value', () => {
    render(<Select id="service" value="beard" onChange={() => {}} options={OPTIONS} />)

    fireEvent.click(screen.getByRole('button', { name: 'اصلاح ریش' }))

    expect(
      screen.getByRole('option', { name: 'اصلاح ریش' }).getAttribute('aria-selected'),
    ).toBe('true')
  })

  it('moves with the keyboard and picks with Enter', () => {
    const onChange = vi.fn()
    render(<Select id="service" value="" onChange={onChange} options={OPTIONS} />)
    const trigger = screen.getByRole('button', { name: 'انتخاب کنید' })

    fireEvent.keyDown(trigger, { key: 'ArrowDown' })
    fireEvent.keyDown(trigger, { key: 'ArrowDown' })
    fireEvent.keyDown(trigger, { key: 'Enter' })

    expect(onChange).toHaveBeenCalledWith('beard')
  })

  it('closes on Escape', () => {
    render(<Select id="service" value="" onChange={() => {}} options={OPTIONS} />)

    fireEvent.click(screen.getByRole('button', { name: 'انتخاب کنید' }))
    expect(screen.getByRole('listbox')).toBeTruthy()

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('listbox')).toBeNull()
  })
})
