import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

export type ToastTone = 'success' | 'error' | 'info'

export interface ToastItem {
  id: number
  message: string
  tone: ToastTone
}

interface ToastContextValue {
  /** Show a message; it disappears after a few seconds. */
  push: (message: string, tone?: ToastTone) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const TOAST_LIFETIME_MS = 5000

/** The provider of the toast messages of the admin panel. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const counter = useRef(0)
  const timers = useRef<number[]>([])

  const remove = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const push = useCallback(
    (message: string, tone: ToastTone = 'info') => {
      counter.current += 1
      const id = counter.current
      setToasts((current) => [...current, { id, message, tone }])
      const timer = window.setTimeout(() => remove(id), TOAST_LIFETIME_MS)
      timers.current.push(timer)
    },
    [remove],
  )

  useEffect(
    () => () => {
      timers.current.forEach((timer) => window.clearTimeout(timer))
    },
    [],
  )

  const value = useMemo<ToastContextValue>(() => ({ push }), [push])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="ad-toasts" role="status" aria-live="polite" aria-atomic="false">
        {toasts.map((toast) => (
          <div key={toast.id} className={`ad-toast ad-toast--${toast.tone}`}>
            <span className="ad-toast__text">{toast.message}</span>
            <button
              type="button"
              className="ad-toast__close"
              onClick={() => remove(toast.id)}
              aria-label="بستن پیام"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

/** Show a toast message. */
export function useToast(): ToastContextValue {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used inside <ToastProvider>')
  return context
}
