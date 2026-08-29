"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

type AiContentReportSheetProps = {
  locale: "fr" | "en";
  open: boolean;
  prompt: string;
  onClose: () => void;
};

type ReportReason = "unsafe" | "sexual" | "hateful" | "other";

export default function AiContentReportSheet({ locale, open, prompt, onClose }: AiContentReportSheetProps) {
  const [reason, setReason] = useState<ReportReason>("unsafe");
  const [details, setDetails] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const tr = (french: string, english: string) => locale === "fr" ? french : english;

  useEffect(() => {
    if (!open) return;
    setStatus("idle");
    closeButtonRef.current?.focus();
    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose, open]);

  if (!open) return null;

  async function submitReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    try {
      const response = await fetch("/api/report-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, details, prompt, locale }),
      });
      if (!response.ok) throw new Error("report_failed");
      setStatus("sent");
      setDetails("");
    } catch {
      setStatus("error");
    }
  }

  const reasons: Array<[ReportReason, string]> = locale === "fr"
    ? [["unsafe", "Choquant ou dangereux"], ["sexual", "Sexuel ou inapproprié"], ["hateful", "Haineux ou discriminatoire"], ["other", "Autre problème"]]
    : [["unsafe", "Shocking or dangerous"], ["sexual", "Sexual or inappropriate"], ["hateful", "Hateful or discriminatory"], ["other", "Something else"]];

  return (
    <div className="export-sheet-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="export-sheet ai-report-sheet" role="dialog" aria-modal="true" aria-labelledby="ai-report-title">
        <div className="export-sheet-handle" aria-hidden="true" />
        <header>
          <div>
            <span className="eyebrow">{tr("SÉCURITÉ", "SAFETY")}</span>
            <h2 id="ai-report-title">{tr("Signaler cette création IA", "Report this AI creation")}</h2>
          </div>
          <button ref={closeButtonRef} className="export-sheet-close" type="button" aria-label={tr("Fermer", "Close")} onClick={onClose}>×</button>
        </header>

        {status === "sent" ? <div className="ai-report-success" role="status">
          <span aria-hidden="true">✓</span>
          <h3>{tr("Signalement reçu", "Report received")}</h3>
          <p>{tr("Merci. Osali Studio pourra examiner ce résultat et améliorer les protections de Mosaipix.", "Thank you. Osali Studio can review this result and improve Mosaipix safeguards.")}</p>
          <button className="primary compact" type="button" onClick={onClose}>{tr("Fermer", "Close")}</button>
        </div> : <form className="ai-report-form" onSubmit={submitReport}>
          <p>{tr("Indique ce qui ne va pas. Ta demande d’origine sera jointe au signalement, mais aucune photo n’est envoyée.", "Tell us what is wrong. Your original prompt will be included, but no photo is sent.")}</p>
          <fieldset>
            <legend>{tr("Quel est le problème ?", "What is the problem?")}</legend>
            {reasons.map(([value, label]) => <label key={value}><input type="radio" name="ai-report-reason" value={value} checked={reason === value} onChange={() => setReason(value)} /> <span>{label}</span></label>)}
          </fieldset>
          <label className="ai-report-details">{tr("Précision facultative", "Optional details")}<textarea maxLength={500} value={details} onChange={(event) => setDetails(event.target.value)} placeholder={tr("Décris brièvement le problème…", "Briefly describe the issue…")} /></label>
          {status === "error" ? <p className="form-error" role="alert">{tr("Le signalement n’a pas pu être envoyé. Vérifie ta connexion et réessaie.", "The report could not be sent. Check your connection and try again.")}</p> : null}
          <div className="ai-report-actions"><button className="quiet-button" type="button" onClick={onClose}>{tr("Annuler", "Cancel")}</button><button className="primary compact" type="submit" disabled={status === "sending"}>{status === "sending" ? tr("Envoi…", "Sending…") : tr("Envoyer le signalement", "Send report")}</button></div>
        </form>}
      </section>
    </div>
  );
}
