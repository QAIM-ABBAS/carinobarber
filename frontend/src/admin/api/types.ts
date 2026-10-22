/**
 * The types of the admin API. They mirror the Pydantic schemas of the backend
 * (`backend/app/schemas/admin.py` and `backend/app/schemas/booking.py`).
 */

export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'

/** A service as the admin sees it (the inactive ones are included). */
export interface AdminService {
  id: number
  slug: string
  label: string
  description: string
  price: number
  duration_minutes: number
  includes: string[]
  featured: boolean
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

/** The body of a service creation. */
export interface ServiceCreate {
  slug: string
  label: string
  description: string
  price: number
  duration_minutes: number
  includes: string[]
  featured: boolean
  is_active: boolean
  sort_order: number
}

/** The body of a service update (the slug is immutable). */
export interface ServiceUpdate {
  label?: string
  description?: string
  price?: number
  duration_minutes?: number
  includes?: string[]
  featured?: boolean
  is_active?: boolean
  sort_order?: number
}

/** The service of a booking (the id is the slug). */
export interface AdminBookingService {
  id: string
  label: string
}

/** A booking as the admin sees it. */
export interface AdminBooking {
  id: number
  code: string
  status: BookingStatus
  service: AdminBookingService
  /** `YYYY-MM-DD` (Gregorian). */
  date: string
  /** `HH:mm`. */
  time: string
  name: string
  phone: string
  price_at_booking: number
  admin_note: string | null
  created_at: string
}

/** A page of bookings. */
export interface AdminBookingList {
  items: AdminBooking[]
  total: number
  page: number
  page_size: number
}

/** The filters of the booking list. */
export interface BookingListParams {
  date?: string
  date_from?: string
  date_to?: string
  status?: BookingStatus
  q?: string
  page?: number
  page_size?: number
}

/** The body of a status / note update. */
export interface AdminBookingUpdate {
  status?: BookingStatus
  admin_note?: string | null
}

/** The body of a manual booking. */
export interface AdminBookingCreate {
  service_id: string
  date: string
  time: string
  name: string
  phone: string
  status?: 'pending' | 'confirmed'
  admin_note?: string
}

/** The numbers of the dashboard. */
export interface StatsSummary {
  today_bookings: number
  upcoming_bookings: number
  revenue_completed_this_month: number
}

/** The shop settings. */
export interface ShopSettings {
  id: number
  open_hour: number
  close_hour: number
  closed_weekdays: number[]
  booking_window_days: number
  cancel_before_hours: number
  max_active_bookings_per_phone: number
  updated_at: string
}

/** The body of a settings update (missing fields keep their value). */
export interface ShopSettingsUpdate {
  open_hour?: number
  close_hour?: number
  closed_weekdays?: number[]
  booking_window_days?: number
  cancel_before_hours?: number
  max_active_bookings_per_phone?: number
}

/** A holiday. */
export interface ClosedDate {
  id: number
  date: string
  reason: string | null
  created_at: string
}

/** The body of a holiday creation. */
export interface ClosedDateCreate {
  date: string
  reason?: string | null
}

/** The answer of the login endpoint. */
export interface LoginResponse {
  access_token: string
  token_type: string
  expires_in: number
}

/** A single slot of the availability. */
export interface AvailabilitySlot {
  time: string
  available: boolean
}

/** A single day of the availability. */
export interface AvailabilityDay {
  date: string
  closed: boolean
  available: boolean
  slots: AvailabilitySlot[]
}

/** The answer of the public availability endpoint. */
export interface AvailabilityResponse {
  days: AvailabilityDay[]
}

/** The field errors the API sends with a 422. */
export interface FieldError {
  field: string
  message: string
}
