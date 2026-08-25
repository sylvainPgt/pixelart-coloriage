"use client";

import { useState } from "react";
import PixelMiniature from "@/components/PixelMiniature";
import {
  type Locale,
  type TemplateCategory,
  templateCatalog,
  templateCategoryLabels,
  type TemplateDefinition,
} from "@/lib/templates";

type LibraryFilter = "featured" | TemplateCategory;

type TemplateLibraryProps = {
  locale: Locale;
  activeProjectName?: string;
  onSelect: (template: TemplateDefinition) => void;
};

const filters: LibraryFilter[] = ["featured", "animals", "nature", "space", "treats", "objects"];

export default function TemplateLibrary({ locale, activeProjectName, onSelect }: TemplateLibraryProps) {
  const [filter, setFilter] = useState<LibraryFilter>("featured");
  const isFrench = locale === "fr";
  const visibleTemplates = filter === "featured"
    ? templateCatalog.filter((item) => item.featured)
    : templateCatalog.filter((item) => item.category === filter);

  function selectRandomTemplate() {
    const alternatives = templateCatalog.filter((item) => item.project.name !== activeProjectName);
    const selection = alternatives[Math.floor(Math.random() * alternatives.length)] ?? templateCatalog[0];
    onSelect(selection);
  }

  return (
    <section className="template-library" aria-labelledby="template-library-title">
      <header className="template-library-header">
        <div>
          <span className="eyebrow">{templateCatalog.length} {isFrench ? "MODÈLES HORS LIGNE" : "OFFLINE PATTERNS"}</span>
          <h3 id="template-library-title">{isFrench ? "Choisis ton prochain pixel art" : "Choose your next pixel art"}</h3>
          <p>{isFrench ? "Des motifs simples, reconnaissables et prêts à colorier ou à imprimer." : "Simple, recognizable patterns ready to color or print."}</p>
        </div>
        <button className="template-surprise" onClick={selectRandomTemplate}>✦ {isFrench ? "Surprends-moi" : "Surprise me"}</button>
      </header>

      <div className="template-filters" role="group" aria-label={isFrench ? "Catégories de modèles" : "Pattern categories"}>
        {filters.map((category) => {
          const count = category === "featured"
            ? templateCatalog.filter((item) => item.featured).length
            : templateCatalog.filter((item) => item.category === category).length;
          return <button key={category} className={filter === category ? "active" : ""} aria-pressed={filter === category} onClick={() => setFilter(category)}>{templateCategoryLabels[category][locale]} <span>{count}</span></button>;
        })}
      </div>

      <div className="template-list">
        {visibleTemplates.map((item) => (
          <button key={item.id} className={activeProjectName === item.project.name ? "template active" : "template"} aria-pressed={activeProjectName === item.project.name} onClick={() => onSelect(item)} aria-label={`${item.name[locale]}, ${item.project.width} × ${item.project.height}`}>
            <PixelMiniature project={item.project} className="template-preview" />
            <span><b>{item.name[locale]}</b><small>{item.description[locale]}</small><em>{item.project.width} × {item.project.height} · {item.project.palette.length} {isFrench ? "couleurs" : "colors"}</em></span>
          </button>
        ))}
      </div>
    </section>
  );
}
