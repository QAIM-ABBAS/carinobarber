/**
 * The React Query hooks of the admin panel.
 *
 * Every hook reads the token from the `AuthProvider`, sends it with the request and
 * invalidates the queries it changes.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../auth/AuthContext'
import { apiRequest, buildQuery } from './client'
import type {
  AdminBooking,
  AdminBookingCreate,
  AdminBookingList,
  AdminBookingUpdate,
  AdminService,
  AvailabilityResponse,
  BookingListParams,
  ClosedDate,
  ClosedDateCreate,
  ServiceCreate,
  ServiceUpdate,
  ShopSettings,
  ShopSettingsUpdate,
  StatsSummary,
} from './types'

/** The keys of the queries (the admin part is invalidated as a whole). */
export const queryKeys = {
  stats: ['admin', 'stats'] as const,
  bookings: (params: BookingListParams) => ['admin', 'bookings', params] as const,
  allBookings: ['admin', 'bookings'] as const,
  services: ['admin', 'services'] as const,
  settings: ['admin', 'settings'] as const,
  closedDates: ['admin', 'closed-dates'] as const,
  availability: (start?: string, days?: number) =>
    ['public', 'availability', start ?? null, days ?? null] as const,
}

/* ------------------------------------------------------------------ reads */

/** The numbers of the dashboard. */
export function useStats() {
  const { token } = useAuth()
  return useQuery({
    queryKey: queryKeys.stats,
    queryFn: ({ signal }) =>
      apiRequest<StatsSummary>('/admin/stats/summary', { token, signal }),
    enabled: Boolean(token),
    refetchInterval: 60_000,
  })
}

/** A filtered and paginated page of bookings. */
export function useBookings(
  params: BookingListParams,
  options: { refetchInterval?: number } = {},
) {
  const { token } = useAuth()
  return useQuery({
    queryKey: queryKeys.bookings(params),
    queryFn: ({ signal }) =>
      apiRequest<AdminBookingList>(
        `/admin/bookings${buildQuery({
          date: params.date,
          date_from: params.date_from,
          date_to: params.date_to,
          status: params.status,
          q: params.q,
          page: params.page,
          page_size: params.page_size,
        })}`,
        { token, signal },
      ),
    enabled: Boolean(token),
    placeholderData: (previous) => previous,
    refetchInterval: options.refetchInterval,
  })
}

/** Every service, including the inactive ones. */
export function useAdminServices() {
  const { token } = useAuth()
  return useQuery({
    queryKey: queryKeys.services,
    queryFn: ({ signal }) => apiRequest<AdminService[]>('/admin/services', { token, signal }),
    enabled: Boolean(token),
  })
}

/** The shop settings. */
export function useSettings() {
  const { token } = useAuth()
  return useQuery({
    queryKey: queryKeys.settings,
    queryFn: ({ signal }) => apiRequest<ShopSettings>('/admin/settings', { token, signal }),
    enabled: Boolean(token),
  })
}

/** Every holiday. */
export function useClosedDates() {
  const { token } = useAuth()
  return useQuery({
    queryKey: queryKeys.closedDates,
    queryFn: ({ signal }) => apiRequest<ClosedDate[]>('/admin/closed-dates', { token, signal }),
    enabled: Boolean(token),
  })
}

/**
 * The availability of the coming days (the public endpoint).
 *
 * The endpoint clamps the range to the booking window of the shop, so a start date
 * outside the window answers 422 `date_out_of_range`.
 */
export function useAvailability(start?: string, days?: number) {
  return useQuery({
    queryKey: queryKeys.availability(start, days),
    queryFn: ({ signal }) =>
      apiRequest<AvailabilityResponse>(`/availability${buildQuery({ start, days })}`, { signal }),
  })
}

/* --------------------------------------------------------------- mutations */

/** Change the status and/or the note of a booking. */
export function useUpdateBooking() {
  const { token } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: number } & AdminBookingUpdate) =>
      apiRequest<AdminBooking>(`/admin/bookings/${id}`, {
        method: 'PATCH',
        body: payload,
        token,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.allBookings })
      void queryClient.invalidateQueries({ queryKey: queryKeys.stats })
      void queryClient.invalidateQueries({ queryKey: ['public', 'availability'] })
    },
  })
}

/** Create a booking by hand. */
export function useCreateBooking() {
  const { token } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: AdminBookingCreate) =>
      apiRequest<AdminBooking>('/admin/bookings', {
        method: 'POST',
        body: payload,
        token,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.allBookings })
      void queryClient.invalidateQueries({ queryKey: queryKeys.stats })
      void queryClient.invalidateQueries({ queryKey: ['public', 'availability'] })
    },
  })
}

/** Add a service. */
export function useCreateService() {
  const { token } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: ServiceCreate) =>
      apiRequest<AdminService>('/admin/services', { method: 'POST', body: payload, token }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.services })
    },
  })
}

/** Change a service. */
export function useUpdateService() {
  const { token } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: number } & ServiceUpdate) =>
      apiRequest<AdminService>(`/admin/services/${id}`, {
        method: 'PATCH',
        body: payload,
        token,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.services })
    },
  })
}

/** Deactivate a service (the soft delete of the API). */
export function useDeactivateService() {
  const { token } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      apiRequest<AdminService>(`/admin/services/${id}`, { method: 'DELETE', token }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.services })
    },
  })
}

/** Change the shop settings. */
export function useUpdateSettings() {
  const { token } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: ShopSettingsUpdate) =>
      apiRequest<ShopSettings>('/admin/settings', { method: 'PUT', body: payload, token }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.settings })
      void queryClient.invalidateQueries({ queryKey: ['public', 'availability'] })
    },
  })
}

/** Add a holiday. */
export function useAddClosedDate() {
  const { token } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: ClosedDateCreate) =>
      apiRequest<ClosedDate>('/admin/closed-dates', { method: 'POST', body: payload, token }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.closedDates })
      void queryClient.invalidateQueries({ queryKey: ['public', 'availability'] })
    },
  })
}

/** Remove a holiday. */
export function useDeleteClosedDate() {
  const { token } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      apiRequest<void>(`/admin/closed-dates/${id}`, { method: 'DELETE', token }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.closedDates })
      void queryClient.invalidateQueries({ queryKey: ['public', 'availability'] })
    },
  })
}
