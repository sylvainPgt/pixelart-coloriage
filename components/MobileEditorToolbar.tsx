type EditorTool = "pencil" | "eraser" | "picker" | "fill";

type MobileEditorToolbarProps = {
  locale: "fr" | "en";
  tool: EditorTool;
  palette: string[];
  selected: number;
  progress: number;
  undoDisabled: boolean;
  redoDisabled: boolean;
  downloadLabel: string;
  onTool: (tool: EditorTool) => void;
  onColor: (index: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  onDownload: () => void;
};

export default function MobileEditorToolbar({
  locale,
  tool,
  palette,
  selected,
  progress,
  undoDisabled,
  redoDisabled,
  downloadLabel,
  onTool,
  onColor,
  onUndo,
  onRedo,
  onDownload,
}: MobileEditorToolbarProps) {
  const tr = (french: string, english: string) => locale === "fr" ? french : english;

  return (
    <div className="mobile-editor-bar" aria-label={tr("Outils rapides", "Quick tools")}>
      <div className="mobile-tool-row">
        <button className={tool === "pencil" ? "active" : ""} aria-label={tr("Crayon", "Pencil")} aria-pressed={tool === "pencil"} onClick={() => onTool("pencil")}><span aria-hidden="true">✎</span></button>
        <button className={tool === "eraser" ? "active" : ""} aria-label={tr("Gomme", "Eraser")} aria-pressed={tool === "eraser"} onClick={() => onTool("eraser")}><span aria-hidden="true">◇</span></button>
        <button className={tool === "fill" ? "active" : ""} aria-label={tr("Remplir une zone", "Fill an area")} aria-pressed={tool === "fill"} onClick={() => onTool("fill")}><span aria-hidden="true">▰</span></button>
        <button aria-label={tr("Annuler", "Undo")} disabled={undoDisabled} onClick={onUndo}><span aria-hidden="true">↶</span></button>
        <button aria-label={tr("Rétablir", "Redo")} disabled={redoDisabled} onClick={onRedo}><span aria-hidden="true">↷</span></button>
        <button aria-label={downloadLabel} onClick={onDownload}><span aria-hidden="true">↓</span></button>
        <span className="mobile-progress" aria-label={`${tr("Progression", "Progress")} ${progress}%`}>{progress}%</span>
      </div>
      <div className="mobile-palette" role="group" aria-label={tr("Palette de couleurs", "Color palette")}>
        {palette.map((color, index) => <button key={`mobile-${index}-${color}`} className={selected === index ? "selected" : ""} style={{ background: color }} aria-label={`${tr("Couleur", "Color")} ${index + 1}`} aria-pressed={selected === index} onClick={() => onColor(index)}>{index + 1}</button>)}
      </div>
    </div>
  );
}
