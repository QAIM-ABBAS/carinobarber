/**
 * All copy + asset paths live here so the design can be re-skinned
 * (or swapped for the full-resolution Lummi photo) without touching components.
 */

export const brand = {
  /** Two-line poster title. Line 1 fills the full width, line 2 is the short one. */
  titleLines: ['Carino Barber'] as const,
  name: 'باشگاه جنتلمن‌ها',
}

/** Transparent cut-out of the man. Replace with a higher-res cut-out any time (same aspect ratio). */
export const manImage = {
  png: '/images/man.png',
  webp: '/images/man.webp',
  alt: 'مردی با موهای حنایی مواج و ریش پرپشت، از نیم‌رخ',
  width: 1575,
  height: 1749,
}

export interface NavItem {
  label: string
  href: string
}

export const navItems: NavItem[] = [
  { label: 'درباره ما', href: '/#about' },
  { label: 'خدمات', href: '/services' },
  // «گالری» — hidden for this release (no gallery section yet); restore for the next one.
  // { label: 'گالری', href: '/#gallery' },
  { label: 'تماس با ما', href: '/#contact' },
  { label: 'رزرو نوبت', href: '/book' },
  { label: 'حساب', href: '/account' },
]

export const socials = [
  { label: 'اینستاگرام', href: 'https://instagram.com/carino.barber', icon: 'instagram' },
  { label: 'تلگرام', href: 'https://t.me/carino_barber', icon: 'telegram' },
] as const

/** Short «about» paragraph shown in the footer. */
export const aboutText =
  '«باشگاه جنتلمن‌ها» آرایشگاه مردانه‌ای در دل تهران است؛ جایی برای آراستن با آرامش و سلیقه. ' +
  'تیم ما سال‌ها تجربه در کوتاهی، اصلاح و مراقبت از مو و پوست دارد و به هر استایل امضای خودش را می‌زند.'

/**
 * Contact details of the footer.
 * Placeholders — replace them with the real values here (single source of truth).
 */
export const contact = {
  mobile: { label: '۰۹۱۲ ۳۴۵ ۶۷۸۹', href: 'tel:+989123456789' },
  landline: { label: '۰۲۱ ۸۸۷۷ ۶۵۴۳', href: 'tel:+982188776543' },
  email: { label: 'info@carinobarber.ir', href: 'mailto:info@carinobarber.ir' },
  address: 'تهران، خیابان ولیعصر، بالاتر از پارک ساعی، پلاک ۲۴۷',
}

export interface Service {
  id: string
  label: string
  /** Display price, Persian digits (placeholder values, in Toman). */
  price: string
}

export const currency = 'تومان'

export const services: Service[] = [
  { id: 'haircut', label: 'کوتاهی مو', price: '۴۰۰٬۰۰۰' },
  { id: 'beard', label: 'اصلاح و مدل ریش', price: '۳۵۰٬۰۰۰' },
  { id: 'shave', label: 'اصلاح با تیغ', price: '۳۰۰٬۰۰۰' },
  { id: 'styling', label: 'حالت‌دهی مو', price: '۵۰۰٬۰۰۰' },
  { id: 'facial', label: 'مراقبت از پوست', price: '۶۰۰٬۰۰۰' },
  { id: 'package', label: 'پکیج‌های آراستگی', price: '۷۵۰٬۰۰۰' },
]

/** Row that shows the "book" CTA by default (matches the reference design). */
export const defaultActiveService = 'facial'

export const bookLabel = 'رزرو'
