"use client";

import { useEffect } from "react";

type ExportSheetProps = {
  locale: "fr" | "en";
  open: boolean;
  projectName: string;
  saveState: "saving" | "saved";
  hasPainting: boolean;
  onClose: () => void;
  onSaveCurrent: () => void;
  onSavePrintable: () => void;
  onPrint: () => void;
  onSaveComplete: () => void;
};

export default function ExportSheet({
  locale,
  open,
  projectName,
  saveState,
  hasPainting,
  onClose,
  onSaveCurrent,
  onSavePrintable,
  onPrint,
  onSaveComplete,
}: ExportSheetProps) {
  const tr = (french: string, english: string) => locale === "fr" ? french : english;

  useEffect(() => {
    if (!open) return;
    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose, open]);

  if (!open) return null;

  const run = (action: () => void) => {
    onClose();
    action();
  };

  return (
    <div className="export-sheet-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="export-sheet" role="dialog" aria-modal="true" aria-labelledby="export-sheet-title">
        <div className="export-sheet-handle" aria-hidden="true" />
        <header>
          <div>
            <span className="eyebrow">{tr("GARDER TA CRÉATION", "KEEP YOUR CREATION")}</span>
            <h2 id="export-sheet-title">{tr("Exporter", "Export")} · {projectName}</h2>
          </div>
          <button className="export-sheet-close" type="button" aria-label={tr("Fermer", "Close")} onClick={onClose}>×</button>
        </header>

        <p className={`autosave-status ${saveState}`} aria-live="polite">
          <span aria-hidden="true">{saveState === "saved" ? "✓" : "•••"}</span>
          {saveState === "saved"
            ? tr("Projet sauvegardé automatiquement sur cet appareil", "Project automatically saved on this device")
            : tr("Sauvegarde en cours…", "Saving…")}
        </p>

        <div className="export-sheet-actions">
          <button className="primary-export" type="button" onClick={() => run(onSaveCurrent)}>
            <span aria-hidden="true">↗</span>
            <b>{hasPainting ? tr("Enregistrer mon coloriage", "Save my coloring") : tr("Enregistrer le modèle", "Save the pattern")}</b>
            <small>{tr("PNG dans Fichiers, Photos ou une autre application", "PNG to Files, Photos, or another app")}</small>
          </button>
          <button type="button" onClick={() => run(onSavePrintable)}>
            <span aria-hidden="true">▦</span>
            <b>{tr("Grille vierge numérotée", "Blank numbered grid")}</b>
            <small>{tr("Mise en page A4 avec la légende", "A4 layout with color key")}</small>
          </button>
          <button type="button" onClick={() => run(onPrint)}>
            <span aria-hidden="true">▣</span>
            <b>{tr("Imprimer ou partager", "Print or share")}</b>
            <small>{tr("Ouvre les options disponibles sur cet appareil", "Opens the options available on this device")}</small>
          </button>
          <button type="button" onClick={() => run(onSaveComplete)}>
            <span aria-hidden="true">✦</span>
            <b>{tr("Modèle terminé", "Completed pattern")}</b>
            <small>{tr("Référence entièrement coloriée", "Fully colored reference")}</small>
          </button>
        </div>
      </section>
    </div>
  );
}
