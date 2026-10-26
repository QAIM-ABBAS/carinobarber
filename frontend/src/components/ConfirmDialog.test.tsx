import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import ConfirmDialog from './ConfirmDialog'

afterEach(cleanup)

const base = {
  title: 'لغو نوبت',
  message: 'نوبت لغو شود؟ این کار قابل بازگشت نیست.',
  onConfirm: () => {},
  onCancel: () => {},
}

describe('ConfirmDialog', () => {
  it('is a labelled modal dialog when open and renders nothing when closed', () => {
    const { rerender } = render(<ConfirmDialog {...base} open />)

    const dialog = screen.getByRole('dialog')
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    expect(dialog.getAttribute('aria-labelledby')).toBeTruthy()
    expect(screen.getByText(base.message)).toBeTruthy()

    rerender(<ConfirmDialog {...base} open={false} />)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('moves the focus into the dialog and restores it on the opener', () => {
    // The opener stays in the tree through every rerender (like a real page).
    const tree = (open: boolean) => (
      <>
        <button type="button">باز کردن</button>
        <ConfirmDialog {...base} open={open} confirmLabel="بله، لغو شود" />
      </>
    )
    const { rerender } = render(tree(false))

    const opener = screen.getByText('باز کردن')
    opener.focus()
    expect(document.activeElement).toBe(opener)

    rerender(tree(true))
    expect(document.activeElement).toBe(screen.getByText('بله، لغو شود'))

    rerender(tree(false))
    expect(document.activeElement).toBe(opener)
  })

  it('closes on Escape and on a backdrop click', () => {
    const onCancel = vi.fn()
    render(<ConfirmDialog {...base} open onCancel={onCancel} />)

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onCancel).toHaveBeenCalledTimes(1)

    fireEvent.click(document.querySelector('.ac-dialog__backdrop') as HTMLElement)
    expect(onCancel).toHaveBeenCalledTimes(2)
  })

  it('keeps the focus inside the dialog when Tab reaches the edges', () => {
    render(<ConfirmDialog {...base} open />)
    const confirm = screen.getByText('تأیید')
    const cancel = screen.getByText('انصراف')

    cancel.focus()
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(document.activeElement).toBe(confirm)

    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(cancel)
  })

  it('disables the buttons while it is loading', () => {
    render(<ConfirmDialog {...base} open loading />)

    expect(screen.getByText('در حال انجام…')).toBeTruthy()
    for (const label of ['در حال انجام…', 'انصراف']) {
      expect((screen.getByText(label) as HTMLButtonElement).disabled).toBe(true)
    }
  })
})
