import Link from "next/link";
import PixelMiniature from "@/components/PixelMiniature";
import SiteBrand from "@/components/SiteBrand";
import SiteFooter from "@/components/SiteFooter";
import { guideCards, homeFacts, homeFaqs } from "@/lib/home-content";
import { heroTemplate, type Locale } from "@/lib/templates";

export default function LandingPage({ locale }: { locale: Locale }) {
  const isFrench = locale === "fr";
  const tr = (french: string, english: string) => isFrench ? french : english;
  const localizedGuides = guideCards[locale];
  const studioHref = `/${locale}/studio`;

  return (
    <main>
      <a className="skip-link" href={studioHref}>{tr("Ouvrir le studio", "Open the studio")}</a>
      <nav className="nav shell" aria-label={tr("Navigation principale", "Main navigation")}>
        <a className="brand" href="#top"><SiteBrand /></a>
        <div className="nav-links">
          <Link href={studioHref}>Studio</Link>
          <a href="#how">{tr("Comment ça marche", "How it works")}</a>
          <a href="#faq">FAQ</a>
          <span className="badge">{tr("Gratuit · Sans compte", "Free · No account")}</span>
          <div className="language-switch" role="group" aria-label={tr("Langue", "Language")}>
            <Link href="/fr" hrefLang="fr" className={isFrench ? "active" : ""} aria-current={isFrench ? "page" : undefined}>FR</Link>
            <Link href="/en" hrefLang="en" className={!isFrench ? "active" : ""} aria-current={!isFrench ? "page" : undefined}>EN</Link>
          </div>
        </div>
      </nav>

      <section className="hero shell" id="top">
        <div className="hero-copy">
          <span className="eyebrow">✦ {tr("TON STUDIO DE PIXEL ART", "YOUR PIXEL ART STUDIO")}</span>
          <h1>{tr("Transforme.", "Transform.")}<br/><em>{tr("Pixelise.", "Pixelate.")}</em> {tr("Crée.", "Create.")}</h1>
          <p>{tr("Décris une idée ou choisis une photo. Mosaipix la transforme en véritable pixel art, prêt à colorier et à personnaliser.", "Describe an idea or choose a photo. Mosaipix turns it into real pixel art that you can color and customize.")}</p>
          <Link className="primary" href={studioHref}>{tr("Ouvrir le studio", "Open the studio")} <span>→</span></Link>
          <small>{tr("✓ Aucun envoi de photo   ✓ Projet sauvegardé localement", "✓ Photos stay private   ✓ Project saved locally")}</small>
        </div>
        <div className="hero-art">
          <PixelMiniature project={heroTemplate.project} className="hero-pixel-grid" label={tr("Fusée composée de véritables pixels colorés", "Rocket made from real colored pixels")} />
          <div className="pixel-badge badge-top"><b>16 × 16</b><span>{tr("grille réelle", "real grid")}</span></div>
          <div className="pixel-badge badge-bottom"><b>{heroTemplate.project.palette.length} {tr("couleurs", "colors")}</b><span>{tr("palette maîtrisée", "curated palette")}</span></div>
        </div>
      </section>

      <section className="landing-studio-cta">
        <div className="shell landing-studio-card">
          <div><span className="eyebrow">{tr("LE STUDIO PIXEL ART", "THE PIXEL ART STUDIO")}</span><h2>{tr("Une création, cinq étapes simples", "One creation, five simple steps")}</h2><p>{tr("Choisis une source, cadre ton image, règle la grille, colorie et exporte. Le studio occupe tout l’écran pour rester confortable sur mobile.", "Choose a source, crop your image, adjust the grid, color and export. The studio uses the full screen to stay comfortable on mobile.")}</p></div>
          <Link className="primary" href={studioHref}>{tr("Commencer une création", "Start creating")} <span>→</span></Link>
        </div>
      </section>

      <section className="seo-copy shell" aria-labelledby="seo-copy-title">
        <span className="eyebrow">{tr("PIXEL ART À COLORIER", "PIXEL ART COLORING")}</span>
        <h2 id="seo-copy-title">{tr("Crée, colorie et imprime ton pixel art", "Create, color and print your pixel art")}</h2>
        <div>
          <p>{tr("Mosaipix transforme gratuitement une photo, une idée ou l’un de ses 24 modèles en grille de pixel art numérotée. Choisis le niveau de détail et le nombre de couleurs, puis colorie directement dans ton navigateur.", "Mosaipix turns a photo, an idea or one of 24 patterns into a numbered pixel art grid for free. Choose the level of detail and number of colors, then color directly in your browser.")}</p>
          <p>{tr("Tu peux télécharger le résultat ou imprimer une grille vierge avec sa légende. Tes photos et tes projets restent sur ton appareil, et les modèles continuent de fonctionner hors connexion.", "Download the result or print a blank grid with its color key. Your photos and projects stay on your device, and the pattern library keeps working offline.")}</p>
        </div>
        <dl className="product-facts" aria-label={tr("Mosaipix en chiffres", "Mosaipix facts")}>
          {homeFacts[locale].map((fact) => <div key={fact.label}><dt>{fact.value}</dt><dd>{fact.label}</dd></div>)}
        </dl>
      </section>

      <section className="guide-library shell" id="guides" aria-labelledby="guide-library-title">
        <div className="section-heading"><span className="eyebrow">{tr("CONSEILS PRATIQUES", "PRACTICAL GUIDES")}</span><h2 id="guide-library-title">{tr("Réussis ton pixel art du premier coup", "Get your pixel art right the first time")}</h2><p>{tr("Des réponses précises basées sur les vrais réglages du studio.", "Clear answers based on the studio’s actual controls.")}</p></div>
        <div className="guide-cards">
          {localizedGuides.map((guide, index) => <article key={guide.key}><span>0{index + 1}</span><h3>{guide.title}</h3><p>{guide.description}</p><Link href={`/${locale}/guides/${guide.slug}`}>{tr("Lire le guide", "Read the guide")} <span aria-hidden="true">→</span></Link></article>)}
        </div>
      </section>

      <section className="faq-section shell" id="faq" aria-labelledby="faq-title">
        <div className="section-heading"><span className="eyebrow">{tr("QUESTIONS FRÉQUENTES", "FREQUENTLY ASKED QUESTIONS")}</span><h2 id="faq-title">{tr("Ce qu’il faut savoir sur Mosaipix", "What to know about Mosaipix")}</h2></div>
        <div className="faq-list">
          {homeFaqs[locale].map((item, index) => <details key={item.question} open={index === 0}><summary>{item.question}</summary><p>{item.answer}</p></details>)}
        </div>
      </section>

      <section className="how shell" id="how"><div className="section-heading"><span className="eyebrow">{tr("AUSSI SIMPLE QUE ÇA", "IT'S THAT SIMPLE")}</span><h2>{tr("Imagine, crée, colorie", "Imagine, create, color")}</h2></div><div className="steps"><article><div className="step-visual"><span className="step-number">01</span><i>✦</i></div><h3>{tr("Imagine", "Imagine")}</h3><p>{tr("Décris une idée, choisis une photo ou pars d’un modèle.", "Describe an idea, choose a photo, or start from a template.")}</p></article><article><div className="step-visual"><span className="step-number">02</span><i>▦</i></div><h3>{tr("Découvre", "Discover")}</h3><p>{tr("Mosaipix prépare automatiquement une grille pixel art et une palette claires.", "Mosaipix automatically builds a clear pixel-art grid and palette.")}</p></article><article><div className="step-visual"><span className="step-number">03</span><i>✎</i></div><h3>{tr("Colorie", "Color")}</h3><p>{tr("Suis les numéros, personnalise les couleurs et garde ta création.", "Follow the numbers, customize the colors, and save your creation.")}</p></article></div></section>
      <SiteFooter locale={locale} />
    </main>
  );
}
