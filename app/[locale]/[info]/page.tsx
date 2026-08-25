import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteBrand from "@/components/SiteBrand";
import SiteFooter from "@/components/SiteFooter";
import { SITE_URL } from "@/lib/site-metadata";
import { SITE_OWNER } from "@/lib/site-owner";
import { getTrustPage, getTrustPages } from "@/lib/trust-content";
import type { Locale } from "@/lib/templates";

type InfoParams = { locale: string; info: string };

function parseLocale(value: string): Locale {
  if (value !== "fr" && value !== "en") notFound();
  return value;
}

export function generateStaticParams({ params }: { params: { locale: string } }) {
  const locale = parseLocale(params.locale);
  return getTrustPages(locale).map((page) => ({ info: page.slug }));
}

export async function generateMetadata({ params }: { params: Promise<InfoParams> }): Promise<Metadata> {
  const { locale: localeParam, info } = await params;
  const locale = parseLocale(localeParam);
  const page = getTrustPage(locale, info);
  if (!page) notFound();
  const canonical = `/${locale}/${page.slug}`;
  return {
    title: page.title,
    description: page.description,
    alternates: {
      canonical,
      languages: {
        "fr-FR": locale === "fr" ? canonical : `/fr/${page.alternateSlug}`,
        "en-US": locale === "en" ? canonical : `/en/${page.alternateSlug}`,
        "x-default": page.key === "about" ? "/en/about" : locale === "fr" ? canonical : `/fr/${page.alternateSlug}`,
      },
    },
    openGraph: {
      type: "website",
      url: `${SITE_URL}${canonical}`,
      siteName: "Mosaipix",
      title: page.title,
      description: page.description,
      locale: locale === "fr" ? "fr_FR" : "en_US",
      alternateLocale: locale === "fr" ? ["en_US"] : ["fr_FR"],
      images: [{ url: "/og.png", width: 1200, height: 630, alt: page.title }],
    },
  };
}

export default async function InfoPage({ params }: { params: Promise<InfoParams> }) {
  const { locale: localeParam, info } = await params;
  const locale = parseLocale(localeParam);
  const page = getTrustPage(locale, info);
  if (!page) notFound();
  const alternateLocale: Locale = locale === "fr" ? "en" : "fr";
  const feedbackSubject = locale === "fr" ? "Mon avis sur Mosaipix" : "My feedback about Mosaipix";
  const structuredData = {
    "@context": "https://schema.org",
    "@type": page.key === "about" ? "AboutPage" : "WebPage",
    name: page.title,
    description: page.description,
    url: `${SITE_URL}/${locale}/${page.slug}`,
    inLanguage: locale,
    isPartOf: { "@id": `${SITE_URL}/#website` },
  };

  return (
    <main className="info-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />
      <nav className="nav shell guide-nav" aria-label={locale === "fr" ? "Navigation principale" : "Main navigation"}>
        <Link className="brand" href={`/${locale}`}><SiteBrand /></Link>
        <div className="nav-links">
          <Link href={`/${locale}#studio`}>Studio</Link>
          <Link href={`/${locale}`}>{locale === "fr" ? "Accueil" : "Home"}</Link>
          <Link href={`/${alternateLocale}/${page.alternateSlug}`} hrefLang={alternateLocale}>{alternateLocale.toUpperCase()}</Link>
        </div>
      </nav>

      <article className="info-article">
        <header className="info-hero shell">
          <nav className="breadcrumbs" aria-label={locale === "fr" ? "Fil d’Ariane" : "Breadcrumb"}>
            <Link href={`/${locale}`}>{locale === "fr" ? "Accueil" : "Home"}</Link><span aria-hidden="true">/</span><span>{page.title}</span>
          </nav>
          <span className="eyebrow">{page.eyebrow}</span>
          <h1>{page.title}</h1>
          <p>{page.intro}</p>
          <small>{locale === "fr" ? "Mis à jour le 26 août 2026" : "Updated August 26, 2026"}</small>
        </header>

        {page.key === "privacy" ? <aside className="privacy-summary shell" aria-label={locale === "fr" ? "Résumé de confidentialité" : "Privacy summary"}>
          <div><span aria-hidden="true">⌂</span><strong>{locale === "fr" ? "Photos locales" : "Local photos"}</strong><p>{locale === "fr" ? "Jamais envoyées" : "Never uploaded"}</p></div>
          <div><span aria-hidden="true">✦</span><strong>{locale === "fr" ? "Prompts IA" : "AI prompts"}</strong><p>{locale === "fr" ? "Texte seulement" : "Text only"}</p></div>
          <div><span aria-hidden="true">◌</span><strong>{locale === "fr" ? "Publicité" : "Advertising"}</strong><p>{locale === "fr" ? "Aucun suivi ciblé" : "No targeted tracking"}</p></div>
        </aside> : null}

        <div className="info-body shell">
          {page.key === "legal" ? <section>
            <h2>{locale === "fr" ? "Éditeur et direction de la publication" : "Publisher and publication director"}</h2>
            {SITE_OWNER.name && SITE_OWNER.email ? <address>
              <strong>{SITE_OWNER.name}</strong>{SITE_OWNER.status ? <> · {SITE_OWNER.status}</> : null}<br />
              {SITE_OWNER.address ? <>{SITE_OWNER.address}<br /></> : null}
              {SITE_OWNER.registration ? <>{SITE_OWNER.registration}<br /></> : null}
              <a href={`mailto:${SITE_OWNER.email}`}>{SITE_OWNER.email}</a>{SITE_OWNER.phone ? <> · {SITE_OWNER.phone}</> : null}
            </address> : <p className="owner-pending">{locale === "fr" ? "Identité et adresse de contact en cours de confirmation avant publication." : "Publisher identity and contact address are being confirmed before publication."}</p>}
          </section> : null}

          {page.sections.map((section) => <section key={section.title}>
            <h2>{section.title}</h2>
            {section.paragraphs?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            {section.bullets ? <ul>{section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul> : null}
          </section>)}

          {page.key === "privacy" ? <section className="source-links">
            <h2>{locale === "fr" ? "Prestataires et autorités" : "Providers and authorities"}</h2>
            <p><a href="https://vercel.com/legal/privacy-notice" target="_blank" rel="noreferrer">Vercel Privacy Notice</a> · <a href="https://vercel.com/docs/analytics/privacy-policy" target="_blank" rel="noreferrer">Vercel Web Analytics</a> · <a href="https://openverse.org/privacy/" target="_blank" rel="noreferrer">Openverse Privacy</a> · <a href="https://www.cnil.fr/" target="_blank" rel="noreferrer">CNIL</a></p>
          </section> : null}

          {page.key === "about" ? <aside className="contact-card">
            <span aria-hidden="true">✦</span>
            <div><h2>{locale === "fr" ? "Fais progresser Mosaipix" : "Help improve Mosaipix"}</h2><p>{locale === "fr" ? "Un message court suffit : ce qui t’a plu, ce qui bloque ou le modèle que tu aimerais trouver." : "A short message is enough: what worked, what got in your way, or which pattern you would like to see."}</p></div>
            {SITE_OWNER.email ? <a className="primary" href={`mailto:${SITE_OWNER.email}?subject=${encodeURIComponent(feedbackSubject)}`}>{locale === "fr" ? "Donner mon avis" : "Share feedback"} <span aria-hidden="true">→</span></a> : null}
          </aside> : null}
        </div>
      </article>

      <SiteFooter locale={locale} />
    </main>
  );
}
