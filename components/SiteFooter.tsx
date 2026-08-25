import Link from "next/link";
import SiteBrand from "@/components/SiteBrand";
import { SITE_OWNER } from "@/lib/site-owner";
import { getTrustPageByKey } from "@/lib/trust-content";
import type { Locale } from "@/lib/templates";

export default function SiteFooter({ locale }: { locale: Locale }) {
  const privacy = getTrustPageByKey(locale, "privacy");
  const legal = getTrustPageByKey(locale, "legal");
  const about = getTrustPageByKey(locale, "about");
  const subject = locale === "fr" ? "Mon avis sur Mosaipix" : "My feedback about Mosaipix";

  return (
    <footer className="site-footer">
      <div className="shell footer-layout">
        <div className="footer-brand">
          <Link className="brand" href={`/${locale}`}><SiteBrand /></Link>
          <p>{locale === "fr" ? "Crée, colorie et imprime ton pixel art." : "Create, color and print your pixel art."}</p>
        </div>
        <nav className="footer-links" aria-label={locale === "fr" ? "Informations" : "Information"}>
          {about ? <Link href={`/${locale}/${about.slug}`}>{locale === "fr" ? "À propos" : "About"}</Link> : null}
          {privacy ? <Link href={`/${locale}/${privacy.slug}`}>{locale === "fr" ? "Confidentialité" : "Privacy"}</Link> : null}
          {legal ? <Link href={`/${locale}/${legal.slug}`}>{locale === "fr" ? "Mentions légales" : "Legal notice"}</Link> : null}
        </nav>
        <div className="footer-feedback">
          {SITE_OWNER.email ? <a className="feedback-button" href={`mailto:${SITE_OWNER.email}?subject=${encodeURIComponent(subject)}`}>{locale === "fr" ? "Donner mon avis" : "Share feedback"} <span aria-hidden="true">→</span></a> : null}
          <span>© 2026 Mosaipix</span>
        </div>
      </div>
    </footer>
  );
}

