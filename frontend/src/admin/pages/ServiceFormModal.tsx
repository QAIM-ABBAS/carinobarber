import { useEffect, useState, type FormEvent } from 'react'
import { ApiError, GENERIC_ERROR_MESSAGE } from '../api/client'
import { useCreateService, useUpdateService } from '../api/hooks'
import type { AdminService, ServiceCreate } from '../api/types'
import {
  EMPTY_SERVICE_FORM,
  SERVICE_FIELD_NAMES,
  serviceToForm,
  validateServiceForm,
  type ServiceFormErrors,
  type ServiceFormState,
} from '../lib/serviceForm'
import Button from '../components/Button'
import Field from '../components/Field'
import Modal from '../components/Modal'
import TagInput from '../components/TagInput'
import { useToast } from '../components/Toast'

export interface ServiceFormModalProps {
  open: boolean
  /** The service that is edited (null → a new service). */
  service: AdminService | null
  onClose: () => void
}

/** The form that creates and edits a service. */
export default function ServiceFormModal({ open, service, onClose }: ServiceFormModalProps) {
  const [form, setForm] = useState<ServiceFormState>(EMPTY_SERVICE_FORM)
  const [errors, setErrors] = useState<ServiceFormErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const create = useCreateService()
  const update = useUpdateService()
  const { push } = useToast()

  const isNew = service === null

  useEffect(() => {
    if (!open) return
    setForm(service ? serviceToForm(service) : EMPTY_SERVICE_FORM)
    setErrors({})
    setFormError(null)
  }, [open, service])

  const patch = (values: Partial<ServiceFormState>) =>
    setForm((current) => ({ ...current, ...values }))

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const found = validateServiceForm(form, isNew)
    setErrors(found)
    setFormError(null)
    if (Object.keys(found).length > 0) return

    const payload: ServiceCreate = {
      slug: form.slug.trim(),
      label: form.label.trim(),
      description: form.description.trim(),
      price: Number(form.price),
      duration_minutes: Number(form.duration),
      includes: form.includes,
      featured: form.featured,
      is_active: form.is_active,
      sort_order: Number(form.sort_order),
    }

    try {
      if (isNew) {
        await create.mutateAsync(payload)
        push('خدمت جدید ثبت شد.', 'success')
      } else {
        // The slug is immutable: the API rejects a body that contains it.
        const { slug: _slug, ...changes } = payload
        await update.mutateAsync({ id: service.id, ...changes })
        push('خدمت به‌روزرسانی شد.', 'success')
      }
      onClose()
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.message)
        const fields = err.fieldErrors
        if (fields.length > 0) {
          setErrors((current) => {
            const next = { ...current }
            for (const item of fields) {
              const key = SERVICE_FIELD_NAMES[item.field.split('.')[0]]
              if (key) next[key] = item.message
            }
            return next
          })
        }
        return
      }
      setFormError(GENERIC_ERROR_MESSAGE)
    }
  }

  return (
    <Modal
      open={open}
      title={isNew ? 'افزودن خدمت' : `ویرایش «${service?.label ?? ''}»`}
      onClose={onClose}
      wide
      footer={
        <>
          <Button type="submit" form="service-form" loading={create.isPending || update.isPending}>
            {isNew ? 'افزودن خدمت' : 'ذخیرهٔ تغییرات'}
          </Button>
          <Button variant="ghost" onClick={onClose}>
            انصراف
          </Button>
        </>
      }
    >
      <form id="service-form" className="ad-form ad-form--two" onSubmit={onSubmit} noValidate>
        <Field label="نام خدمت" htmlFor="service-label" error={errors.label}>
          <input
            id="service-label"
            className="ad-input"
            type="text"
            value={form.label}
            maxLength={100}
            onChange={(event) => patch({ label: event.target.value })}
            aria-invalid={Boolean(errors.label)}
          />
        </Field>

        <Field
          label="شناسه (انگلیسی)"
          htmlFor="service-slug"
          error={errors.slug}
          hint={
            isNew
              ? 'حروف کوچک انگلیسی، رقم و خط تیره — مثلاً haircut'
              : 'شناسه بعد از ساخت قابل تغییر نیست.'
          }
        >
          <input
            id="service-slug"
            className="ad-input"
            type="text"
            dir="ltr"
            value={form.slug}
            maxLength={50}
            disabled={!isNew}
            onChange={(event) => patch({ slug: event.target.value.toLowerCase() })}
            aria-invalid={Boolean(errors.slug)}
          />
        </Field>

        <Field
          label="توضیح"
          htmlFor="service-description"
          error={errors.description}
          className="ad-form__full"
        >
          <textarea
            id="service-description"
            className="ad-textarea"
            value={form.description}
            maxLength={2000}
            onChange={(event) => patch({ description: event.target.value })}
            aria-invalid={Boolean(errors.description)}
          />
        </Field>

        <Field label="قیمت (تومان)" htmlFor="service-price" error={errors.price}>
          <input
            id="service-price"
            className="ad-input"
            type="number"
            inputMode="numeric"
            min={0}
            value={form.price}
            onChange={(event) => patch({ price: event.target.value })}
            aria-invalid={Boolean(errors.price)}
          />
        </Field>

        <Field label="مدت زمان (دقیقه)" htmlFor="service-duration" error={errors.duration}>
          <input
            id="service-duration"
            className="ad-input"
            type="number"
            inputMode="numeric"
            min={1}
            max={600}
            value={form.duration}
            onChange={(event) => patch({ duration: event.target.value })}
            aria-invalid={Boolean(errors.duration)}
          />
        </Field>

        <Field label="ترتیب نمایش" htmlFor="service-order" error={errors.sort_order}>
          <input
            id="service-order"
            className="ad-input"
            type="number"
            inputMode="numeric"
            min={0}
            value={form.sort_order}
            onChange={(event) => patch({ sort_order: event.target.value })}
            aria-invalid={Boolean(errors.sort_order)}
          />
        </Field>

        <div className="ad-field">
          <span className="ad-field__label">وضعیت</span>
          <label className="ad-switch">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(event) => patch({ is_active: event.target.checked })}
            />
            <span>در سایت نمایش داده شود</span>
          </label>
          <label className="ad-switch">
            <input
              type="checkbox"
              checked={form.featured}
              onChange={(event) => patch({ featured: event.target.checked })}
            />
            <span>خدمت ویژه</span>
          </label>
        </div>

        <TagInput
          label="موارد شامل خدمت"
          htmlFor="service-includes"
          value={form.includes}
          onChange={(includes) => patch({ includes })}
          error={errors.includes}
          hint="با Enter یا کاما اضافه می‌شود."
          className="ad-form__full"
        />

        {formError && (
          <p className="ad-alert ad-alert--error ad-form__full" role="alert">
            {formError}
          </p>
        )}
      </form>
    </Modal>
  )
}
