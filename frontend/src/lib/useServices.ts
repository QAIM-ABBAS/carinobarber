import { useEffect, useState } from 'react'
import { services as fallbackServices, type Service } from '../data/content'
import { serviceDetails as fallbackDetails, type ServiceDetail } from '../data/serviceDetails'
import { ApiError, fetchServices, type ApiService } from './api'
import { formatPrice, toFaDigits } from './booking'

export interface ServicesState {
  /** The services of the shop (the static ones while the API is loading or offline). */
  services: Service[]
  /** The extra copy of the services page, merged with the API data. */
  details: Record<string, ServiceDetail>
  /** The gallery of each service, keyed by the service slug. */
  images: Record<string, string[]>
  loading: boolean
  error: string | null
}

const FALLBACK_ERROR = 'دریافت فهرست خدمات ممکن نشد؛ اطلاعات پیش‌فرض نمایش داده می‌شود.'

function mergeDetails(list: ApiService[]): Record<string, ServiceDetail> {
  const merged: Record<string, ServiceDetail> = { ...fallbackDetails }
  for (const service of list) {
    const fallback = fallbackDetails[service.id]
    merged[service.id] = {
      description: service.description || fallback?.description || '',
      duration: service.duration_minutes
        ? `${toFaDigits(service.duration_minutes)} دقیقه`
        : (fallback?.duration ?? '—'),
      includes: service.includes?.length ? service.includes : (fallback?.includes ?? []),
      featured: service.featured,
    }
  }
  return merged
}

/**
 * Loads the services of the shop from the API.
 *
 * The static data of `data/content.ts` stays visible while the request is running
 * and is used as a fallback when the API cannot be reached.
 */
export function useServices(): ServicesState {
  const [services, setServices] = useState<Service[]>(fallbackServices)
  const [details, setDetails] = useState<Record<string, ServiceDetail>>(fallbackDetails)
  const [images, setImages] = useState<Record<string, string[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    fetchServices()
      .then((list) => {
        if (cancelled || !list.length) return
        setServices(list.map((s) => ({ id: s.id, label: s.label, price: formatPrice(s.price) })))
        setDetails(mergeDetails(list))
        setImages(Object.fromEntries(list.map((s) => [s.id, s.images ?? []])))
        setError(null)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof ApiError ? err.message : FALLBACK_ERROR)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  return { services, details, images, loading, error }
}
