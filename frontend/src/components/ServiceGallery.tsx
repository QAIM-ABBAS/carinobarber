import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom' // اضافه شد
import useEmblaCarousel from 'embla-carousel-react'
import { mediaUrl } from '../lib/api'

interface Props {
  images: string[]
  label: string
}

export default function ServiceGallery({ images, label }: Props) {
  // اسلایدر کوچک (گالری)
  const [emblaRef, emblaApi] = useEmblaCarousel({ direction: 'rtl', loop: true })
  const [prevBtnDisabled, setPrevBtnDisabled] = useState(true)
  const [nextBtnDisabled, setNextBtnDisabled] = useState(true)

  // اسلایدر بزرگ (مودال)
  const [modalEmblaRef, modalEmblaApi] = useEmblaCarousel({ direction: 'rtl', loop: true })
  
  // ایندکس عکسی که قرار است باز شود (به جای URL، ایندکس را ذخیره می‌کنیم)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

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

  // وقتی کاربر روی عکسی کلیک می‌کند، ایندکس را تنظیم می‌کنیم و مودال را باز می‌کنیم
  const openLightbox = (index: number) => {
    setSelectedIndex(index)
  }

  // وقتی مودال باز می‌شود، اسلایدر بزرگ را روی همان عکس تنظیم می‌کنیم
  useEffect(() => {
    if (selectedIndex !== null && modalEmblaApi) {
      modalEmblaApi.scrollTo(selectedIndex)
    }
  }, [selectedIndex, modalEmblaApi])

  // قفل کردن اسکرول و بستن با دکمه Escape
  useEffect(() => {
    if (selectedIndex !== null) {
      document.body.style.overflow = 'hidden'
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setSelectedIndex(null)
      }
      window.addEventListener('keydown', handleKeyDown)
      return () => {
        document.body.style.overflow = ''
        window.removeEventListener('keydown', handleKeyDown)
      }
    }
  }, [selectedIndex])

  if (!images || images.length === 0) return null

  return (
    <>
      <div className="sv__carousel">
        <div className="sv__carousel-viewport" ref={emblaRef}>
          <div className="sv__carousel-container">
            {images.map((src, index) => (
              <div className="sv__carousel-slide" key={src}>
                <div 
                  onClick={() => openLightbox(index)}
                  style={{ width: '100%', height: '100%', cursor: 'zoom-in' }}
                  role="button"
                  tabIndex={0}
                  aria-label={`بزرگنمایی تصویر ${index + 1}`}
                  onKeyDown={(e) => { if(e.key === 'Enter' || e.key === ' ') openLightbox(index) }}
                >
                  <img
                    src={mediaUrl(src)}
                    alt={`${label} — تصویر ${index + 1}`}
                    loading="lazy"
                    decoding="async"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {images.length > 1 && (
          <div className="sv__carousel-controls">
            <button className="sv__carousel-btn" onClick={scrollPrev} disabled={prevBtnDisabled} aria-label="عکس قبلی">
              &#8250;
            </button>
            <button className="sv__carousel-btn" onClick={scrollNext} disabled={nextBtnDisabled} aria-label="عکس بعدی">
              &#8249;
            </button>
          </div>
        )}
      </div>

      {/* استفاده از Portal برای رندر مودال مستقیماً در body */}
      {selectedIndex !== null && createPortal(
        <div 
          className="sv__lightbox" 
          onClick={() => setSelectedIndex(null)} // کلیک روی پس‌زمینه مودال را می‌بندد
          role="dialog"
          aria-modal="true"
        >
          <button 
            className="sv__lightbox-close" 
            onClick={(e) => {
              e.stopPropagation() // جلوگیری از اجرای دوباره onClick والد
              setSelectedIndex(null)
            }}
            aria-label="بستن تصویر"
          >
            ×
          </button>

          {/* اسلایدر مخصوص مودال برای قابلیت Swipe */}
          <div 
            className="sv__lightbox-carousel" 
            ref={modalEmblaRef}
            onClick={(e) => e.stopPropagation()} // کلیک روی عکس مودال را نمی‌بندد
          >
            <div className="sv__lightbox-container">
              {images.map((src, index) => (
                <div className="sv__lightbox-slide" key={src}>
                  <img 
                    src={mediaUrl(src)} 
                    alt={`${label} — تصویر ${index + 1}`} 
                    draggable={false}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
