/**
 * All copy + asset paths live here so the design can be re-skinned
 * (or swapped for the full-resolution Lummi photo) without touching components.
 */

export const brand = {
  /** Two-line poster title. Line 1 fills the full width, line 2 is the short one. */
  titleLines: ['Carino Barber'] as const,
  name: 'Carino Barber',
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
  { label: 'درباره ما', href: '/about' },
  { label: 'خدمات', href: '/services' },
  // «گالری» — hidden for this release (no gallery section yet); restore for the next one.
  // { label: 'گالری', href: '/#gallery' },
  { label: 'تماس با ما', href: '/#contact' },
  { label: 'رزرو نوبت', href: '/book' },
  { label: 'حساب', href: '/account' },
]

export const socials = [
  { label: 'اینستاگرام', href: 'https://www.instagram.com/hossein_barber_carino', icon: 'instagram' },
  { label: 'تلگرام', href: 'https://t.me/carino_barber', icon: 'telegram' },
] as const

/** Short «about» paragraph shown in the footer. */
export const aboutText =
  '«Carino Barber» آرایشگاه مردانه‌ای در جناح است؛ جایی برای آراستن با آرامش و سلیقه. ' +
  'تیم ما سال‌ها تجربه در کوتاهی، اصلاح و مراقبت از مو و پوست دارد و به هر استایل امضای خودش را می‌زند.'

/**
 * Contact details of the footer.
 * Placeholders — replace them with the real values here (single source of truth).
 */
export const contact = {
  mobile: { label: '۰۹۰۵ ۹۹۵ ۴۵۳۸', href: 'tel:+989059954538' },
  landline: { label: '۰۲۱ ۸۸۷۷ ۶۵۴۳', href: 'tel:+982188776543' },
  email: { label: 'info@carinobarber.ir', href: 'mailto:info@carinobarber.ir' },
  address: 'جناح، روستای کنارسیاه، کوچه پست بانک',
}

/** The «درباره ما» page: tagline, story, the reasons to choose us and the closing CTA. */
export const aboutPage = {
  title: 'درباره ما',
  tagline: 'استایل شما، تخصص ما',
  intro: [
    'در Carino Barber باور داریم که آراستگی، فراتر از یک اصلاح ساده است؛ بخشی از شخصیت، اعتمادبه‌نفس و سبک زندگی شماست.',
    'ما اینجا هستیم تا با ترکیب تخصص، دقت و شناخت ترندهای روز، تجربه‌ای متفاوت از خدمات پیرایش مردانه را برای شما فراهم کنیم. هدف ما این است که هر مراجعه، فرصتی برای رسیدن به استایلی متناسب با چهره، سلیقه و شخصیت شما باشد.',
  ],
  services: {
    title: 'خدمات حرفه‌ای، متناسب با استایل شما',
    paragraphs: [
      'از اصلاح کلاسیک و مدل‌های مدرن گرفته تا خدمات تخصصی مو و مراقبت از پوست، تلاش می‌کنیم خدماتی متناسب با نیازهای مختلف شما ارائه دهیم.',
      'در Carino Barber، به جزئیات اهمیت می‌دهیم؛ از مشاوره پیش از اصلاح تا اجرای دقیق خدمات و رعایت اصول بهداشتی.',
    ],
  },
  reasons: {
    title: 'چرا Carino Barber؟',
    items: [
      { title: 'توجه به جزئیات', text: 'اجرای خدمات با دقت و متناسب با خواسته شما.' },
      { title: 'مشاوره اختصاصی', text: 'کمک به انتخاب مدل مو و استایلی متناسب با فرم چهره.' },
      { title: 'محیط حرفه‌ای', text: 'اهمیت دادن به آرامش، نظافت و تجربه خوشایند شما.' },
      { title: 'رزرو آسان و سریع', text: 'امکان انتخاب خدمات و ثبت درخواست نوبت از طریق وب‌سایت.' },
    ],
  },
  experience: {
    title: 'تجربه‌ای متفاوت از پیرایش مردانه',
    text: 'ما معتقدیم نتیجه خوب، از شناخت نیاز مشتری شروع می‌شود. به همین دلیل تلاش می‌کنیم پیش از هر خدمت، به سلیقه و انتظارات شما توجه کنیم تا با رضایت و حس خوب از مجموعه خارج شوید.',
  },
  cta: {
    title: 'آماده‌اید استایل جدیدتان را تجربه کنید؟',
    text: 'خدمات موردنظرتان را انتخاب کنید و از طریق سامانه رزرو آنلاین، برای مراجعه خود وقت بگیرید.',
    closing: 'Carino Barber؛ استایل شما، امضای شماست.',
  },
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

/**
 * Rows the home-page price list shows before it starts scrolling inside
 * itself. Six is the artboard ceiling: six rows end just under the title.
 */
export const homeServiceRows = 6

export const bookLabel = 'رزرو'
