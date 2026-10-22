import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Modal from './Modal'
import StatusBadge from './StatusBadge'

afterEach(cleanup)

describe('Modal', () => {
  it('is a labelled dialog', () => {
    render(
      <Modal open title="ویرایش نوبت" onClose={() => {}}>
        <p>محتوا</p>
      </Modal>,
    )

    const dialog = screen.getByRole('dialog')
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    expect(dialog.getAttribute('aria-labelledby')).toBeTruthy()
    expect(screen.getByText('ویرایش نوبت')).toBeTruthy()
  })

  it('moves the focus into the dialog and closes on Escape', () => {
    const onClose = vi.fn()
    render(
      <Modal open title="ویرایش نوبت" onClose={onClose}>
        <button type="button">دکمه</button>
      </Modal>,
    )

    const close = screen.getByLabelText('بستن پنجره')
    expect(document.activeElement).toBe(close)

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('renders nothing when it is closed', () => {
    render(
      <Modal open={false} title="ویرایش نوبت" onClose={() => {}}>
        <p>محتوا</p>
      </Modal>,
    )

    expect(screen.queryByRole('dialog')).toBeNull()
  })
})

describe('StatusBadge', () => {
  it('always shows the Persian label of the status', () => {
    render(<StatusBadge status="no_show" />)

    const badge = screen.getByText('عدم حضور')
    expect(badge.getAttribute('data-status')).toBe('no_show')
  })
})
