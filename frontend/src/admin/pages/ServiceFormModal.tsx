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
import Toggle from '../../components/Toggle'
import Field from '../components/Field'
import Modal from '../components/Modal'
import TagInput from '../components/TagInput'
import { useToast } from '../components/Toast'
import { faDigits } from '../lib/format'
import { LockIcon } from '../layout/icons'

export interface ServiceFormModalProps {
  open: boolean
  /** The service that is edited (null → a new service). */
  service: AdminService | null
  onClose: () => void
}

/**
 * The form that creates and edits a service.
 *
 * The form is split into three labelled sections (identity, price/time, display)
 * so every control has an obvious heading, label and helper text.
 */
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
      description={
        isNew
          ? 'فیلدهای ستاره‌دار الزامی‌اند. خدمت جدید بلافاصله در سایت دیده می‌شود.'
          : 'فیلدهای ستاره‌دار الزامی‌اند. تغییرات پس از ذخیره در سایت اعمال می‌شود.'
      }
      onClose={onClose}
      wide
      footerClassName="ad-modal__foot--split"
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
      <form id="service-form" className="ad-service-form" onSubmit={onSubmit} noValidate>
        <section className="ad-form-section" aria-labelledby="service-section-basic">
          <div className="ad-form-section__head">
            <h3 className="ad-form-section__title" id="service-section-basic">
              مشخصات خدمت
            </h3>
            <p className="ad-form-section__desc">
              نام، شناسه و توضیحی که مشتری در سایت و صفحهٔ رزرو می‌بیند.
            </p>
          </div>

          <div className="ad-form-section__grid ad-form-section__grid--two">
            <Field
              label="نام خدمت"
              htmlFor="service-label"
              required
              error={errors.label}
              hint="همین نام در فهرست خدمات و صفحهٔ رزرو دیده می‌شود."
            >
              <input
                id="service-label"
                className="ad-input"
                type="text"
                value={form.label}
                maxLength={100}
                required
                placeholder="مثلاً اصلاح موی سر"
                onChange={(event) => patch({ label: event.target.value })}
                aria-invalid={Boolean(errors.label)}
              />
            </Field>

            {isNew ? (
              <Field
                label="شناسه (انگلیسی)"
                htmlFor="service-slug"
                required
                error={errors.slug}
                hint="حروف کوچک انگلیسی، رقم و خط تیره — مثلاً haircut"
              >
                <input
                  id="service-slug"
                  className="ad-input"
                  type="text"
                  dir="ltr"
                  value={form.slug}
                  maxLength={50}
                  required
                  placeholder="haircut"
                  onChange={(event) => patch({ slug: event.target.value.toLowerCase() })}
                  aria-invalid={Boolean(errors.slug)}
                />
              </Field>
            ) : (
              <div className="ad-field">
                <span className="ad-field__label">شناسه (انگلیسی)</span>
                <div className="ad-readonly">
                  <code className="ad-readonly__value" dir="ltr">
                    {form.slug}
                  </code>
                  <span className="ad-readonly__badge">
                    <LockIcon />
                    ثابت
                  </span>
                </div>
                <p className="ad-field__hint">شناسه بعد از ساخت قابل تغییر نیست.</p>
              </div>
            )}

            <Field
              label="توضیح خدمت"
              htmlFor="service-description"
              required
              error={errors.description}
              className="ad-form__full"
              meta={`${faDigits(form.description.length)} از ${faDigits(2000)} نویسه`}
            >
              <textarea
                id="service-description"
                className="ad-textarea"
                value={form.description}
                maxLength={2000}
                required
                placeholder="یک توضیح کوتاه دربارهٔ این خدمت و نتیجه‌اش…"
                onChange={(event) => patch({ description: event.target.value })}
                aria-invalid={Boolean(errors.description)}
              />
            </Field>
          </div>
        </section>

        <section className="ad-form-section" aria-labelledby="service-section-price">
          <div className="ad-form-section__head">
            <h3 className="ad-form-section__title" id="service-section-price">
              قیمت و زمان
            </h3>
            <p className="ad-form-section__desc">
              مبلغ، مدت انجام و جای این خدمت در فهرست سایت.
            </p>
          </div>

          <div className="ad-form-section__grid ad-form-section__grid--three">
            <Field label="قیمت" htmlFor="service-price" required error={errors.price}>
              <div className="ad-input-wrap">
                <input
                  id="service-price"
                  className="ad-input ad-input--unit"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={form.price}
                  required
                  onChange={(event) => patch({ price: event.target.value })}
                  aria-invalid={Boolean(errors.price)}
                />
                <span className="ad-input__unit">تومان</span>
              </div>
            </Field>

            <Field label="مدت زمان" htmlFor="service-duration" required error={errors.duration}>
              <div className="ad-input-wrap">
                <input
                  id="service-duration"
                  className="ad-input ad-input--unit"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={600}
                  value={form.duration}
                  required
                  onChange={(event) => patch({ duration: event.target.value })}
                  aria-invalid={Boolean(errors.duration)}
                />
                <span className="ad-input__unit">دقیقه</span>
              </div>
            </Field>

            <Field
              label="ترتیب نمایش"
              htmlFor="service-sort"
              error={errors.sort_order}
              hint="عدد کوچک‌تر، بالاتر در فهرست."
            >
              <input
                id="service-sort"
                className="ad-input"
                type="number"
                inputMode="numeric"
                min={0}
                value={form.sort_order}
                onChange={(event) => patch({ sort_order: event.target.value })}
                aria-invalid={Boolean(errors.sort_order)}
              />
            </Field>
          </div>
        </section>

        <section className="ad-form-section" aria-labelledby="service-section-display">
          <div className="ad-form-section__head">
            <h3 className="ad-form-section__title" id="service-section-display">
              نمایش و ویژگی‌ها
            </h3>
            <p className="ad-form-section__desc">
              وضعیت خدمت در سایت و مواردی که زیر نام آن فهرست می‌شود.
            </p>
          </div>

          <div className="ad-form-section__grid">
            <div className="ad-toggle-grid">
              <Toggle
                checked={form.is_active}
                onChange={(val) => patch({ is_active: val })}
                label="نمایش در سایت"
                description="اگر خاموش باشد، خدمت از سایت و صفحهٔ رزرو حذف می‌شود."
              />
              <Toggle
                checked={form.featured}
                onChange={(val) => patch({ featured: val })}
                label="خدمت ویژه"
                description="با ستاره در فهرست خدمات نشان داده می‌شود."
              />
            </div>

            <TagInput
              label="موارد شامل خدمت"
              htmlFor="service-includes"
              value={form.includes}
              onChange={(includes) => patch({ includes })}
              error={errors.includes}
              hint="هر مورد را با Enter یا کاما اضافه کنید؛ مثلاً شست‌وشو، ماساژ سر."
            />
          </div>
        </section>

        {formError && (
          <p className="ad-alert ad-alert--error" role="alert">
            {formError}
          </p>
        )}
      </form>
    </Modal>
  )
}
