"use client";

import {
  type ChangeEvent,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import PixelMiniature from "@/components/PixelMiniature";
import { type PixelProject, type Rgb, quantizePixels } from "@/lib/pixel-art";

type Mode = "templates" | "image" | "text";
type Tool = "pencil" | "eraser" | "picker" | "fill";
type CropMode = "cover" | "contain";
type PaintLayer = Array<number | null>;
type ImageSettings = {
  width: number;
  height: number;
  paletteSize: number;
  cropMode: CropMode;
  focusX: number;
  focusY: number;
  brightness: number;
  contrast: number;
  saturation: number;
  background: string;
  dither: boolean;
};

const STORAGE_KEY = "pixelia-project-v2";
const MODE_OPTIONS: Array<[Mode, string]> = [
  ["templates", "▦ Modèles"],
  ["image", "↑ Une image"],
  ["text", "✦ Motif guidé"],
];
const IMAGE_ADJUSTMENTS: Array<["brightness" | "contrast" | "saturation", string]> = [
  ["brightness", "Luminosité"],
  ["contrast", "Contraste"],
  ["saturation", "Saturation"],
];
const TOOL_OPTIONS: Array<[Tool, string, string]> = [
  ["pencil", "✎", "Crayon"],
  ["eraser", "◇", "Gomme"],
  ["picker", "⌾", "Pipette"],
  ["fill", "▰", "Remplir"],
];
const COLOR_SETS = {
  cream: "#fffaf0",
  ink: "#18172d",
  pink: "#ff5c8a",
  coral: "#ff875c",
  gold: "#ffd25c",
  green: "#61d889",
  blue: "#55c7f3",
  purple: "#7868e6",
};

const DEFAULT_IMAGE_SETTINGS: ImageSettings = {
  width: 20,
  height: 20,
  paletteSize: 8,
  cropMode: "cover",
  focusX: 50,
  focusY: 50,
  brightness: 100,
  contrast: 108,
  saturation: 110,
  background: "#ffffff",
  dither: false,
};

function makeProject(
  name: string,
  width: number,
  height: number,
  colorAt: (x: number, y: number) => string,
): PixelProject {
  const colors = Array.from({ length: width * height }, (_, index) =>
    colorAt(index % width, Math.floor(index / width)),
  );
  const palette = [...new Set(colors)];
  const paletteMap = new Map(palette.map((color, index) => [color, index]));
  return {
    version: 2,
    name,
    width,
    height,
    palette,
    targets: colors.map((color) => paletteMap.get(color) ?? 0),
  };
}

const rocketProject = makeProject("Fusée cosmique", 16, 16, (x, y) => {
  const center = Math.abs(x - 7.5);
  if (y <= 2 && center < y / 2 + 0.6) return COLOR_SETS.gold;
  if (y > 2 && y < 11 && center < 3.1) {
    if (y < 5) return COLOR_SETS.coral;
    if (y === 6 && center < 1.2) return COLOR_SETS.blue;
    return center > 2.1 ? COLOR_SETS.pink : COLOR_SETS.cream;
  }
  if (y >= 8 && y < 12 && center >= 3 && center < 5 - (y - 8) * 0.45) return COLOR_SETS.purple;
  if (y >= 11 && y < 15 && center < Math.max(0.7, 2.4 - (y - 11) * 0.45)) {
    return y < 13 ? COLOR_SETS.gold : COLOR_SETS.coral;
  }
  if ((x + y * 3) % 19 === 0) return COLOR_SETS.blue;
  return COLOR_SETS.ink;
});

const flowerProject = makeProject("Fleur solaire", 14, 14, (x, y) => {
  const dx = x - 6.5;
  const dy = y - 6;
  const distance = Math.hypot(dx, dy);
  if (distance < 2.1) return COLOR_SETS.gold;
  if (distance < 4.4 && Math.cos(Math.atan2(dy, dx) * 6) > -0.12) return COLOR_SETS.pink;
  if (y > 8 && Math.abs(x - 6.5) < 1.2) return COLOR_SETS.green;
  if (y > 10 && ((x > 3 && x < 7) || (x > 7 && x < 11))) return COLOR_SETS.green;
  return COLOR_SETS.cream;
});

const landscapeProject = makeProject("Lac au crépuscule", 18, 12, (x, y) => {
  if (y < 4) return y < 2 ? COLOR_SETS.purple : COLOR_SETS.pink;
  if (y === 4 && x > 11 && x < 15) return COLOR_SETS.gold;
  if (y < 7) return Math.abs(x - 8) < y - 2 ? COLOR_SETS.ink : COLOR_SETS.coral;
  if (y < 10) return (x + y) % 3 === 0 ? COLOR_SETS.blue : COLOR_SETS.purple;
  return COLOR_SETS.ink;
});

const templates = [rocketProject, flowerProject, landscapeProject];

function textProject(prompt: string, width: number, height: number): PixelProject {
  const normalized = prompt.toLocaleLowerCase("fr");
  if (normalized.match(/fus[ée]e|espace|robot|alien/)) {
    return makeProject(prompt, width, height, (x, y) => {
      const sourceX = Math.min(15, Math.floor((x + 0.5) / width * 16));
      const sourceY = Math.min(15, Math.floor((y + 0.5) / height * 16));
      return rocketProject.palette[rocketProject.targets[sourceY * 16 + sourceX]];
    });
  }
  if (normalized.match(/fleur|soleil|jardin/)) {
    return makeProject(prompt, width, height, (x, y) => {
      const sourceX = Math.min(13, Math.floor((x + 0.5) / width * 14));
      const sourceY = Math.min(13, Math.floor((y + 0.5) / height * 14));
      return flowerProject.palette[flowerProject.targets[sourceY * 14 + sourceX]];
    });
  }

  let seed = [...prompt].reduce((sum, character) => (sum * 33 + character.charCodeAt(0)) >>> 0, 5381);
  const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  const colors = [COLOR_SETS.ink, COLOR_SETS.purple, COLOR_SETS.blue, COLOR_SETS.pink, COLOR_SETS.gold];
  return makeProject(prompt || "Motif surprise", width, height, (x, y) => {
    const mirrorX = Math.min(x, width - 1 - x);
    const wave = Math.sin(mirrorX * 0.85 + y * 0.52 + random() * 0.35);
    return colors[Math.abs(Math.floor((wave + 1) * 2.25 + y / 4)) % colors.length];
  });
}

function floodFill(layer: PaintLayer, start: number, replacement: number | null, width: number, height: number) {
  const source = layer[start];
  if (source === replacement) return layer;
  const next = [...layer];
  const pending = [start];
  const visited = new Set<number>();

  while (pending.length > 0) {
    const index = pending.pop();
    if (index === undefined || visited.has(index) || next[index] !== source) continue;
    visited.add(index);
    next[index] = replacement;
    const x = index % width;
    const y = Math.floor(index / width);
    if (x > 0) pending.push(index - 1);
    if (x + 1 < width) pending.push(index + 1);
    if (y > 0) pending.push(index - width);
    if (y + 1 < height) pending.push(index + width);
  }
  return next;
}

function validateSavedProject(value: unknown): value is { project: PixelProject; painted: PaintLayer } {
  if (!value || typeof value !== "object") return false;
  const candidate = value as { project?: PixelProject; painted?: PaintLayer };
  const project = candidate.project;
  const hasValidDimensions = Boolean(
    project
    && project.version === 2
    && Number.isInteger(project.width) && project.width >= 8 && project.width <= 64
    && Number.isInteger(project.height) && project.height >= 8 && project.height <= 64
    && Array.isArray(project.palette)
    && project.palette.length >= 1 && project.palette.length <= 20
    && Array.isArray(project.targets)
    && Array.isArray(candidate.painted)
    && project.targets.length === project.width * project.height
    && candidate.painted.length === project.targets.length,
  );
  if (!hasValidDimensions || !project || !candidate.painted) return false;
  const validPalette = project.palette.every((color) => typeof color === "string" && /^#[0-9a-f]{6}$/i.test(color));
  const validTargets = project.targets.every((target) => Number.isInteger(target) && target >= 0 && target < project.palette.length);
  const validPaint = candidate.painted.every((color) => color === null || (Number.isInteger(color) && color >= 0 && color < project.palette.length));
  return validPalette && validTargets && validPaint;
}

function loadBrowserImage(dataUrl: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Impossible de lire cette image."));
    image.src = dataUrl;
  });
}

export default function PixelStudio() {
  const [mode, setMode] = useState<Mode>("templates");
  const [project, setProject] = useState<PixelProject>(rocketProject);
  const [painted, setPainted] = useState<PaintLayer>(() => Array(rocketProject.targets.length).fill(null));
  const [selected, setSelected] = useState(1);
  const [tool, setTool] = useState<Tool>("pencil");
  const [prompt, setPrompt] = useState("");
  const [imageSettings, setImageSettings] = useState<ImageSettings>(DEFAULT_IMAGE_SETTINGS);
  const [sourceDataUrl, setSourceDataUrl] = useState<string | null>(null);
  const [sourceName, setSourceName] = useState("image");
  const [processing, setProcessing] = useState(false);
  const [imageError, setImageError] = useState("");
  const [undoStack, setUndoStack] = useState<PaintLayer[]>([]);
  const [redoStack, setRedoStack] = useState<PaintLayer[]>([]);
  const [referenceOpacity, setReferenceOpacity] = useState(55);
  const [showGrid, setShowGrid] = useState(true);
  const [showNumbers, setShowNumbers] = useState(true);
  const [zoom, setZoom] = useState(100);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [resetPending, setResetPending] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const drawingRef = useRef(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data: unknown = JSON.parse(saved);
        if (validateSavedProject(data)) {
          setProject(data.project);
          setPainted(data.painted);
          setSelected(Math.min(1, data.project.palette.length - 1));
          setImageSettings((current) => ({
            ...current,
            width: data.project.width,
            height: data.project.height,
            paletteSize: data.project.palette.length,
          }));
        }
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const timeout = window.setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ project, painted }));
      } catch {
        // A full localStorage should never interrupt drawing.
      }
    }, 450);
    return () => window.clearTimeout(timeout);
  }, [hydrated, painted, project]);

  const filled = painted.reduce<number>((total, value) => total + (value === null ? 0 : 1), 0);
  const correct = painted.reduce<number>((total, value, index) => total + (value === project.targets[index] ? 1 : 0), 0);
  const progress = correct === 0 ? 0 : Math.max(1, Math.round(correct / project.targets.length * 100));
  const cellSize = Math.max(24, Math.round(32 * zoom / 100));
  const cursorCoordinates = hoveredIndex === null
    ? "Survole une case"
    : `Colonne ${hoveredIndex % project.width + 1}, ligne ${Math.floor(hoveredIndex / project.width) + 1}`;

  function clearHistory() {
    setUndoStack([]);
    setRedoStack([]);
  }

  function loadProject(next: PixelProject) {
    setProject(next);
    setPainted(Array(next.targets.length).fill(null));
    setSelected(Math.min(1, next.palette.length - 1));
    setImageSettings((current) => ({
      ...current,
      width: next.width,
      height: next.height,
      paletteSize: next.palette.length,
    }));
    clearHistory();
    setResetPending(false);
  }

  function snapshot(layer = painted) {
    setUndoStack((current) => [...current.slice(-39), [...layer]]);
    setRedoStack([]);
  }

  function paintCell(index: number) {
    const replacement = tool === "eraser" ? null : selected;
    setPainted((current) => {
      if (current[index] === replacement) return current;
      const next = [...current];
      next[index] = replacement;
      return next;
    });
  }

  function handlePointerDown(event: PointerEvent<HTMLButtonElement>, index: number) {
    event.preventDefault();
    if (tool === "picker") {
      setSelected(painted[index] ?? project.targets[index]);
      setTool("pencil");
      return;
    }
    snapshot();
    if (tool === "fill") {
      setPainted((current) => floodFill(current, index, selected, project.width, project.height));
      return;
    }
    drawingRef.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    paintCell(index);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!drawingRef.current || (tool !== "pencil" && tool !== "eraser")) return;
    const element = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-index]");
    const index = Number(element?.dataset.index);
    if (!Number.isNaN(index)) paintCell(index);
  }

  function undo() {
    const previous = undoStack.at(-1);
    if (!previous) return;
    setRedoStack((current) => [...current.slice(-39), painted]);
    setPainted(previous);
    setUndoStack((current) => current.slice(0, -1));
  }

  function redo() {
    const next = redoStack.at(-1);
    if (!next) return;
    setUndoStack((current) => [...current.slice(-39), painted]);
    setPainted(next);
    setRedoStack((current) => current.slice(0, -1));
  }

  function requestReset() {
    if (!resetPending) {
      setResetPending(true);
      return;
    }
    snapshot();
    setPainted(Array(project.targets.length).fill(null));
    setResetPending(false);
  }

  function updateImageSetting<Key extends keyof ImageSettings>(key: Key, value: ImageSettings[Key]) {
    setImageSettings((current) => ({ ...current, [key]: value }));
  }

  async function generateFromImage(dataUrl: string, name: string, settings = imageSettings) {
    setProcessing(true);
    setImageError("");
    try {
      const image = await loadBrowserImage(dataUrl);
      const canvas = document.createElement("canvas");
      canvas.width = settings.width;
      canvas.height = settings.height;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) throw new Error("Le navigateur ne permet pas de préparer l’image.");

      context.fillStyle = settings.background;
      context.fillRect(0, 0, settings.width, settings.height);
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.filter = `brightness(${settings.brightness}%) contrast(${settings.contrast}%) saturate(${settings.saturation}%)`;

      const sourceRatio = image.width / image.height;
      const targetRatio = settings.width / settings.height;
      if (settings.cropMode === "cover") {
        let sourceWidth = image.width;
        let sourceHeight = image.height;
        if (sourceRatio > targetRatio) sourceWidth = image.height * targetRatio;
        else sourceHeight = image.width / targetRatio;
        const sourceX = (image.width - sourceWidth) * settings.focusX / 100;
        const sourceY = (image.height - sourceHeight) * settings.focusY / 100;
        context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, settings.width, settings.height);
      } else {
        const scale = Math.min(settings.width / image.width, settings.height / image.height);
        const drawWidth = image.width * scale;
        const drawHeight = image.height * scale;
        context.drawImage(
          image,
          (settings.width - drawWidth) / 2,
          (settings.height - drawHeight) / 2,
          drawWidth,
          drawHeight,
        );
      }
      context.filter = "none";

      const data = context.getImageData(0, 0, settings.width, settings.height).data;
      const pixels: Rgb[] = Array.from({ length: settings.width * settings.height }, (_, index) => [
        data[index * 4],
        data[index * 4 + 1],
        data[index * 4 + 2],
      ]);
      const quantized = quantizePixels(pixels, settings.width, settings.paletteSize, settings.dither);
      loadProject({
        version: 2,
        name,
        width: settings.width,
        height: settings.height,
        palette: quantized.palette,
        targets: quantized.indices,
      });
    } catch (error) {
      setImageError(error instanceof Error ? error.message : "La génération a échoué.");
    } finally {
      setProcessing(false);
    }
  }

  function importImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onerror = () => setImageError("Impossible de lire ce fichier.");
    reader.onload = () => {
      if (typeof reader.result !== "string") return;
      const cleanName = file.name.replace(/\.[^.]+$/, "") || "image";
      setSourceDataUrl(reader.result);
      setSourceName(cleanName);
      void generateFromImage(reader.result, cleanName);
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  }

  function changePaletteColor(color: string) {
    setProject((current) => ({
      ...current,
      palette: current.palette.map((entry, index) => index === selected ? color : entry),
    }));
  }

  function exportPng(exportMode: "current" | "complete" | "printable") {
    const cell = exportMode === "printable" ? 46 : 32;
    const legendHeight = exportMode === "printable" ? Math.ceil(project.palette.length / 4) * 42 + 48 : 0;
    const canvas = document.createElement("canvas");
    canvas.width = project.width * cell;
    canvas.height = project.height * cell + legendHeight;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);

    project.targets.forEach((target, index) => {
      const x = (index % project.width) * cell;
      const y = Math.floor(index / project.width) * cell;
      const paintedIndex = painted[index];
      if (exportMode === "complete") context.fillStyle = project.palette[target];
      else if (exportMode === "current") context.fillStyle = paintedIndex === null ? "#ffffff" : project.palette[paintedIndex];
      else context.fillStyle = "#ffffff";
      context.fillRect(x, y, cell, cell);

      if (exportMode === "printable") {
        context.strokeStyle = "#9a97a4";
        context.strokeRect(x, y, cell, cell);
        context.fillStyle = "#2d2b3f";
        context.font = "600 15px sans-serif";
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillText(String(target + 1), x + cell / 2, y + cell / 2);
      }
    });

    if (exportMode === "printable") {
      const top = project.height * cell + 28;
      project.palette.forEach((color, index) => {
        const column = index % 4;
        const row = Math.floor(index / 4);
        const x = 18 + column * (canvas.width - 36) / 4;
        const y = top + row * 42;
        context.fillStyle = color;
        context.fillRect(x, y, 24, 24);
        context.strokeStyle = "#4b485a";
        context.strokeRect(x, y, 24, 24);
        context.fillStyle = "#2d2b3f";
        context.font = "600 14px sans-serif";
        context.textAlign = "left";
        context.fillText(String(index + 1), x + 31, y + 13);
      });
    }

    const link = document.createElement("a");
    link.download = `${project.name || "pixelia"}-${exportMode}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  function fitGrid() {
    const longestSide = Math.max(project.width, project.height);
    setZoom(Math.max(50, Math.min(150, Math.floor(560 / (longestSide * 32) * 100))));
  }

  function handleModeKeys(event: KeyboardEvent<HTMLDivElement>) {
    if (!event.key.match(/ArrowLeft|ArrowRight|Home|End/)) return;
    event.preventDefault();
    const order: Mode[] = ["templates", "image", "text"];
    let nextIndex = order.indexOf(mode);
    if (event.key === "ArrowRight") nextIndex = (nextIndex + 1) % order.length;
    if (event.key === "ArrowLeft") nextIndex = (nextIndex - 1 + order.length) % order.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = order.length - 1;
    const nextMode = order[nextIndex];
    setMode(nextMode);
    window.requestAnimationFrame(() => document.getElementById(`mode-${nextMode}`)?.focus());
  }

  const gridStyle = {
    "--grid-columns": project.width,
    "--cell-size": `${cellSize}px`,
    "--reference-opacity": referenceOpacity / 100,
  } as CSSProperties;

  return (
    <main onPointerUp={() => { drawingRef.current = false; }} onPointerLeave={() => { drawingRef.current = false; }}>
      <nav className="nav shell" aria-label="Navigation principale">
        <a className="brand" href="#top"><span className="brand-mark">P</span> Pixelia</a>
        <div className="nav-links"><a href="#studio">Studio</a><a href="#how">Comment ça marche</a><span className="badge">Gratuit · Privé · Local</span></div>
      </nav>

      <section className="hero shell" id="top">
        <div className="hero-copy">
          <span className="eyebrow">✦ Ton image, vraiment pixelisée</span>
          <h1>Transforme.<br/><em>Pixelise.</em> Crée.</h1>
          <p>Choisis la grille, le cadrage et la palette. Pixelia fabrique un modèle net que tu peux corriger, colorier et exporter.</p>
          <a className="primary" href="#studio">Ouvrir le studio <span>→</span></a>
          <small>✓ Aucun envoi de photo &nbsp; ✓ Projet sauvegardé localement</small>
        </div>
        <div className="hero-art">
          <PixelMiniature project={rocketProject} className="hero-pixel-grid" label="Fusée composée de véritables pixels colorés" />
          <div className="pixel-badge badge-top"><b>16 × 16</b><span>grille réelle</span></div>
          <div className="pixel-badge badge-bottom"><b>{rocketProject.palette.length} couleurs</b><span>palette maîtrisée</span></div>
        </div>
      </section>

      <section className="studio-section" id="studio"><div className="shell">
        <div className="section-heading"><span className="eyebrow">LE STUDIO</span><h2>Du contrôle, pixel par pixel</h2><p>Pars d’un modèle, d’une image ou d’un motif guidé. Tous les réglages restent modifiables.</p></div>

        <div className="mode-tabs" role="tablist" aria-label="Point de départ" onKeyDown={handleModeKeys}>
          {MODE_OPTIONS.map(([value, label]) => (
            <button key={value} id={`mode-${value}`} role="tab" aria-selected={mode === value} aria-controls={`panel-${value}`} tabIndex={mode === value ? 0 : -1} className={mode === value ? "active" : ""} onClick={() => setMode(value)}>{label}</button>
          ))}
        </div>

        <div className="source-panel" id={`panel-${mode}`} role="tabpanel" aria-labelledby={`mode-${mode}`}>
          {mode === "templates" ? <div className="template-list">{templates.map((item) => (
            <button key={item.name} className={project.name === item.name ? "template active" : "template"} onClick={() => loadProject(item)}>
              <PixelMiniature project={item} className="template-preview"/><span><b>{item.name}</b><small>{item.width} × {item.height} · {item.palette.length} couleurs</small></span>
            </button>
          ))}</div> : null}

          {mode === "image" ? <div className="image-workbench">
            <div className="image-source-card">
              <div className={`image-preview ${sourceDataUrl ? "has-image" : ""}`} style={sourceDataUrl ? { backgroundImage: `url(${sourceDataUrl})`, backgroundSize: imageSettings.cropMode, backgroundPosition: `${imageSettings.focusX}% ${imageSettings.focusY}%`, aspectRatio: `${imageSettings.width} / ${imageSettings.height}`, backgroundColor: imageSettings.background } : undefined} aria-label={sourceDataUrl ? `Aperçu du cadrage de ${sourceName}` : "Aucune image sélectionnée"} role="img">{sourceDataUrl ? null : <span>Dépose ton image ici<br/><small>PNG, JPG ou WebP</small></span>}</div>
              <button className="primary compact" onClick={() => fileRef.current?.click()}>Choisir une image</button>
              <input ref={fileRef} hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={importImage}/><p>Le fichier reste dans ce navigateur et n’est jamais envoyé.</p>
            </div>
            <div className="image-controls">
              <div className="control-group dimensions"><label>Colonnes<input type="number" min="8" max="64" value={imageSettings.width} onChange={(event) => updateImageSetting("width", Math.max(8, Math.min(64, Number(event.target.value))))}/></label><span>×</span><label>Lignes<input type="number" min="8" max="64" value={imageSettings.height} onChange={(event) => updateImageSetting("height", Math.max(8, Math.min(64, Number(event.target.value))))}/></label></div>
              <div className="preset-row" aria-label="Formats rapides">{[[12, 12], [16, 16], [24, 24], [32, 24]].map(([width, height]) => <button key={`${width}-${height}`} onClick={() => setImageSettings((current) => ({ ...current, width, height }))}>{width}×{height}</button>)}</div>
              <label className="range-label"><span>Palette <b>{imageSettings.paletteSize} couleurs</b></span><input type="range" min="3" max="20" value={imageSettings.paletteSize} onChange={(event) => updateImageSetting("paletteSize", Number(event.target.value))}/></label>
              <div className="control-group"><label>Cadrage<select value={imageSettings.cropMode} onChange={(event) => updateImageSetting("cropMode", event.target.value as CropMode)}><option value="cover">Remplir et recadrer</option><option value="contain">Afficher en entier</option></select></label><label>Fond<input aria-label="Couleur du fond transparent" type="color" value={imageSettings.background} onChange={(event) => updateImageSetting("background", event.target.value)}/></label></div>
              {imageSettings.cropMode === "cover" ? <div className="focus-controls"><label className="range-label"><span>Position horizontale <b>{imageSettings.focusX}%</b></span><input type="range" min="0" max="100" value={imageSettings.focusX} onChange={(event) => updateImageSetting("focusX", Number(event.target.value))}/></label><label className="range-label"><span>Position verticale <b>{imageSettings.focusY}%</b></span><input type="range" min="0" max="100" value={imageSettings.focusY} onChange={(event) => updateImageSetting("focusY", Number(event.target.value))}/></label></div> : null}
              <details className="advanced-controls"><summary>Réglages de l’image</summary>{IMAGE_ADJUSTMENTS.map(([key, label]) => <label className="range-label" key={key}><span>{label} <b>{imageSettings[key]}%</b></span><input type="range" min="50" max="160" value={imageSettings[key]} onChange={(event) => updateImageSetting(key, Number(event.target.value))}/></label>)}<label className="check-label"><input type="checkbox" checked={imageSettings.dither} onChange={(event) => updateImageSetting("dither", event.target.checked)}/> Tramage perceptuel <small>Ajoute du détail, mais aussi plus de texture.</small></label></details>
              <button className="primary compact generate-button" disabled={!sourceDataUrl || processing} onClick={() => sourceDataUrl && void generateFromImage(sourceDataUrl, sourceName)}>{processing ? "Pixelisation…" : "Mettre à jour la grille"}</button>
              {imageError ? <p className="form-error" role="alert">{imageError}</p> : null}
            </div>
          </div> : null}

          {mode === "text" ? <form className="prompt-row" onSubmit={(event) => { event.preventDefault(); loadProject(textProject(prompt, imageSettings.width, imageSettings.height)); }}><div><b>Crée un motif guidé</b><p>Le générateur local interprète des familles simples : espace, fleur, jardin ou motif abstrait.</p></div><input value={prompt} onChange={(event) => setPrompt(event.target.value)} required maxLength={80} placeholder="Une fusée violette dans l’espace…"/><button className="primary compact">Créer le motif</button></form> : null}
        </div>

        <div className="editor-card">
          <aside className="tools" aria-label="Outils de dessin">
            <div><span className="label">OUTILS</span><div className="drawing-tools">{TOOL_OPTIONS.map(([value, icon, label]) => <button key={value} className={tool === value ? "active" : ""} aria-pressed={tool === value} onClick={() => setTool(value)}><span>{icon}</span>{label}</button>)}</div></div>
            <div><span className="label">PALETTE NUMÉROTÉE</span><div className="palette">{project.palette.map((color, index) => <button key={`${index}-${color}`} className={selected === index ? "swatch selected" : "swatch"} style={{ background: color }} aria-label={`Couleur ${index + 1}, ${color}`} aria-pressed={selected === index} onClick={() => { setSelected(index); setTool("pencil"); }}><span>{index + 1}</span></button>)}</div><label className="color-editor">Ajuster la couleur {selected + 1}<input type="color" value={project.palette[selected]} onChange={(event) => changePaletteColor(event.target.value)}/></label></div>
            <div><span className="label">PROGRESSION JUSTE</span><div className="progress-label"><b>{progress}%</b><span>{correct} corrects · {filled} remplis</span></div><div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><i style={{ width: `${progress}%` }}/></div></div>
            <div className="history-actions"><button disabled={undoStack.length === 0} onClick={undo}>↶ Annuler</button><button disabled={redoStack.length === 0} onClick={redo}>↷ Rétablir</button></div>
            <div className="tool-actions"><button className={resetPending ? "danger" : ""} onBlur={() => setResetPending(false)} onClick={requestReset}>{resetPending ? "Confirmer l’effacement" : "↺ Recommencer"}</button><button onClick={() => exportPng("current")}>↓ Progression actuelle</button><button onClick={() => exportPng("complete")}>↓ Modèle terminé</button><button onClick={() => exportPng("printable")}>▦ Grille à imprimer</button></div>
          </aside>

          <section className="canvas-wrap"><header><div><span className="status-dot"/> {progress === 100 ? "TERMINÉ" : "EN COURS"}</div><b>{project.name}</b><span>{project.width} × {project.height}</span></header>
            <div className="view-controls"><label>Zoom <input type="range" min="50" max="200" step="10" value={zoom} onChange={(event) => setZoom(Number(event.target.value))}/><b>{zoom}%</b></label><button onClick={fitGrid}>Ajuster</button><label>Aide <input type="range" min="0" max="100" step="5" value={referenceOpacity} onChange={(event) => setReferenceOpacity(Number(event.target.value))}/><b>{referenceOpacity}%</b></label><label className="toggle"><input type="checkbox" checked={showNumbers} onChange={(event) => setShowNumbers(event.target.checked)}/> Numéros</label><label className="toggle"><input type="checkbox" checked={showGrid} onChange={(event) => setShowGrid(event.target.checked)}/> Traits</label></div>
            <div className="coordinate-bar" aria-live="polite">{cursorCoordinates}<span>Fais défiler pour explorer les grandes grilles.</span></div>
            <div className="pixel-grid-viewport"><div className={`pixel-grid ${showGrid ? "with-grid" : "without-grid"}`} style={gridStyle} onPointerMove={handlePointerMove} onPointerLeave={() => { drawingRef.current = false; setHoveredIndex(null); }}>
              {project.targets.map((target, index) => {
                const paintedIndex = painted[index];
                const correctCell = paintedIndex === target;
                const x = index % project.width + 1;
                const y = Math.floor(index / project.width) + 1;
                return <button key={index} data-index={index} className={correctCell ? "correct" : paintedIndex === null ? "empty" : "incorrect"} aria-label={`Colonne ${x}, ligne ${y}. Couleur cible ${target + 1}${paintedIndex === null ? ", vide" : correctCell ? ", correcte" : ", incorrecte"}`} onPointerDown={(event) => handlePointerDown(event, index)} onPointerEnter={() => setHoveredIndex(index)} style={{ background: paintedIndex === null ? "#ffffff" : project.palette[paintedIndex] }}><span className="cell-hint" style={{ background: project.palette[target] }}>{showNumbers ? target + 1 : ""}</span></button>;
              })}
            </div></div>
          </section>
        </div>
      </div></section>

      <section className="how shell" id="how"><div className="section-heading"><span className="eyebrow">UNE CHAÎNE CLAIRE</span><h2>De l’image au modèle</h2></div><div className="steps"><article><span>01</span><i>⌗</i><h3>Cadre</h3><p>Choisis le format, la zone utile et les dimensions exactes.</p></article><article><span>02</span><i>▦</i><h3>Quantifie</h3><p>Pixelia construit une palette perceptuelle réellement utilisable.</p></article><article><span>03</span><i>✎</i><h3>Affine</h3><p>Zoome, corrige, annule et exporte la version dont tu as besoin.</p></article></div></section>
      <footer><div className="shell"><a className="brand" href="#top"><span className="brand-mark">P</span> Pixelia</a><p>Chaque petit carré a désormais une vraie raison d’être.</p><span>© 2026 Pixelia</span></div></footer>
    </main>
  );
}
