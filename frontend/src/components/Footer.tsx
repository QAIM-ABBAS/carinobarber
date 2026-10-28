import { aboutText, brand, contact, socials } from '../data/content'
import { InstagramIcon, MailIcon, MapPinIcon, MobileIcon, PhoneIcon, TelegramIcon } from './icons'
import './Footer.css'

const socialIcons = { instagram: InstagramIcon, telegram: TelegramIcon }

/**
 * Site footer — the anchors `#about` / `#contact` are the jump targets of the
 * nav. RTL: «درباره ما» sits on the right, «تماس با ما» on the left.
 */
export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer__content">
        <section id="about" className="site-footer__col" aria-labelledby="footer-about" tabIndex={-1}>
          <h2 id="footer-about" className="site-footer__title">درباره ما</h2>
          <p className="site-footer__text">{aboutText}</p>
        </section>

        <section id="contact" className="site-footer__col" aria-labelledby="footer-contact" tabIndex={-1}>
          <h2 id="footer-contact" className="site-footer__title">تماس با ما</h2>
          <ul className="site-footer__list">
            <li>
              <a className="site-footer__item" href={contact.mobile.href}>
                <MobileIcon className="site-footer__icon" />
                <span dir="ltr">{contact.mobile.label}</span>
              </a>
            </li>
            <li>
              <a className="site-footer__item" href={contact.landline.href}>
                <PhoneIcon className="site-footer__icon" />
                <span dir="ltr">{contact.landline.label}</span>
              </a>
            </li>
            <li>
              <a className="site-footer__item" href={contact.email.href}>
                <MailIcon className="site-footer__icon" />
                <span dir="ltr">{contact.email.label}</span>
              </a>
            </li>
            <li className="site-footer__item site-footer__item--address">
              <MapPinIcon className="site-footer__icon" />
              <address className="site-footer__address">{contact.address}</address>
            </li>
            {socials.map(({ label, href, icon }) => {
              const Icon = socialIcons[icon]
              return (
                <li key={icon}>
                  <a className="site-footer__item" href={href} target="_blank" rel="noreferrer noopener">
                    <Icon className="site-footer__icon" />
                    <span>{label}</span>
                  </a>
                </li>
              )
            })}
          </ul>
        </section>
      </div>

      <div className="site-footer__bottom">
        <span>©۱۴۰۴ {brand.name} — تمامی حقوق محفوظ است.</span>
      </div>
    </footer>
  )
}
