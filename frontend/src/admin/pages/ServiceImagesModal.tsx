import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { mediaUrl } from '../../lib/api'
import { ApiError, GENERIC_ERROR_MESSAGE } from '../api/client'
import { useDeleteServiceImage, useUploadServiceImage } from '../api/hooks'
import type { AdminService } from '../api/types'
import Button from '../components/Button'
import Modal from '../components/Modal'
import { useToast } from '../components/Toast'
import { formatNumber } from '../lib/format'
import { TrashIcon, UploadIcon } from '../layout/icons'

/** These mirror the limits of `backend/app/services/media.py`. */
const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const MAX_IMAGES = 12
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export interface ServiceImagesModalProps {
  open: boolean
  /** The service whose gallery is edited (null while the modal is closed). */
  service: AdminService | null
  onClose: () => void
}

function imageFilename(url: string): string {
  return url.split('/').pop() ?? ''
}

/** Upload and delete the images that are shown on the services page. */
export default function ServiceImagesModal({ open, service, onClose }: ServiceImagesModalProps) {
  const upload = useUploadServiceImage()
  const remove = useDeleteServiceImage()
  const { push } = useToast()
  const fileInput = useRef<HTMLInputElement>(null)

  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)
  const [removingBusy, setRemovingBusy] = useState(false)

  // The modal always renders the service of the query cache, so an upload or a
  // delete shows up as soon as the API answers.
  const items = service?.images ?? []

  useEffect(() => {
    if (!open) return
    setError(null)
    setRemoving(null)
  }, [open, service?.id])

  const onFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (!service || !files.length) return

    const tooBig = files.find((file) => file.size > MAX_IMAGE_BYTES)
    if (tooBig) {
      setError(`حجم «${tooBig.name}» بیشتر از ۵ مگابایت است.`)
      return
    }
    const wrongType = files.find((file) => !ALLOWED_TYPES.includes(file.type))
    if (wrongType) {
      setError(`«${wrongType.name}» تصویر مجاز نیست؛ فقط JPEG، PNG یا WebP.`)
      return
    }
    if (items.length + files.length > MAX_IMAGES) {
      setError(`هر خدمت حداکثر ${formatNumber(MAX_IMAGES)} تصویر می‌تواند داشته باشد.`)
      return
    }

    setUploading(true)
    setError(null)
    try {
      for (const file of files) {
        await upload.mutateAsync({ id: service.id, file })
      }
      push(
        files.length === 1
          ? 'تصویر اضافه شد.'
          : `${formatNumber(files.length)} تصویر اضافه شد.`,
        'success',
      )
    } catch (err) {
      setError(err instanceof ApiError ? err.message : GENERIC_ERROR_MESSAGE)
    } finally {
      setUploading(false)
    }
  }

  const confirmRemove = async () => {
    if (!service || !removing) return
    setRemovingBusy(true)
    setError(null)
    try {
      await remove.mutateAsync({
        id: service.id,
        filename: imageFilename(removing),
      })
      setRemoving(null)
      push('تصویر حذف شد.', 'success')
    } catch (err) {
      push(err instanceof ApiError ? err.message : GENERIC_ERROR_MESSAGE, 'error')
    } finally {
      setRemovingBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      title={service ? `تصاویر ${service.label}` : 'تصاویر خدمت'}
      onClose={onClose}
      wide
      footer={
        <Button variant="ghost" onClick={onClose}>
          بستن
        </Button>
      }
    >
      <div className="ad-gallery__toolbar">
        <Button
          icon={<UploadIcon />}
          onClick={() => fileInput.current?.click()}
          loading={uploading}
          disabled={items.length >= MAX_IMAGES}
        >
          افزودن تصویر
        </Button>
        <input
          ref={fileInput}
          className="ad-gallery__input"
          type="file"
          accept={ALLOWED_TYPES.join(',')}
          multiple
          onChange={(event) => void onFiles(event)}
          disabled={uploading}
          aria-label="انتخاب تصاویر خدمت"
        />
        <p className="ad-gallery__hint">
          JPEG، PNG یا WebP، حداکثر ۵ مگابایت. {formatNumber(items.length)} از{' '}
          {formatNumber(MAX_IMAGES)} تصویر.
        </p>
      </div>

      {error && (
        <p className="ad-alert ad-alert--error" role="alert">
          {error}
        </p>
      )}

      {items.length === 0 ? (
        <p className="ad-gallery__empty">
          هنوز تصویری برای این خدمت ثبت نشده است. اولین تصویر را اضافه کنید تا در صفحهٔ
          خدمات نمایش داده شود.
        </p>
      ) : (
        <ul className="ad-gallery" aria-label="تصاویر خدمت">
          {items.map((url, index) => (
            <li key={url} className="ad-gallery__item">
              <a
                className="ad-gallery__link"
                href={mediaUrl(url)}
                target="_blank"
                rel="noreferrer"
                title="نمایش اندازهٔ کامل"
              >
                <img
                  src={mediaUrl(url)}
                  alt={`${service?.label ?? 'خدمت'} — تصویر ${formatNumber(index + 1)}`}
                  loading="lazy"
                />
              </a>
              {removing === url ? (
                <div className="ad-gallery__confirm">
                  <Button
                    size="sm"
                    variant="danger"
                    loading={removingBusy}
                    onClick={() => void confirmRemove()}
                  >
                    حذف کن
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={removingBusy}
                    onClick={() => setRemoving(null)}
                  >
                    انصراف
                  </Button>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="danger"
                  icon={<TrashIcon />}
                  disabled={uploading}
                  onClick={() => setRemoving(url)}
                >
                  حذف
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </Modal>
  )
}
