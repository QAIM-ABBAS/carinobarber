import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { ApiError, updateMe } from '../lib/api'
import { toFaDigits } from '../lib/booking'
import { CheckIcon, PencilIcon } from '../components/icons'

const NAME_RULES = 'نام باید ۲ تا ۱۰۰ حرف باشد.'
const GENERIC_ERROR = 'خطایی رخ داد. لطفاً دوباره تلاش کنید.'

/**
 * The profile card: inline name edit (`PATCH /me`), the read-only phone and the
 * logout / new-booking actions.
 */
export default function ProfileCard() {
  const { user, logout, refreshUser } = useAuth()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)

  // The «نام ذخیره شد.» note clears itself.
  useEffect(() => {
    if (!saved) return
    const timer = window.setTimeout(() => setSaved(false), 4000)
    return () => window.clearTimeout(timer)
  }, [saved])

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  if (!user) return null

  const startEdit = () => {
    setDraft(user.name)
    setError(null)
    setSaved(false)
    setEditing(true)
  }

  const cancelEdit = () => {
    if (saving) return
    setEditing(false)
    setError(null)
  }

  const save = async (event?: FormEvent) => {
    event?.preventDefault()
    if (saving) return
    const name = draft.trim()
    if (name.length < 2 || name.length > 100) {
      setError(NAME_RULES)
      return
    }
    setSaving(true)
    setError(null)
    try {
      await updateMe(name)
      await refreshUser()
      setEditing(false)
      setSaved(true)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : GENERIC_ERROR)
    } finally {
      setSaving(false)
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') cancelEdit()
  }

  return (
    <div className="ac-card ac-profile">
      <div className="ac-profile__row">
        <span className="ac-profile__label" id="ac-profile-name-label">
          نام
        </span>
        {editing ? (
          <form className="ac-profile__editing" onSubmit={(e) => void save(e)} noValidate>
            <input
              ref={inputRef}
              type="text"
              aria-labelledby="ac-profile-name-label"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              maxLength={100}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? 'ac-profile-name-error' : undefined}
              disabled={saving}
            />
            <button
              type="submit"
              className="ac-profile__edit ac-profile__edit--save"
              aria-label="ذخیره نام"
              disabled={saving}
            >
              {saving ? <span className="ac-spinner ac-spinner--light" aria-hidden="true" /> : <CheckIcon />}
            </button>
          </form>
        ) : (
          <>
            <span className="ac-profile__value">{user.name}</span>
            <button
              type="button"
              className="ac-profile__edit"
              aria-label="تغییر نام"
              onClick={startEdit}
            >
              <PencilIcon />
            </button>
          </>
        )}
      </div>
      {error && (
        <p className="ac-err" id="ac-profile-name-error" aria-live="polite">
          {error}
        </p>
      )}
      {saved && !editing && <p className="ac-ok">نام شما ذخیره شد.</p>}

      <div className="ac-profile__row">
        <span className="ac-profile__label">موبایل</span>
        <span className="ac-profile__value ac-profile__value--phone">{toFaDigits(user.phone)}</span>
      </div>

      <div className="ac-profile__actions">
        <Link to="/book" className="ac-btn">
          رزرو نوبت جدید
        </Link>
        <button type="button" className="ac-btn ac-btn--danger" onClick={logout}>
          خروج از حساب
        </button>
      </div>
    </div>
  )
}
