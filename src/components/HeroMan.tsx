import { manImage } from '../data/content'

/**
 * The man: a transparent PNG layered ABOVE the title (z-20) and below the UI (z-30).
 * WebP is offered first for weight, PNG is the universal fallback.
 */
export default function HeroMan() {
  return (
    <div className="hero__man">
      <picture>
        <source srcSet={manImage.webp} type="image/webp" />
        <img
          src={manImage.png}
          alt={manImage.alt}
          width={manImage.width}
          height={manImage.height}
          decoding="async"
          fetchPriority="high"
          draggable={false}
        />
      </picture>
    </div>
  )
}
