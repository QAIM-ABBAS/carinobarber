import Button from './Button'

export interface ErrorStateProps {
  message: string
  onRetry?: () => void
  retryLabel?: string
}

/** The error state of a list: the message of the server and a retry button. */
export default function ErrorState({
  message,
  onRetry,
  retryLabel = 'تلاش دوباره',
}: ErrorStateProps) {
  return (
    <div className="ad-error" role="alert">
      <p className="ad-error__message">{message}</p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          {retryLabel}
        </Button>
      )}
    </div>
  )
}
