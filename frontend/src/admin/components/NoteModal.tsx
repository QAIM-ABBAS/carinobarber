import { useEffect, useState, type FormEvent } from 'react'
import { ApiError, GENERIC_ERROR_MESSAGE } from '../api/client'
import { useUpdateBooking } from '../api/hooks'
import type { AdminBooking } from '../api/types'
import Button from './Button'
import Field from './Field'
import Modal from './Modal'
import { useToast } from './Toast'

export interface NoteModalProps {
  booking: AdminBooking | null
  onClose: () => void
}

/** The modal that edits the note of the admin of a booking. */
export default function NoteModal({ booking, onClose }: NoteModalProps) {
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const update = useUpdateBooking()
  const { push } = useToast()

  useEffect(() => {
    setNote(booking?.admin_note ?? '')
    setError(null)
  }, [booking])

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!booking) return
    setSaving(true)
    setError(null)
    try {
      await update.mutateAsync({ id: booking.id, admin_note: note.trim() || null })
      push('یادداشت ذخیره شد.', 'success')
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : GENERIC_ERROR_MESSAGE)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={booking !== null}
      title={`یادداشت نوبت ${booking ? booking.code : ''}`}
      onClose={onClose}
      footer={
        <>
          <Button type="submit" form="note-form" loading={saving}>
            ذخیرهٔ یادداشت
          </Button>
          <Button variant="ghost" onClick={onClose}>
            انصراف
          </Button>
        </>
      }
    >
      <form id="note-form" className="ad-form" onSubmit={onSubmit}>
        <Field label="یادداشت مدیر" htmlFor="note-text" hint="فقط برای مدیران قابل مشاهده است.">
          <textarea
            id="note-text"
            className="ad-textarea"
            value={note}
            maxLength={2000}
            onChange={(event) => setNote(event.target.value)}
            placeholder="مثلاً: مشتری تلفنی تأیید کرد."
          />
        </Field>
        {error && (
          <p className="ad-alert ad-alert--error" role="alert">
            {error}
          </p>
        )}
      </form>
    </Modal>
  )
}
