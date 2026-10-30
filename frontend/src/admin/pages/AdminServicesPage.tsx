import { useState } from 'react'
import { ApiError, GENERIC_ERROR_MESSAGE } from '../api/client'
import { useAdminServices, useDeactivateService, useUpdateService } from '../api/hooks'
import type { AdminService } from '../api/types'
import Button from '../components/Button'
import ConfirmDialog from '../components/ConfirmDialog'
import EmptyState from '../components/EmptyState'
import ErrorState from '../components/ErrorState'
import PageHeader from '../components/PageHeader'
import { SkeletonTable } from '../components/Skeleton'
import { useToast } from '../components/Toast'
import Toggle from '../components/Toggle'
import { formatNumber, formatToman } from '../lib/format'
import {
  ArrowDownIcon,
  ArrowUpIcon,
  EditIcon,
  ImagesIcon,
  PlusIcon,
  StarIcon,
  TrashIcon,
} from '../layout/icons'
import ServiceFormModal from './ServiceFormModal'
import ServiceImagesModal from './ServiceImagesModal'

/** The services of the shop: the inactive ones are dimmed but still listed. */
export default function AdminServicesPage() {
  const services = useAdminServices()
  const update = useUpdateService()
  const deactivate = useDeactivateService()
  const { push } = useToast()

  const [editing, setEditing] = useState<AdminService | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [galleryServiceId, setGalleryServiceId] = useState<number | null>(null)
  const [deactivating, setDeactivating] = useState<AdminService | null>(null)
  const [busy, setBusy] = useState(false)

  const items = services.data ?? []
  const galleryService =
    galleryServiceId === null ? null : (items.find((item) => item.id === galleryServiceId) ?? null)

  const toggleActive = async (service: AdminService) => {
    try {
      await update.mutateAsync({ id: service.id, is_active: !service.is_active })
      push(
        service.is_active ? 'خدمت غیرفعال شد.' : 'خدمت دوباره فعال شد.',
        'success',
      )
    } catch (err) {
      push(err instanceof ApiError ? err.message : GENERIC_ERROR_MESSAGE, 'error')
    }
  }

  /** Swap the order of a service with its neighbour. */
  const move = async (index: number, direction: -1 | 1) => {
    const service = items[index]
    const neighbour = items[index + direction]
    if (!service || !neighbour) return
    setBusy(true)
    try {
      await Promise.all([
        update.mutateAsync({ id: service.id, sort_order: neighbour.sort_order }),
        update.mutateAsync({ id: neighbour.id, sort_order: service.sort_order }),
      ])
    } catch (err) {
      push(err instanceof ApiError ? err.message : GENERIC_ERROR_MESSAGE, 'error')
    } finally {
      setBusy(false)
    }
  }

  const confirmDeactivate = async () => {
    if (!deactivating) return
    setBusy(true)
    try {
      await deactivate.mutateAsync(deactivating.id)
      push('خدمت غیرفعال شد.', 'success')
      setDeactivating(null)
    } catch (err) {
      push(err instanceof ApiError ? err.message : GENERIC_ERROR_MESSAGE, 'error')
    } finally {
      setBusy(false)
    }
  }

  const errorMessage =
    services.error instanceof ApiError
      ? services.error.message
      : services.error
        ? GENERIC_ERROR_MESSAGE
        : null

  return (
    <div className="ad-page">
      <PageHeader
        title="خدمات"
        description="خدمات باشگاه را مدیریت کنید؛ ترتیب نمایش، قیمت و وضعیت فعال بودن هر خدمت."
        actions={
          <Button
            icon={<PlusIcon />}
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
          >
            افزودن خدمت
          </Button>
        }
      />

      {services.isError && errorMessage ? (
        <ErrorState message={errorMessage} onRetry={() => void services.refetch()} />
      ) : services.isPending ? (
        <SkeletonTable rows={6} columns={5} />
      ) : items.length === 0 ? (
        <EmptyState
          title="هنوز خدمتی ثبت نشده است"
          description="اولین خدمت باشگاه را اضافه کنید تا در سایت و صفحهٔ رزرو دیده شود."
          action={
            <Button onClick={() => setFormOpen(true)}>افزودن خدمت</Button>
          }
        />
      ) : (
        <div className="ad-table-wrap">
          <table className="ad-table">
            <caption className="ad-sr-only">فهرست خدمات باشگاه</caption>
            <thead>
              <tr>
                <th scope="col">خدمت</th>
                <th scope="col">قیمت</th>
                <th scope="col">مدت</th>
                <th scope="col">ویژه</th>
                <th scope="col">وضعیت</th>
                <th scope="col">ترتیب</th>
                <th scope="col">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {items.map((service, index) => (
                <tr
                  key={service.id}
                  data-inactive={!service.is_active}
                  className={service.is_active ? undefined : 'is-inactive'}
                >
                  <td data-label="خدمت">
                    <span className="ad-customer__name">{service.label}</span>
                    <span className="ad-service__slug" dir="ltr">
                      {service.slug}
                    </span>
                    {!service.is_active && (
                      <span className="ad-badge ad-badge--muted">غیرفعال</span>
                    )}
                  </td>
                  <td data-label="قیمت">
                    {formatToman(service.price)}
                    <span className="ad-cell__unit">تومان</span>
                  </td>
                  <td data-label="مدت">{formatNumber(service.duration_minutes)} دقیقه</td>
                  <td data-label="ویژه">
                    {service.featured ? (
                      <span className="ad-star" title="خدمت ویژه">
                        <StarIcon />
                        <span className="ad-sr-only">خدمت ویژه</span>
                      </span>
                    ) : (
                      <span className="ad-cell__muted">—</span>
                    )}
                  </td>
                  <td data-label="وضعیت">
                    <Toggle
                      checked={service.is_active}
                      onChange={() => void toggleActive(service)}
                      label={service.is_active ? 'فعال' : 'غیرفعال'}
                      disabled={busy}
                    />
                  </td>
                  <td data-label="ترتیب">
                    <div className="ad-actions">
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={<ArrowUpIcon />}
                        aria-label={`انتقال ${service.label} به بالا`}
                        disabled={index === 0 || busy}
                        onClick={() => void move(index, -1)}
                      >
                        بالا
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={<ArrowDownIcon />}
                        aria-label={`انتقال ${service.label} به پایین`}
                        disabled={index === items.length - 1 || busy}
                        onClick={() => void move(index, 1)}
                      >
                        پایین
                      </Button>
                    </div>
                  </td>
                  <td data-label="عملیات">
                    <div className="ad-actions">
                      <Button
                        size="sm"
                        variant="secondary"
                        icon={<ImagesIcon />}
                        onClick={() => setGalleryServiceId(service.id)}
                      >
                        تصاویر
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        icon={<EditIcon />}
                        onClick={() => {
                          setEditing(service)
                          setFormOpen(true)
                        }}
                      >
                        ویرایش
                      </Button>
                      {service.is_active && (
                        <Button
                          size="sm"
                          variant="danger"
                          icon={<TrashIcon />}
                          onClick={() => setDeactivating(service)}
                        >
                          غیرفعال‌سازی
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ServiceFormModal
        open={formOpen}
        service={editing}
        onClose={() => {
          setFormOpen(false)
          setEditing(null)
        }}
      />

      <ServiceImagesModal
        open={galleryService !== null}
        service={galleryService}
        onClose={() => setGalleryServiceId(null)}
      />

      <ConfirmDialog
        open={deactivating !== null}
        title="غیرفعال‌سازی خدمت"
        message={`«${deactivating?.label ?? ''}» از سایت و صفحهٔ رزرو حذف می‌شود. نوبت‌های ثبت‌شده دست‌نخورده می‌مانند.`}
        confirmLabel="غیرفعال کن"
        danger
        loading={busy}
        onCancel={() => setDeactivating(null)}
        onConfirm={() => void confirmDeactivate()}
      />
    </div>
  )
}
