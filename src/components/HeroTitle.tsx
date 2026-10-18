import { brand } from '../data/content'

/** Giant poster title. It sits BEHIND the man (z-10 vs z-20). */
export default function HeroTitle() {
  const [first, second] = brand.titleLines
  return (
    <h1 id="hero-title" className="hero__title" aria-label={`${first} ${second}`}>
      <span className="hero__title-line" aria-hidden="true">
        {first}
      </span>
      <span className="hero__title-line hero__title-line--short" aria-hidden="true">
        {second}
      </span>
    </h1>
  )
}
