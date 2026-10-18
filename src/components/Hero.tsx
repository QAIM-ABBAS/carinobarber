import Header from './Header'
import HeroBackground from './HeroBackground'
import HeroMan from './HeroMan'
import HeroTitle from './HeroTitle'
import ServicesList from './ServicesList'

/**
 * Layer stack (back → front):
 *   0  HeroBackground   – separate full-bleed backdrop
 *  10  HeroTitle        – giant headline
 *  20  HeroMan          – transparent PNG, overlaps the headline
 *  30  ServicesList     – price list + CTA
 *  40  Header           – nav
 */
export default function Hero() {
  return (
    <section id="top" className="hero" aria-labelledby="hero-title">
      <HeroBackground />
      <Header />
      <div className="hero__stage">
        <HeroTitle />
        <HeroMan />
        <ServicesList />
      </div>
    </section>
  )
}
