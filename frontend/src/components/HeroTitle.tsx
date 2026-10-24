import { useLayoutEffect, useRef } from 'react'
import { brand } from '../data/content'


/** Giant poster title. It sits BEHIND the man (z-10 vs z-20). */
export default function HeroTitle() {
  const [first] = brand.titleLines
  const boxRef = useRef<HTMLHeadingElement>(null)
  const lineRefs = useRef<Array<HTMLSpanElement | null>>([])

  /* Stretch each line horizontally until it exactly fills its span. The factor
     is measured (not hardcoded) so it survives font swaps, resizes and copy edits. */
  useLayoutEffect(() => {
    const box = boxRef.current
    if (!box) return

    const fit = () => {
      const boxWidth = box.clientWidth
      if (!boxWidth) return
      lineRefs.current.forEach((line) => {
        if (!line) return
        const inner = line.firstElementChild as HTMLElement | null
        if (!inner) return
        const natural = inner.offsetWidth // layout width, unaffected by scaleX
        if (!natural) return
        const target = boxWidth
        line.style.setProperty('--stretch', String(target / natural))
      })
    }

    fit()
    void document.fonts?.ready.then(fit) // Jomhuria changes the natural width
    const observer = new ResizeObserver(fit)
    observer.observe(box)
    return () => observer.disconnect()
  }, [])

  return (
    <h1 id="hero-title" ref={boxRef} className="hero__title hero__title--ltr" dir="ltr" aria-label={first}>
      <span
        className="hero__title-line"
        aria-hidden="true"
        ref={(el) => {
          lineRefs.current[0] = el
        }}
      >
        <span className="hero__title-text">{first}</span>
      </span>
    </h1>
  )
}
