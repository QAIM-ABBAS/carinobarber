import { useCallback, useEffect, useState } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import { mediaUrl } from '../lib/api'

interface Props {
  images: string[]
  label: string
}

export default function ServiceGallery({ images, label }: Props) {
  // تنظیم جهت اسلایدر برای زبان فارسی (RTL)
  const [emblaRef, emblaApi] = useEmblaCarousel({ direction: 'rtl', loop: true })
  const [prevBtnDisabled, setPrevBtnDisabled] = useState(true)
  const [nextBtnDisabled, setNextBtnDisabled] = useState(true)

  const scrollPrev = useCallback(() => emblaApi && emblaApi.scrollPrev(), [emblaApi])
  const scrollNext = useCallback(() => emblaApi && emblaApi.scrollNext(), [emblaApi])

  const onSelect = useCallback(() => {
    if (!emblaApi) return
    setPrevBtnDisabled(!emblaApi.canScrollPrev())
    setNextBtnDisabled(!emblaApi.canScrollNext())
  }, [emblaApi])

  useEffect(() => {
    if (!emblaApi) return
    onSelect()
    emblaApi.on('select', onSelect)
    emblaApi.on('reInit', onSelect)
  }, [emblaApi, onSelect])

  if (!images || images.length === 0) return null

  return (
    <div className="sv__carousel">
      <div className="sv__carousel-viewport" ref={emblaRef}>
        <div className="sv__carousel-container">
          {images.map((src, index) => (
            <div className="sv__carousel-slide" key={src}>
              <a href={mediaUrl(src)} target="_blank" rel="noreferrer">
                <img
                  src={mediaUrl(src)}
                  alt={`${label} — تصویر ${index + 1}`}
                  loading="lazy"
                  decoding="async"
                />
              </a>
            </div>
          ))}
        </div>
      </div>
      
      {/* دکمه‌های کنترل (فقط در دسکتاپ نمایش داده می‌شوند تا در موبایل کاربر با Swipe کار کند) */}
      {images.length > 1 && (
        <div className="sv__carousel-controls">
          <button className="sv__carousel-btn" onClick={scrollPrev} disabled={prevBtnDisabled} aria-label="عکس قبلی">
            &#8250; {/* یا هر آیکون فلش دیگری */}
          </button>
          <button className="sv__carousel-btn" onClick={scrollNext} disabled={nextBtnDisabled} aria-label="عکس بعدی">
            &#8249; {/* یا هر آیکون فلش دیگری */}
          </button>
        </div>
      )}
    </div>
  )
}
