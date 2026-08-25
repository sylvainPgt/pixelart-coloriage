import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteBrand from "@/components/SiteBrand";
import { getGuide, getGuideByKey, getLocalizedGuides, guides } from "@/lib/seo-content";
import { SITE_URL } from "@/lib/site-metadata";
import type { Locale } from "@/lib/templates";

type GuideParams = { locale: string; slug: string };

function parseLocale(value: string): Locale {
  if (value !== "fr" && value !== "en") notFound();
  return value;
}

export function generateStaticParams({ params }: { params: { locale: string } }) {
  return guides.filter((guide) => guide.locale === params.locale).map((guide) => ({ slug: guide.slug }));
}

export async function generateMetadata({ params }: { params: Promise<GuideParams> }): Promise<Metadata> {
  const { locale: localeParam, slug } = await params;
  const locale = parseLocale(localeParam);
  const guide = getGuide(locale, slug);
  if (!guide) notFound();
  const alternate = getGuideByKey(locale === "fr" ? "en" : "fr", guide.key);
  const canonical = `/${locale}/guides/${guide.slug}`;
  return {
    title: { absolute: guide.metaTitle },
    description: guide.description,
    authors: [{ name: "Mosaipix", url: SITE_URL }],
    category: "Pixel art",
    alternates: {
      canonical,
      languages: {
        "fr-FR": locale === "fr" ? canonical : `/fr/guides/${alternate?.slug}`,
        "en-US": locale === "en" ? canonical : `/en/guides/${alternate?.slug}`,
        "x-default": `/en/guides/${getGuideByKey("en", guide.key)?.slug}`,
      },
    },
    openGraph: {
      type: "article",
      url: `${SITE_URL}${canonical}`,
      siteName: "Mosaipix",
      title: guide.metaTitle,
      description: guide.description,
      locale: locale === "fr" ? "fr_FR" : "en_US",
      alternateLocale: locale === "fr" ? ["en_US"] : ["fr_FR"],
      publishedTime: "2026-08-25T00:00:00.000Z",
      modifiedTime: "2026-08-25T00:00:00.000Z",
      authors: ["Mosaipix"],
      images: [{ url: "/og.png", width: 1200, height: 630, alt: guide.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: guide.metaTitle,
      description: guide.description,
      images: ["/og.png"],
    },
  };
}

export default async function GuidePage({ params }: { params: Promise<GuideParams> }) {
  const { locale: localeParam, slug } = await params;
  const locale = parseLocale(localeParam);
  const guide = getGuide(locale, slug);
  if (!guide) notFound();
  const alternate = getGuideByKey(locale === "fr" ? "en" : "fr", guide.key);
  const relatedGuides = getLocalizedGuides(locale).filter((item) => item.key !== guide.key);
  const homeLabel = locale === "fr" ? "Accueil" : "Home";
  const guideLabel = locale === "fr" ? "Guides" : "Guides";
  const canonicalUrl = `${SITE_URL}/${locale}/guides/${guide.slug}`;
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        "@id": `${canonicalUrl}#article`,
        headline: guide.title,
        description: guide.description,
        image: `${SITE_URL}/og.png`,
        datePublished: "2026-08-25",
        dateModified: "2026-08-25",
        inLanguage: locale,
        mainEntityOfPage: canonicalUrl,
        author: { "@type": "Organization", "@id": `${SITE_URL}/#organization`, name: "Mosaipix" },
        publisher: { "@type": "Organization", "@id": `${SITE_URL}/#organization`, name: "Mosaipix", logo: { "@type": "ImageObject", url: `${SITE_URL}/icons/mosaipix-512.png` } },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${canonicalUrl}#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: homeLabel, item: `${SITE_URL}/${locale}` },
          { "@type": "ListItem", position: 2, name: guideLabel, item: `${SITE_URL}/${locale}#guides` },
          { "@type": "ListItem", position: 3, name: guide.title, item: canonicalUrl },
        ],
      },
    ],
  };

  return (
    <main className="guide-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />
      <nav className="nav shell guide-nav" aria-label={locale === "fr" ? "Navigation principale" : "Main navigation"}>
        <Link className="brand" href={`/${locale}`}><SiteBrand /></Link>
        <div className="nav-links">
          <Link href={`/${locale}#studio`}>Studio</Link>
          <Link href={`/${locale}#guides`}>{guideLabel}</Link>
          {alternate ? <Link href={`/${alternate.locale}/guides/${alternate.slug}`} hrefLang={alternate.locale}>{alternate.locale.toUpperCase()}</Link> : null}
        </div>
      </nav>

      <article className="guide-article">
        <header className="guide-hero shell">
          <nav className="breadcrumbs" aria-label={locale === "fr" ? "Fil d’Ariane" : "Breadcrumb"}>
            <Link href={`/${locale}`}>{homeLabel}</Link><span aria-hidden="true">/</span><span>{guideLabel}</span>
          </nav>
          <span className="eyebrow">{guide.eyebrow}</span>
          <h1>{guide.title}</h1>
          <p>{guide.intro}</p>
          <small>{guide.readingTime}</small>
        </header>

        <div className="guide-body shell">
          <div className="guide-sections">
            {guide.sections.map((section) => <section key={section.title}>
              <h2>{section.title}</h2>
              {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              {section.tips ? <ul>{section.tips.map((tip) => <li key={tip}>{tip}</li>)}</ul> : null}
            </section>)}
          </div>

          <aside className="guide-cta" aria-labelledby="guide-cta-title">
            <span aria-hidden="true">▦</span>
            <h2 id="guide-cta-title">{guide.ctaTitle}</h2>
            <p>{guide.ctaText}</p>
            <Link className="primary" href={`/${locale}#studio`}>{guide.ctaLabel} <span aria-hidden="true">→</span></Link>
          </aside>

          <section className="related-guides" aria-labelledby="related-guides-title">
            <span className="eyebrow">{locale === "fr" ? "POUR ALLER PLUS LOIN" : "KEEP EXPLORING"}</span>
            <h2 id="related-guides-title">{locale === "fr" ? "Guides associés" : "Related guides"}</h2>
            <div>
              {relatedGuides.map((item) => <Link key={item.key} href={`/${locale}/guides/${item.slug}`}><strong>{item.title}</strong><span>{locale === "fr" ? "Lire le guide" : "Read the guide"} →</span></Link>)}
            </div>
          </section>
        </div>
      </article>

      <footer><div className="shell"><Link className="brand" href={`/${locale}`}><SiteBrand /></Link><p>{locale === "fr" ? "Crée, colorie et imprime ton pixel art." : "Create, color and print your pixel art."}</p><span>© 2026 Mosaipix</span></div></footer>
    </main>
  );
}
