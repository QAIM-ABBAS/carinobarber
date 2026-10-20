/**
 * Extra copy for the Services page, keyed by the service ids in content.ts.
 * Labels and prices still come from `services` in content.ts (single source of truth).
 */
export interface ServiceDetail {
  description: string
  duration: string
  includes: string[]
  featured?: boolean
}

export const serviceDetails: Record<string, ServiceDetail> = {
  haircut: {
    description: 'کوتاهی متناسب با فرم صورت و بافت مو، با قیچی و ماشین؛ همراه با شست‌وشو و حالت‌دهی نهایی.',
    duration: '۴۵ دقیقه',
    includes: ['شست‌وشو', 'کوتاهی', 'حالت‌دهی'],
  },
  beard: {
    description: 'هم‌اندازه‌کردن و مدل‌دادن به ریش با خط‌ریش تمیز، حوله گرم و روغن مراقبتی.',
    duration: '۳۰ دقیقه',
    includes: ['حوله گرم', 'خط‌ریش', 'روغن ریش'],
  },
  shave: {
    description: 'اصلاح کلاسیک با تیغ و کف گرم؛ صاف، آرام و بدون سوزش.',
    duration: '۳۰ دقیقه',
    includes: ['بخور گرم', 'کف اصلاح', 'افترشیو'],
  },
  styling: {
    description: 'حالت‌دهی مو برای مراسم یا استایل روزمره، با محصولات حرفه‌ای و سشوار.',
    duration: '۳۰ دقیقه',
    includes: ['سشوار', 'واکس و پماد', 'اسپری فیکس'],
  },
  facial: {
    description: 'پاک‌سازی عمیق، لایه‌برداری و ماسک مخصوص آقایان برای پوستی شاداب‌تر.',
    duration: '۴۰ دقیقه',
    includes: ['پاک‌سازی', 'لایه‌برداری', 'ماسک'],
  },
  package: {
    description: 'کوتاهی مو، مدل‌دهی ریش و اصلاح با تیغ در یک نوبت؛ تجربه کامل باشگاه.',
    duration: '۹۰ دقیقه',
    includes: ['کوتاهی مو', 'مدل ریش', 'اصلاح با تیغ', 'مراقبت پوست'],
    featured: true,
  },
}
