import { Link } from 'react-router-dom'
import Header from '../components/Header'
import Footer from '../components/Footer'
import HeroBackground from '../components/HeroBackground'
import { ArrowStart } from '../components/icons'
import { aboutPage, manImage } from '../data/content'
import { toFaDigits } from '../lib/booking'
import '../about.css'

/**
 * The «درباره ما» page: the story of the shop, the four reasons to choose it
 * and the closing call to action. Every string comes from `aboutPage`.
 */
export default function AboutPage() {
  const { title, tagline, intro, services, reasons, experience, cta } = aboutPage

  return (
    <section className="hero hero--page hero--about" aria-labelledby="about-title">
      <HeroBackground />
      <Header />

      <div className="ab">
        <div className="ab__head">
          <h1 id="about-title" className="ab__title">{title}</h1>
          <p className="ab__tagline">{tagline}</p>
          <picture className="ab__man" aria-hidden="true">
            <source srcSet={manImage.webp} type="image/webp" />
            <img
              src={manImage.png}
              alt=""
              width={manImage.width}
              height={manImage.height}
              decoding="async"
              draggable={false}
            />
          </picture>
        </div>

        <div className="ab__intro">
          {intro.map((paragraph, i) => (
            <p key={paragraph} className={i === 0 ? 'ab__lead' : 'ab__text'}>{paragraph}</p>
          ))}
        </div>

        <section className="ab__section" aria-labelledby="about-services">
          <h2 id="about-services" className="ab__h2">{services.title}</h2>
          {services.paragraphs.map((paragraph) => (
            <p key={paragraph} className="ab__text">{paragraph}</p>
          ))}
        </section>

        <section className="ab__section" aria-labelledby="about-reasons">
          <h2 id="about-reasons" className="ab__h2">{reasons.title}</h2>
          <ul className="ab__reasons">
            {reasons.items.map((item, i) => (
              <li key={item.title} className="ab__reason" style={{ ['--i' as string]: i }}>
                <span className="ab__reason-n" aria-hidden="true">
                  {toFaDigits(String(i + 1).padStart(2, '0'))}
                </span>
                <h3 className="ab__reason-title">{item.title}</h3>
                <p className="ab__reason-text">{item.text}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="ab__section ab__section--quote" aria-labelledby="about-experience">
          <h2 id="about-experience" className="ab__h2">{experience.title}</h2>
          <p className="ab__text">{experience.text}</p>
        </section>

        <div className="ab__cta">
          <div className="ab__cta-copy">
            <h2 className="ab__cta-title">{cta.title}</h2>
            <p className="ab__cta-text">{cta.text}</p>
          </div>
          <Link to="/book" className="ab__btn">
            رزرو نوبت
            <ArrowStart />
          </Link>
        </div>

        <p className="ab__closing">{cta.closing}</p>
      </div>

      <Footer />
    </section>
  )
}
