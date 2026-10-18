/**
 * Background layer. Deliberately separate from everything else:
 * it sits at the very back (z-0) and is purely decorative.
 * Gradients + film grain are CSS-only, so it stays razor sharp at any resolution.
 */
export default function HeroBackground() {
  return <div className="hero__bg" aria-hidden="true" />
}
