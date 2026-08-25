"use client";

import NextImage from "next/image";
import Link from "next/link";
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
import MobileEditorToolbar from "@/components/MobileEditorToolbar";
import TemplateLibrary from "@/components/TemplateLibrary";
import { hasNetworkConnection } from "@/lib/connectivity";
import { findForegroundBounds } from "@/lib/image-crop";
import { type PixelProject, type Rgb, quantizePixels } from "@/lib/pixel-art";
import { getLocalizedProjectName, heroTemplate, type Locale } from "@/lib/templates";

type Mode = "templates" | "image" | "text";
type Tool = "pencil" | "eraser" | "picker" | "fill";
type CropMode = "cover" | "contain";
type IdeaStyle = "cute" | "retro" | "minimal";
type IdeaDetail = "simple" | "classic" | "detailed";
type CreationSource = "text" | "image" | "template" | "saved";
type PaintLayer = Array<number | null>;
type FreeImageSuggestion = {
  id: string;
  title: string;
  creator: string;
  attribution: string;
  license: string;
  licenseUrl: string | null;
  sourceUrl: string | null;
  previewUrl: string;
};
type FreeImageCredit = Pick<FreeImageSuggestion, "creator" | "license" | "licenseUrl" | "sourceUrl">;
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

const STORAGE_KEY = "mosaipix-project-v2";
const LEGACY_STORAGE_KEY = "pixelia-project-v2";
const LOCALE_KEY = "mosaipix-locale";
const MODE_OPTIONS: Array<[Mode, string]> = [
  ["text", "✦ Une idée"],
  ["image", "↑ Une photo"],
  ["templates", "▦ Un modèle"],
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
const IDEA_STYLES: Array<[IdeaStyle, string, string]> = [
  ["cute", "Mignon", "Formes douces et couleurs joyeuses"],
  ["retro", "Rétro", "Look arcade 8-bit bien contrasté"],
  ["minimal", "Épuré", "Silhouette simple et immédiate"],
];
const IDEA_DETAILS: Array<[IdeaDetail, string, string]> = [
  ["simple", "Simple", "16 × 16"],
  ["classic", "Classique", "24 × 24"],
  ["detailed", "Détaillé", "32 × 32"],
];
const IDEA_GENERATION_SETTINGS: Record<IdeaDetail, { size: number; paletteSize: number }> = {
  simple: { size: 16, paletteSize: 6 },
  classic: { size: 24, paletteSize: 8 },
  detailed: { size: 32, paletteSize: 10 },
};
const DEFAULT_IMAGE_SETTINGS: ImageSettings = {
  width: 16,
  height: 16,
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

function loadBrowserImage(dataUrl: string, errorMessage: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(errorMessage));
    image.src = dataUrl;
  });
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Invalid image"));
    reader.onerror = () => reject(new Error("Invalid image"));
    reader.readAsDataURL(blob);
  });
}

function Brand() {
  return (
    <>
      <span className="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 40 40" shapeRendering="crispEdges">
          <path d="M4 4h6v32H4zm6 6h6v10h-6zm6 6h6v10h-6zm6-6h6v10h-6zm6-6h6v32h-6z" />
        </svg>
      </span>
      <span className="brand-lockup"><b>Mosaipix</b><small>Pixel Art Studio</small></span>
    </>
  );
}

export default function PixelStudio({ initialLocale = "fr" }: { initialLocale?: Locale }) {
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const [mode, setMode] = useState<Mode>("text");
  const [project, setProject] = useState<PixelProject>(heroTemplate.project);
  const [painted, setPainted] = useState<PaintLayer>(() => Array(heroTemplate.project.targets.length).fill(null));
  const [selected, setSelected] = useState(1);
  const [tool, setTool] = useState<Tool>("pencil");
  const [prompt, setPrompt] = useState("");
  const [ideaStyle, setIdeaStyle] = useState<IdeaStyle>("cute");
  const [ideaDetail, setIdeaDetail] = useState<IdeaDetail>("classic");
  const [ideaError, setIdeaError] = useState("");
  const [ideaNotice, setIdeaNotice] = useState("");
  const [ideaRemaining, setIdeaRemaining] = useState<number | null>(null);
  const [generatingIdea, setGeneratingIdea] = useState(false);
  const [freeImages, setFreeImages] = useState<FreeImageSuggestion[]>([]);
  const [freeImageError, setFreeImageError] = useState("");
  const [searchingFreeImages, setSearchingFreeImages] = useState(false);
  const [choosingFreeImage, setChoosingFreeImage] = useState<string | null>(null);
  const [freeImageCredit, setFreeImageCredit] = useState<FreeImageCredit | null>(null);
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
  const [hasActiveProject, setHasActiveProject] = useState(false);
  const [resumeAvailable, setResumeAvailable] = useState(false);
  const [shouldPersistProject, setShouldPersistProject] = useState(false);
  const [creationSource, setCreationSource] = useState<CreationSource | null>(null);
  const [editorExpanded, setEditorExpanded] = useState(false);
  const [focusedCell, setFocusedCell] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const promptRef = useRef<HTMLInputElement>(null);
  const gridViewportRef = useRef<HTMLDivElement>(null);
  const drawingRef = useRef(false);

  useEffect(() => {
    try {
      setLocale(initialLocale);
      document.documentElement.lang = initialLocale;
      localStorage.setItem(LOCALE_KEY, initialLocale);
      const saved = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY);
      if (saved) {
        const data: unknown = JSON.parse(saved);
        if (validateSavedProject(data)) {
          setProject(data.project);
          setPainted(data.painted);
          setSelected(Math.min(1, data.project.palette.length - 1));
          setResumeAvailable(true);
          setShouldPersistProject(true);
          setCreationSource("saved");
        }
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    } finally {
      setHydrated(true);
    }
  }, [initialLocale]);

  useEffect(() => {
    document.body.classList.toggle("editor-expanded", editorExpanded);
    return () => document.body.classList.remove("editor-expanded");
  }, [editorExpanded]);

  function rememberLocale(nextLocale: Locale) {
    try {
      localStorage.setItem(LOCALE_KEY, nextLocale);
    } catch {
      // Language navigation remains usable when storage is unavailable.
    }
  }

  useEffect(() => {
    if (!hydrated || !shouldPersistProject) return;
    const timeout = window.setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ project, painted }));
      } catch {
        // A full localStorage should never interrupt drawing.
      }
    }, 450);
    return () => window.clearTimeout(timeout);
  }, [hydrated, painted, project, shouldPersistProject]);

  const filled = painted.reduce<number>((total, value) => total + (value === null ? 0 : 1), 0);
  const correct = painted.reduce<number>((total, value, index) => total + (value === project.targets[index] ? 1 : 0), 0);
  const progress = correct === 0 ? 0 : Math.max(1, Math.round(correct / project.targets.length * 100));
  const cellSize = Math.max(10, Math.round(32 * zoom / 100));
  const cursorCoordinates = hoveredIndex === null
    ? locale === "fr" ? "Sélectionne une case" : "Select a cell"
    : locale === "fr"
      ? `Colonne ${hoveredIndex % project.width + 1}, ligne ${Math.floor(hoveredIndex / project.width) + 1}`
      : `Column ${hoveredIndex % project.width + 1}, row ${Math.floor(hoveredIndex / project.width) + 1}`;

  function clearHistory() {
    setUndoStack([]);
    setRedoStack([]);
  }

  function revealEditor() {
    if (window.matchMedia("(max-width: 900px)").matches) {
      setEditorExpanded(true);
      return;
    }
    window.requestAnimationFrame(() => {
      document.querySelector(".editor-card")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function loadProject(next: PixelProject, source: CreationSource) {
    setProject(next);
    setPainted(Array(next.targets.length).fill(null));
    setSelected(Math.min(1, next.palette.length - 1));
    setFocusedCell(0);
    clearHistory();
    setResetPending(false);
    setResumeAvailable(false);
    setHasActiveProject(true);
    setShouldPersistProject(true);
    setCreationSource(source);
    revealEditor();
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

  async function generateIdea() {
    const cleanPrompt = prompt.trim();
    if (cleanPrompt.length < 2) {
      setIdeaError(locale === "fr" ? "Décris ton idée en quelques mots." : "Describe your idea in a few words.");
      return;
    }
    if (!await hasNetworkConnection()) {
      setIdeaError(locale === "fr" ? "La création IA nécessite Internet. Les modèles et tes photos restent disponibles hors connexion." : "AI creation needs an internet connection. Templates and your photos still work offline.");
      return;
    }

    setGeneratingIdea(true);
    setIdeaError("");
    setIdeaNotice("");
    try {
      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: cleanPrompt,
          style: ideaStyle,
          detail: ideaDetail,
          locale,
        }),
      });
      const remainingHeader = response.headers.get("X-RateLimit-Remaining");
      const remaining = remainingHeader === null ? Number.NaN : Number(remainingHeader);
      if (Number.isFinite(remaining)) setIdeaRemaining(remaining);
      if (!response.ok) {
        const data: unknown = await response.json().catch(() => null);
        const result = data as { error?: unknown } | null;
        const message = typeof result?.error === "string" ? result.error : locale === "fr" ? "L’image n’a pas pu être créée." : "The image could not be created.";
        if ((response.status === 402 || response.status === 429 || response.status >= 500) && await searchFreeImages()) {
          setIdeaNotice(`${message} ${locale === "fr" ? "Voici 3 images libres à transformer en pixel art." : "Here are 3 open images to turn into pixel art."}`);
          return;
        }
        throw new Error(message);
      }
      const imageBlob = await response.blob();
      if (!imageBlob.type.startsWith("image/")) {
        throw new Error(locale === "fr" ? "Le service n’a pas renvoyé une image valide." : "The service did not return a valid image.");
      }
      const dataUrl = await blobToDataUrl(imageBlob);
      const generation = IDEA_GENERATION_SETTINGS[ideaDetail];
      const settings: ImageSettings = {
        ...imageSettings,
        width: generation.size,
        height: generation.size,
        paletteSize: generation.paletteSize,
        cropMode: "cover",
        focusX: 50,
        focusY: 50,
        contrast: 112,
        saturation: 108,
        dither: false,
      };
      setImageSettings(settings);
      setSourceDataUrl(dataUrl);
      setSourceName(cleanPrompt);
      setFreeImageCredit(null);
      if (!await generateFromImage(dataUrl, cleanPrompt, settings, "text")) {
        throw new Error(locale === "fr" ? "L’image a été créée, mais sa conversion a échoué." : "The image was created, but its conversion failed.");
      }
    } catch (error) {
      setIdeaError(error instanceof Error ? error.message : locale === "fr" ? "La création a échoué. Réessaie." : "Generation failed. Please try again.");
    } finally {
      setGeneratingIdea(false);
    }
  }

  async function searchFreeImages(): Promise<boolean> {
    const cleanPrompt = prompt.trim();
    if (cleanPrompt.length < 2) {
      setFreeImageError(locale === "fr" ? "Décris d’abord l’image recherchée." : "Describe the image you want first.");
      promptRef.current?.focus();
      return false;
    }
    if (!await hasNetworkConnection()) {
      setFreeImageError(locale === "fr" ? "La recherche d’images nécessite Internet. Tu peux utiliser un modèle ou une photo de cet appareil." : "Image search needs an internet connection. You can use a template or a photo from this device.");
      return false;
    }

    setSearchingFreeImages(true);
    setFreeImageError("");
    try {
      const response = await fetch("/api/free-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: cleanPrompt, locale }),
      });
      const data: unknown = await response.json();
      const result = data as { error?: unknown; images?: unknown };
      if (!response.ok || !Array.isArray(result.images)) {
        throw new Error(typeof result.error === "string" ? result.error : locale === "fr" ? "Aucune image n’a été trouvée." : "No image was found.");
      }
      const suggestions = result.images.filter((image): image is FreeImageSuggestion => Boolean(
        image && typeof image === "object"
        && typeof (image as FreeImageSuggestion).id === "string"
        && typeof (image as FreeImageSuggestion).title === "string"
        && typeof (image as FreeImageSuggestion).creator === "string"
        && typeof (image as FreeImageSuggestion).license === "string"
        && typeof (image as FreeImageSuggestion).previewUrl === "string",
      ));
      setFreeImages(suggestions);
      if (suggestions.length === 0) {
        setFreeImageError(locale === "fr" ? "Aucune image libre assez proche. Essaie une description plus simple." : "No close open image was found. Try a simpler description.");
      }
      return suggestions.length > 0;
    } catch (error) {
      setFreeImages([]);
      setFreeImageError(error instanceof Error ? error.message : locale === "fr" ? "La recherche a échoué." : "Search failed.");
      return false;
    } finally {
      setSearchingFreeImages(false);
    }
  }

  async function chooseFreeImage(image: FreeImageSuggestion) {
    setChoosingFreeImage(image.id);
    setFreeImageError("");
    try {
      const response = await fetch(image.previewUrl);
      if (!response.ok) throw new Error(locale === "fr" ? "Cette image n’est plus disponible." : "This image is no longer available.");
      const dataUrl = await blobToDataUrl(await response.blob());
      setSourceDataUrl(dataUrl);
      setSourceName(image.title);
      setFreeImageCredit(image);
      setImageError("");
      setMode("image");
      window.requestAnimationFrame(() => document.getElementById("panel-image")?.scrollIntoView({ behavior: "smooth", block: "center" }));
    } catch (error) {
      setFreeImageError(error instanceof Error ? error.message : locale === "fr" ? "Impossible de charger cette image." : "This image could not be loaded.");
    } finally {
      setChoosingFreeImage(null);
    }
  }

  async function generateFromImage(dataUrl: string, name: string, settings = imageSettings, source: CreationSource = "image"): Promise<boolean> {
    setProcessing(true);
    setImageError("");
    try {
      const image = await loadBrowserImage(dataUrl, locale === "fr" ? "Impossible de lire cette image." : "This image could not be read.");
      const canvas = document.createElement("canvas");
      canvas.width = settings.width;
      canvas.height = settings.height;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) throw new Error(locale === "fr" ? "Le navigateur ne permet pas de préparer l’image." : "Your browser could not process this image.");

      context.fillStyle = settings.background;
      context.fillRect(0, 0, settings.width, settings.height);
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.filter = `brightness(${settings.brightness}%) contrast(${settings.contrast}%) saturate(${settings.saturation}%)`;

      let cropX = 0;
      let cropY = 0;
      let cropWidth = image.width;
      let cropHeight = image.height;

      if (source === "text") {
        const analysisSize = 128;
        const analysisCanvas = document.createElement("canvas");
        analysisCanvas.width = analysisSize;
        analysisCanvas.height = analysisSize;
        const analysisContext = analysisCanvas.getContext("2d", { willReadFrequently: true });
        if (analysisContext) {
          analysisContext.drawImage(image, 0, 0, analysisSize, analysisSize);
          const bounds = findForegroundBounds(
            analysisContext.getImageData(0, 0, analysisSize, analysisSize).data,
            analysisSize,
            analysisSize,
          );
          if (bounds) {
            cropX = bounds.x / analysisSize * image.width;
            cropY = bounds.y / analysisSize * image.height;
            cropWidth = bounds.width / analysisSize * image.width;
            cropHeight = bounds.height / analysisSize * image.height;
          }
        }
      }

      const sourceRatio = cropWidth / cropHeight;
      const targetRatio = settings.width / settings.height;
      if (settings.cropMode === "cover") {
        let sourceWidth = cropWidth;
        let sourceHeight = cropHeight;
        if (sourceRatio > targetRatio) sourceWidth = cropHeight * targetRatio;
        else sourceHeight = cropWidth / targetRatio;
        const sourceX = cropX + (cropWidth - sourceWidth) * settings.focusX / 100;
        const sourceY = cropY + (cropHeight - sourceHeight) * settings.focusY / 100;
        context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, settings.width, settings.height);
      } else {
        const scale = Math.min(settings.width / cropWidth, settings.height / cropHeight);
        const drawWidth = cropWidth * scale;
        const drawHeight = cropHeight * scale;
        context.drawImage(
          image,
          cropX,
          cropY,
          cropWidth,
          cropHeight,
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
      }, source);
      return true;
    } catch (error) {
      setImageError(error instanceof Error ? error.message : locale === "fr" ? "La génération a échoué." : "Generation failed.");
      return false;
    } finally {
      setProcessing(false);
    }
  }

  function importImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onerror = () => setImageError(locale === "fr" ? "Impossible de lire ce fichier." : "This file could not be read.");
    reader.onload = () => {
      if (typeof reader.result !== "string") return;
      const cleanName = file.name.replace(/\.[^.]+$/, "") || "image";
      setSourceDataUrl(reader.result);
      setSourceName(cleanName);
      setFreeImageCredit(null);
      setImageError("");
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

  function createExportDataUrl(exportMode: "current" | "complete" | "printable") {
    // A brand-new coloring has no painted cells. Export the generated model in
    // that case so the primary download can never produce a blank white image.
    const resolvedMode = exportMode === "current" && filled === 0 ? "complete" : exportMode;
    const cell = resolvedMode === "printable" ? 46 : 32;
    const legendHeight = resolvedMode === "printable" ? Math.ceil(project.palette.length / 4) * 42 + 48 : 0;
    const canvas = document.createElement("canvas");
    canvas.width = project.width * cell;
    canvas.height = project.height * cell + legendHeight;
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);

    project.targets.forEach((target, index) => {
      const x = (index % project.width) * cell;
      const y = Math.floor(index / project.width) * cell;
      const paintedIndex = painted[index];
      if (resolvedMode === "complete") context.fillStyle = project.palette[target];
      else if (resolvedMode === "current") context.fillStyle = paintedIndex === null ? "#ffffff" : project.palette[paintedIndex];
      else context.fillStyle = "#ffffff";
      context.fillRect(x, y, cell, cell);

      if (resolvedMode === "printable") {
        context.strokeStyle = "#9a97a4";
        context.strokeRect(x, y, cell, cell);
        context.fillStyle = "#2d2b3f";
        context.font = "600 15px sans-serif";
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillText(String(target + 1), x + cell / 2, y + cell / 2);
      }
    });

    if (resolvedMode === "printable") {
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

    return { dataUrl: canvas.toDataURL("image/png"), resolvedMode };
  }

  function exportPng(exportMode: "current" | "complete" | "printable") {
    const exported = createExportDataUrl(exportMode);
    if (!exported) return;
    const link = document.createElement("a");
    link.download = `${project.name || "mosaipix"}-${exported.resolvedMode}.png`;
    link.href = exported.dataUrl;
    link.click();
  }

  function printPrintableGrid() {
    const exported = createExportDataUrl("printable");
    if (!exported) return;
    const printWindow = window.open("", "mosaipix-print", "width=900,height=1100");
    if (!printWindow) {
      exportPng("printable");
      return;
    }

    printWindow.opener = null;
    printWindow.document.title = `${project.name || "Mosaipix"} – ${tr("grille numérotée", "numbered grid")}`;
    const style = printWindow.document.createElement("style");
    style.textContent = `
      @page { size: A4 portrait; margin: 10mm; }
      html, body { margin: 0; min-height: 100%; background: white; }
      body { display: grid; place-items: center; }
      img { display: block; max-width: 100%; max-height: 277mm; object-fit: contain; }
    `;
    const image = printWindow.document.createElement("img");
    image.alt = tr("Grille de coloriage numérotée avec sa légende", "Numbered coloring grid with its legend");
    image.addEventListener("load", () => {
      printWindow.focus();
      printWindow.print();
    }, { once: true });
    printWindow.addEventListener("afterprint", () => printWindow.close(), { once: true });
    printWindow.document.head.append(style);
    printWindow.document.body.append(image);
    image.src = exported.dataUrl;
  }

  function fitGrid() {
    const viewport = gridViewportRef.current;
    if (!viewport) return;
    const gap = showGrid ? 1 : 0;
    const availableWidth = Math.max(100, viewport.clientWidth - 18 - (project.width - 1) * gap);
    const availableHeight = Math.max(100, viewport.clientHeight - 18 - (project.height - 1) * gap);
    const targetCell = Math.max(10, Math.floor(Math.min(availableWidth / project.width, availableHeight / project.height)));
    setZoom(Math.max(25, Math.min(200, Math.round(targetCell / 32 * 100))));
  }

  function changeZoom(delta: number) {
    setZoom((current) => Math.max(25, Math.min(200, current + delta)));
  }

  function editCreationSource() {
    setEditorExpanded(false);
    document.getElementById("studio")?.scrollIntoView({ behavior: "smooth", block: "start" });
    if (creationSource === "text") {
      setMode("text");
      window.setTimeout(() => promptRef.current?.focus(), 450);
    } else if (creationSource === "image") {
      setMode("image");
    }
  }

  function handleGridKeys(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = index;
    if (event.key === "ArrowLeft") next = Math.max(0, index - 1);
    else if (event.key === "ArrowRight") next = Math.min(project.targets.length - 1, index + 1);
    else if (event.key === "ArrowUp") next = Math.max(0, index - project.width);
    else if (event.key === "ArrowDown") next = Math.min(project.targets.length - 1, index + project.width);
    else if (event.key === "Home") next = Math.floor(index / project.width) * project.width;
    else if (event.key === "End") next = Math.min(project.targets.length - 1, Math.floor(index / project.width) * project.width + project.width - 1);
    else return;
    event.preventDefault();
    setFocusedCell(next);
    window.requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-index="${next}"]`)?.focus());
  }

  function handleModeKeys(event: KeyboardEvent<HTMLDivElement>) {
    if (!event.key.match(/ArrowLeft|ArrowRight|Home|End/)) return;
    event.preventDefault();
    const order = MODE_OPTIONS.map(([value]) => value);
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

  const isFrench = locale === "fr";
  const tr = (french: string, english: string) => isFrench ? french : english;
  const modeOptions: Array<[Mode, string]> = isFrench ? MODE_OPTIONS : [
    ["text", "✦ An idea"],
    ["image", "↑ A photo"],
    ["templates", "▦ A template"],
  ];
  const imageAdjustments: typeof IMAGE_ADJUSTMENTS = isFrench ? IMAGE_ADJUSTMENTS : [
    ["brightness", "Brightness"],
    ["contrast", "Contrast"],
    ["saturation", "Saturation"],
  ];
  const toolOptions: typeof TOOL_OPTIONS = isFrench ? TOOL_OPTIONS : [
    ["pencil", "✎", "Pencil"],
    ["eraser", "◇", "Eraser"],
    ["picker", "⌾", "Picker"],
    ["fill", "▰", "Fill"],
  ];
  const primaryTools = toolOptions.slice(0, 2);
  const advancedTools = toolOptions.slice(2);
  const ideaStyles: typeof IDEA_STYLES = isFrench ? IDEA_STYLES : [
    ["cute", "Cute", "Soft shapes and cheerful colors"],
    ["retro", "Retro", "Bold 8-bit arcade look"],
    ["minimal", "Minimal", "Simple, instantly readable silhouette"],
  ];
  const ideaDetails: typeof IDEA_DETAILS = isFrench ? IDEA_DETAILS : [
    ["simple", "Simple", "12 × 12"],
    ["classic", "Classic", "16 × 16"],
    ["detailed", "Detailed", "24 × 24"],
  ];
  const projectName = getLocalizedProjectName(project.name, locale);

  return (
    <main onPointerUp={() => { drawingRef.current = false; }} onPointerLeave={() => { drawingRef.current = false; }}>
      <a className="skip-link" href="#studio">{tr("Aller au studio", "Skip to studio")}</a>
      <nav className="nav shell" aria-label={tr("Navigation principale", "Main navigation")}>
        <a className="brand" href="#top"><Brand /></a>
        <div className="nav-links">
          <a href="#studio">Studio</a>
          <a href="#how">{tr("Comment ça marche", "How it works")}</a>
          <span className="badge">{tr("Gratuit · Sans compte", "Free · No account")}</span>
          <div className="language-switch" role="group" aria-label={tr("Langue", "Language")}>
            <Link href="/fr" hrefLang="fr" className={isFrench ? "active" : ""} aria-current={isFrench ? "page" : undefined} onClick={() => rememberLocale("fr")}>FR</Link>
            <Link href="/en" hrefLang="en" className={!isFrench ? "active" : ""} aria-current={!isFrench ? "page" : undefined} onClick={() => rememberLocale("en")}>EN</Link>
          </div>
        </div>
      </nav>

      <section className="hero shell" id="top">
        <div className="hero-copy">
          <span className="eyebrow">✦ {tr("TON STUDIO DE PIXEL ART", "YOUR PIXEL ART STUDIO")}</span>
          <h1>{tr("Transforme.", "Transform.")}<br/><em>{tr("Pixelise.", "Pixelate.")}</em> {tr("Crée.", "Create.")}</h1>
          <p>{tr("Décris une idée ou choisis une photo. Mosaipix la transforme en véritable pixel art, prêt à colorier et à personnaliser.", "Describe an idea or choose a photo. Mosaipix turns it into real pixel art that you can color and customize.")}</p>
          <a className="primary" href="#studio">{tr("Ouvrir le studio", "Open the studio")} <span>→</span></a>
          <small>{tr("✓ Aucun envoi de photo   ✓ Projet sauvegardé localement", "✓ Photos stay private   ✓ Project saved locally")}</small>
        </div>
        <div className="hero-art">
          <PixelMiniature project={heroTemplate.project} className="hero-pixel-grid" label={tr("Fusée composée de véritables pixels colorés", "Rocket made from real colored pixels")} />
          <div className="pixel-badge badge-top"><b>16 × 16</b><span>{tr("grille réelle", "real grid")}</span></div>
          <div className="pixel-badge badge-bottom"><b>{heroTemplate.project.palette.length} {tr("couleurs", "colors")}</b><span>{tr("palette maîtrisée", "curated palette")}</span></div>
        </div>
      </section>

      <section className="studio-section" id="studio"><div className="shell">
        <div className="section-heading"><span className="eyebrow">{tr("LE STUDIO PIXEL ART", "THE PIXEL ART STUDIO")}</span><h2>{tr("Que veux-tu créer ?", "What do you want to create?")}</h2><p>{tr("Choisis un point de départ. Mosaipix construit une vraie grille de pixels, avec des réglages fins disponibles si tu en as besoin.", "Choose a starting point. Mosaipix builds a true pixel grid, with fine controls available whenever you need them.")}</p></div>

        {resumeAvailable && !hasActiveProject ? <div className="resume-card">
          <PixelMiniature project={project} className="resume-preview" label={tr(`Aperçu de ${projectName}`, `Preview of ${projectName}`)} />
          <div><span className="eyebrow">{tr("PROJET SAUVEGARDÉ", "SAVED PROJECT")}</span><h3>{projectName}</h3><p>{project.width} × {project.height} · {project.palette.length} {tr("couleurs", "colors")}</p></div>
          <div className="resume-actions"><button className="primary compact" onClick={() => { setHasActiveProject(true); setCreationSource("saved"); revealEditor(); }}>{tr("Reprendre", "Resume")}</button><button className="quiet-button" onClick={() => setResumeAvailable(false)}>{tr("Créer autre chose", "Create something else")}</button></div>
        </div> : null}

        <div className="mode-tabs" role="tablist" aria-label={tr("Point de départ", "Starting point")} onKeyDown={handleModeKeys}>
          {modeOptions.map(([value, label]) => (
            <button key={value} id={`mode-${value}`} role="tab" aria-selected={mode === value} aria-controls={`panel-${value}`} tabIndex={mode === value ? 0 : -1} className={mode === value ? "active" : ""} onClick={() => setMode(value)}>{label}</button>
          ))}
        </div>

        <div className="source-panel" id={`panel-${mode}`} role="tabpanel" aria-labelledby={`mode-${mode}`}>
          {mode === "templates" ? <TemplateLibrary locale={locale} activeProjectName={hasActiveProject ? project.name : undefined} onSelect={(item) => loadProject(item.project, "template")} /> : null}

          {mode === "image" ? <div className="image-workbench">
            <div className="image-source-card">
              <div className={`image-preview ${sourceDataUrl ? "has-image" : ""}`} style={sourceDataUrl ? { backgroundImage: `url(${sourceDataUrl})`, backgroundSize: imageSettings.cropMode, backgroundPosition: `${imageSettings.focusX}% ${imageSettings.focusY}%`, aspectRatio: `${imageSettings.width} / ${imageSettings.height}`, backgroundColor: imageSettings.background } : undefined} aria-label={sourceDataUrl ? tr(`Aperçu du cadrage de ${sourceName}`, `Crop preview for ${sourceName}`) : tr("Aucune image sélectionnée", "No image selected")} role="img">{sourceDataUrl ? null : <span>{tr("Ta photo apparaîtra ici", "Your photo will appear here")}<br/><small>PNG, JPG {tr("ou", "or")} WebP</small></span>}</div>
              <button className="primary compact" onClick={() => fileRef.current?.click()}>{sourceDataUrl ? tr("Changer de photo", "Change photo") : tr("Choisir une photo", "Choose a photo")}</button>
              <input ref={fileRef} hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={importImage}/>
              <p>{tr("Ta photo reste dans ce navigateur et n’est jamais envoyée. Choisis-la, règle le rendu, puis crée ton pixel art.", "Your photo stays in this browser and is never uploaded. Choose it, adjust the look, then create your pixel art.")}</p>
              {freeImageCredit ? <p className="selected-image-credit">{tr("Image libre", "Open image")} · {freeImageCredit.creator} · {freeImageCredit.sourceUrl ? <a href={freeImageCredit.sourceUrl} target="_blank" rel="noreferrer">{tr("source", "source")}</a> : null} {freeImageCredit.licenseUrl ? <a href={freeImageCredit.licenseUrl} target="_blank" rel="noreferrer">{freeImageCredit.license}</a> : freeImageCredit.license}</p> : null}
            </div>
            <div className="image-controls simple-panel">
              <fieldset className="choice-field"><legend>{tr("Niveau de détail", "Level of detail")}</legend><div className="choice-cards compact-choices">{[[12, tr("Simple", "Simple")], [16, tr("Classique", "Classic")], [24, tr("Détaillé", "Detailed")]].map(([size, label]) => <button type="button" key={size} className={imageSettings.width === size && imageSettings.height === size ? "active" : ""} aria-pressed={imageSettings.width === size && imageSettings.height === size} onClick={() => setImageSettings((current) => ({ ...current, width: Number(size), height: Number(size) }))}><b>{label}</b><small>{size} × {size}</small></button>)}</div></fieldset>
              <fieldset className="choice-field"><legend>{tr("Nombre de couleurs", "Number of colors")}</legend><div className="choice-cards compact-choices color-counts">{[4, 8, 12].map((count) => <button type="button" key={count} className={imageSettings.paletteSize === count ? "active" : ""} aria-pressed={imageSettings.paletteSize === count} onClick={() => updateImageSetting("paletteSize", count)}><b>{count}</b><small>{tr("couleurs", "colors")}</small></button>)}</div></fieldset>
              <details className="advanced-controls">
                <summary>{tr("Réglages avancés", "Advanced settings")}</summary>
                <div className="control-group dimensions"><label>{tr("Colonnes", "Columns")}<input type="number" min="8" max="64" value={imageSettings.width} onChange={(event) => updateImageSetting("width", Math.max(8, Math.min(64, Number(event.target.value))))}/></label><span>×</span><label>{tr("Lignes", "Rows")}<input type="number" min="8" max="64" value={imageSettings.height} onChange={(event) => updateImageSetting("height", Math.max(8, Math.min(64, Number(event.target.value))))}/></label></div>
                <label className="range-label palette-range"><span>{tr("Palette détaillée", "Detailed palette")} <b>{imageSettings.paletteSize} {tr("couleurs", "colors")}</b></span><input aria-label={tr("Nombre précis de couleurs", "Exact number of colors")} type="range" min="2" max="20" step="1" value={imageSettings.paletteSize} onChange={(event) => updateImageSetting("paletteSize", Number(event.target.value))}/><small>{tr("Plus de couleurs préservent les nuances, mais rendent le coloriage plus complexe.", "More colors preserve nuances but make coloring more complex.")}</small></label>
                <div className="control-group"><label>{tr("Cadrage", "Crop")}<select value={imageSettings.cropMode} onChange={(event) => updateImageSetting("cropMode", event.target.value as CropMode)}><option value="cover">{tr("Remplir et recadrer", "Fill and crop")}</option><option value="contain">{tr("Afficher en entier", "Show full image")}</option></select></label><label>{tr("Fond", "Background")}<input aria-label={tr("Couleur du fond transparent", "Transparent background color")} type="color" value={imageSettings.background} onChange={(event) => updateImageSetting("background", event.target.value)}/></label></div>
                {imageSettings.cropMode === "cover" ? <div className="focus-controls"><label className="range-label"><span>{tr("Position horizontale", "Horizontal position")} <b>{imageSettings.focusX}%</b></span><input type="range" min="0" max="100" value={imageSettings.focusX} onChange={(event) => updateImageSetting("focusX", Number(event.target.value))}/></label><label className="range-label"><span>{tr("Position verticale", "Vertical position")} <b>{imageSettings.focusY}%</b></span><input type="range" min="0" max="100" value={imageSettings.focusY} onChange={(event) => updateImageSetting("focusY", Number(event.target.value))}/></label></div> : null}
                {imageAdjustments.map(([key, label]) => <label className="range-label" key={key}><span>{label} <b>{imageSettings[key]}%</b></span><input type="range" min="50" max="160" value={imageSettings[key]} onChange={(event) => updateImageSetting(key, Number(event.target.value))}/></label>)}
                <label className="check-label"><input type="checkbox" checked={imageSettings.dither} onChange={(event) => updateImageSetting("dither", event.target.checked)}/> {tr("Texture pixelisée", "Pixel texture")} <small>{tr("Ajoute du détail aux transitions de couleur.", "Adds detail to color transitions.")}</small></label>
              </details>
              <button className="primary compact generate-button" disabled={!sourceDataUrl || processing} onClick={() => sourceDataUrl && void generateFromImage(sourceDataUrl, sourceName)}>{processing ? tr("Préparation…", "Processing…") : sourceDataUrl ? tr("Créer mon pixel art", "Create my pixel art") : tr("Choisis d’abord une photo", "Choose a photo first")}</button>
              {imageError ? <p className="form-error" role="alert">{imageError}</p> : null}
            </div>
          </div> : null}

          {mode === "text" ? <form className="idea-panel" onSubmit={(event) => { event.preventDefault(); void generateIdea(); }}>
            <div className="idea-intro"><span className="idea-spark">✦</span><div><h3>{tr("Décris simplement ton idée", "Simply describe your idea")}</h3><p>{tr("Mosaipix crée une vraie image, puis la transforme en grille de pixel art.", "Mosaipix creates a real image, then turns it into a pixel-art grid.")}</p></div></div>
            <label className="idea-prompt"><span>{tr("Ton idée", "Your idea")}</span><input ref={promptRef} value={prompt} onChange={(event) => { setPrompt(event.target.value); setIdeaNotice(""); setFreeImages([]); setFreeImageError(""); }} required minLength={2} maxLength={80} placeholder={tr("Une banane souriante, un chat astronaute…", "A smiling banana, an astronaut cat…")}/></label>
            <div className="prompt-suggestions" aria-label={tr("Exemples d’idées", "Example ideas")}>{(isFrench ? ["Une banane souriante", "Un chat astronaute", "Une petite maison fleurie"] : ["A smiling banana", "An astronaut cat", "A tiny flower-covered house"]).map((suggestion) => <button type="button" key={suggestion} onClick={() => { setPrompt(suggestion); setIdeaNotice(""); setFreeImages([]); setFreeImageError(""); }}>{suggestion}</button>)}</div>
            <fieldset className="choice-field"><legend>{tr("Ambiance", "Style")}</legend><div className="choice-cards">{ideaStyles.map(([value, label, description]) => <button type="button" key={value} className={ideaStyle === value ? "active" : ""} aria-pressed={ideaStyle === value} onClick={() => setIdeaStyle(value)}><b>{label}</b><small>{description}</small></button>)}</div></fieldset>
            <fieldset className="choice-field"><legend>{tr("Niveau de détail", "Level of detail")}</legend><div className="choice-cards compact-choices">{ideaDetails.map(([value, label, dimensions]) => <button type="button" key={value} className={ideaDetail === value ? "active" : ""} aria-pressed={ideaDetail === value} onClick={() => setIdeaDetail(value)}><b>{label}</b><small>{dimensions}</small></button>)}</div></fieldset>
            <button className="primary idea-generate" disabled={generatingIdea}>{generatingIdea ? tr("Mosaipix imagine puis pixelise…", "Mosaipix is imagining and pixelating…") : tr("Créer mon pixel art", "Create my pixel art")}<span aria-hidden="true">→</span></button>
            <p className="ai-note">{ideaRemaining === null
              ? tr("3 créations IA maximum par adresse réseau et par 24 h. Les images libres restent illimitées.", "Up to 3 AI creations per network address every 24 hours. Open images remain unlimited.")
              : tr(`${ideaRemaining} création${ideaRemaining > 1 ? "s" : ""} IA restante${ideaRemaining > 1 ? "s" : ""} pour ces 24 h.`, `${ideaRemaining} AI creation${ideaRemaining === 1 ? "" : "s"} left for these 24 hours.`)}</p>
            {ideaError ? <p className="form-error" role="alert">{ideaError}</p> : null}
            {ideaNotice ? <p className="form-notice" role="status">{ideaNotice}</p> : null}
            <div className="free-image-option">
              <span>{tr("Tu préfères partir d’une vraie image ?", "Would you rather start from an existing image?")}</span>
              <button type="button" className="quiet-button" disabled={searchingFreeImages} onClick={() => void searchFreeImages()}>{searchingFreeImages ? tr("Recherche…", "Searching…") : tr("Voir 3 images libres", "See 3 open images")}</button>
            </div>
            {freeImageError ? <p className="form-error" role="alert">{freeImageError}</p> : null}
            {freeImages.length > 0 ? <div className="free-image-results" aria-label={tr("Images libres proposées", "Suggested open images")}>
              {freeImages.map((image) => <article key={image.id}>
                <button type="button" className="free-image-select" disabled={choosingFreeImage !== null} onClick={() => void chooseFreeImage(image)} aria-label={tr(`Utiliser ${image.title}`, `Use ${image.title}`)}>
                  <span className="free-image-thumbnail"><NextImage src={image.previewUrl} alt="" fill sizes="(max-width: 600px) 100vw, 240px" unoptimized /></span>
                  <strong>{choosingFreeImage === image.id ? tr("Chargement…", "Loading…") : image.title}</strong>
                </button>
                <small>{image.creator} · {image.sourceUrl ? <a href={image.sourceUrl} target="_blank" rel="noreferrer">{tr("source", "source")}</a> : null} {image.licenseUrl ? <a href={image.licenseUrl} target="_blank" rel="noreferrer">{image.license}</a> : image.license}</small>
              </article>)}
              <p>{tr("Résultats fournis par Openverse. Choisis une image pour régler sa transformation.", "Results provided by Openverse. Choose an image to adjust its conversion.")}</p>
            </div> : null}
          </form> : null}
        </div>

        {hasActiveProject ? <div id="editor" className={`editor-card ${editorExpanded ? "editor-focus" : ""}`}>
          <aside className="tools" aria-label={tr("Outils de dessin", "Drawing tools")}>
            <div><span className="label">{tr("DESSINER", "DRAW")}</span><div className="drawing-tools primary-tools">{primaryTools.map(([value, icon, label]) => <button key={value} className={tool === value ? "active" : ""} aria-pressed={tool === value} onClick={() => setTool(value)}><span>{icon}</span>{label}</button>)}</div><details className="secondary-tools"><summary>{tr("Plus d’outils", "More tools")}</summary><div className="drawing-tools">{advancedTools.map(([value, icon, label]) => <button key={value} className={tool === value ? "active" : ""} aria-pressed={tool === value} onClick={() => setTool(value)}><span>{icon}</span>{label}</button>)}</div></details></div>
            <div><span className="label">{tr("CHOISIS UNE COULEUR", "CHOOSE A COLOR")}</span><div className="palette">{project.palette.map((color, index) => <button key={`${index}-${color}`} className={selected === index ? "swatch selected" : "swatch"} style={{ background: color }} aria-label={`${tr("Couleur", "Color")} ${index + 1}, ${color}`} aria-pressed={selected === index} onClick={() => { setSelected(index); setTool("pencil"); }}><span>{index + 1}</span></button>)}</div><details className="palette-settings"><summary>{tr("Modifier cette couleur", "Edit this color")}</summary><label className="color-editor">{tr("Couleur", "Color")} {selected + 1}<input type="color" value={project.palette[selected]} onChange={(event) => changePaletteColor(event.target.value)}/></label></details></div>
            <div><span className="label">{tr("TA PROGRESSION", "YOUR PROGRESS")}</span><div className="progress-label"><b>{progress}%</b><span>{correct} {tr("cases justes", "correct cells")} · {filled} {tr("coloriées", "colored")}</span></div><div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><i style={{ width: `${progress}%` }}/></div></div>
            <div className="history-actions"><button disabled={undoStack.length === 0} onClick={undo}>↶ {tr("Annuler", "Undo")}</button><button disabled={redoStack.length === 0} onClick={redo}>↷ {tr("Rétablir", "Redo")}</button></div>
            <button className="download-primary" onClick={() => exportPng("current")}>↓ {filled === 0 ? tr("Télécharger le modèle", "Download the pattern") : tr("Télécharger mon coloriage", "Download my coloring")}</button>
            <div className="paper-export"><span className="label">{tr("VERSION PAPIER", "PAPER VERSION")}</span><div className="paper-actions"><button onClick={() => exportPng("printable")}>↓ {tr("Télécharger la grille", "Download grid")}</button><button onClick={printPrintableGrid}>{tr("Imprimer", "Print")}</button></div><p>{tr("Cases numérotées et légende des couleurs incluses.", "Numbered cells and color key included.")}</p></div>
            <details className="export-menu"><summary>{tr("Autres actions", "More actions")}</summary><div className="tool-actions"><button onClick={() => exportPng("complete")}>{tr("Télécharger le modèle terminé", "Download completed pattern")}</button><button className={resetPending ? "danger" : ""} onBlur={() => setResetPending(false)} onClick={requestReset}>{resetPending ? tr("Confirmer l’effacement", "Confirm reset") : tr("Recommencer le coloriage", "Start coloring over")}</button></div></details>
          </aside>

          <section className="canvas-wrap"><header><div><span className="status-dot"/> {progress === 100 ? tr("TERMINÉ", "DONE") : tr("EN COURS", "IN PROGRESS")}</div><b>{projectName}</b><span>{project.width} × {project.height}</span></header>
            <div className="editor-creation-actions">
              {creationSource === "text" && prompt.trim() ? <button disabled={generatingIdea} onClick={() => void generateIdea()}>↻ {generatingIdea ? tr("Création…", "Creating…") : tr("Nouvelle variante", "New variation")}</button> : null}
              {creationSource === "image" && sourceDataUrl ? <button disabled={processing} onClick={() => void generateFromImage(sourceDataUrl, sourceName)}>↻ {processing ? tr("Création…", "Creating…") : tr("Recréer avec ces réglages", "Recreate with these settings")}</button> : null}
              {creationSource === "text" || creationSource === "image" ? <button onClick={editCreationSource}>✎ {tr("Modifier la source", "Edit source")}</button> : null}
            </div>
            <MobileEditorToolbar
              locale={locale}
              tool={tool}
              palette={project.palette}
              selected={selected}
              progress={progress}
              undoDisabled={undoStack.length === 0}
              redoDisabled={redoStack.length === 0}
              downloadLabel={filled === 0 ? tr("Télécharger le modèle", "Download the pattern") : tr("Télécharger mon coloriage", "Download my coloring")}
              onTool={setTool}
              onColor={(index) => { setSelected(index); setTool("pencil"); }}
              onUndo={undo}
              onRedo={redo}
              onDownload={() => exportPng("current")}
            />
            <div className="canvas-quick-actions"><button onClick={fitGrid}>{tr("Ajuster à l’écran", "Fit to screen")}</button><button className="expand-editor" onClick={() => setEditorExpanded((current) => !current)}>{editorExpanded ? tr("Fermer le plein écran", "Exit full screen") : tr("Plein écran", "Full screen")}</button><details className="view-settings"><summary>{tr("Affichage", "View")}</summary><div className="view-controls"><div className="zoom-buttons"><button aria-label={tr("Réduire le zoom", "Zoom out")} onClick={() => changeZoom(-10)}>−</button><b>{zoom}%</b><button aria-label={tr("Augmenter le zoom", "Zoom in")} onClick={() => changeZoom(10)}>+</button></div><label>Zoom <input type="range" min="25" max="200" step="5" value={zoom} onChange={(event) => setZoom(Number(event.target.value))}/><b>{zoom}%</b></label><label>{tr("Aide", "Guide")} <input type="range" min="0" max="100" step="5" value={referenceOpacity} onChange={(event) => setReferenceOpacity(Number(event.target.value))}/><b>{referenceOpacity}%</b></label><label className="toggle"><input type="checkbox" checked={showNumbers} onChange={(event) => setShowNumbers(event.target.checked)}/> {tr("Numéros", "Numbers")}</label><label className="toggle"><input type="checkbox" checked={showGrid} onChange={(event) => setShowGrid(event.target.checked)}/> {tr("Traits", "Grid lines")}</label></div></details></div>
            <div className="coordinate-bar" aria-live="polite">{cursorCoordinates}<span>{tr("Fais défiler pour explorer les grandes grilles.", "Scroll to explore larger grids.")}</span></div>
            <div ref={gridViewportRef} className="pixel-grid-viewport"><div className={`pixel-grid ${showGrid ? "with-grid" : "without-grid"}`} style={gridStyle} role="grid" aria-label={tr("Grille de coloriage", "Coloring grid")} aria-rowcount={project.height} aria-colcount={project.width} onPointerMove={handlePointerMove} onPointerLeave={() => { drawingRef.current = false; setHoveredIndex(null); }}>
              {project.targets.map((target, index) => {
                const paintedIndex = painted[index];
                const correctCell = paintedIndex === target;
                const x = index % project.width + 1;
                const y = Math.floor(index / project.width) + 1;
                const cellLabel = isFrench
                  ? `Colonne ${x}, ligne ${y}. Couleur cible ${target + 1}${paintedIndex === null ? ", vide" : correctCell ? ", correcte" : ", incorrecte"}`
                  : `Column ${x}, row ${y}. Target color ${target + 1}${paintedIndex === null ? ", empty" : correctCell ? ", correct" : ", incorrect"}`;
                return <button key={index} data-index={index} role="gridcell" tabIndex={focusedCell === index ? 0 : -1} className={correctCell ? "correct" : paintedIndex === null ? "empty" : "incorrect"} aria-label={cellLabel} onKeyDown={(event) => handleGridKeys(event, index)} onFocus={() => setFocusedCell(index)} onPointerDown={(event) => handlePointerDown(event, index)} onPointerEnter={() => setHoveredIndex(index)} style={{ background: paintedIndex === null ? "#ffffff" : project.palette[paintedIndex] }}><span className="cell-hint" style={{ "--pixel-color": project.palette[target] } as CSSProperties}>{showNumbers ? target + 1 : ""}</span></button>;
              })}
            </div></div>
          </section>
        </div> : null}
      </div></section>

      <section className="seo-copy shell" aria-labelledby="seo-copy-title">
        <span className="eyebrow">{tr("PIXEL ART À COLORIER", "PIXEL ART COLORING")}</span>
        <h2 id="seo-copy-title">{tr("Crée, colorie et imprime ton pixel art", "Create, color and print your pixel art")}</h2>
        <div>
          <p>{tr("Mosaipix transforme gratuitement une photo, une idée ou l’un de ses 24 modèles en grille de pixel art numérotée. Choisis le niveau de détail et le nombre de couleurs, puis colorie directement dans ton navigateur.", "Mosaipix turns a photo, an idea or one of its 24 patterns into a numbered pixel art grid for free. Choose the level of detail and number of colors, then color directly in your browser.")}</p>
          <p>{tr("Tu peux télécharger le résultat ou imprimer une grille vierge avec sa légende. Tes photos et tes projets restent sur ton appareil, et les modèles continuent de fonctionner hors connexion.", "Download the result or print a blank grid with its color key. Your photos and projects stay on your device, and the pattern library keeps working offline.")}</p>
        </div>
      </section>

      <section className="how shell" id="how"><div className="section-heading"><span className="eyebrow">{tr("AUSSI SIMPLE QUE ÇA", "IT'S THAT SIMPLE")}</span><h2>{tr("Imagine, crée, colorie", "Imagine, create, color")}</h2></div><div className="steps"><article><div className="step-visual"><span className="step-number">01</span><i>✦</i></div><h3>{tr("Imagine", "Imagine")}</h3><p>{tr("Décris une idée, choisis une photo ou pars d’un modèle.", "Describe an idea, choose a photo, or start from a template.")}</p></article><article><div className="step-visual"><span className="step-number">02</span><i>▦</i></div><h3>{tr("Découvre", "Discover")}</h3><p>{tr("Mosaipix prépare automatiquement une grille pixel art et une palette claires.", "Mosaipix automatically builds a clear pixel-art grid and palette.")}</p></article><article><div className="step-visual"><span className="step-number">03</span><i>✎</i></div><h3>{tr("Colorie", "Color")}</h3><p>{tr("Suis les numéros, personnalise les couleurs et garde ta création.", "Follow the numbers, customize the colors, and save your creation.")}</p></article></div></section>
      <footer><div className="shell"><a className="brand" href="#top"><Brand /></a><p>{tr("Chaque petit carré a désormais une vraie raison d’être.", "Every little square now has a reason to be.")}</p><span>© 2026 Mosaipix</span></div></footer>
    </main>
  );
}
