"use client";

import NextImage from "next/image";
import Link from "next/link";
import {
  type ChangeEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import ImageCropper from "@/components/ImageCropper";
import ExportSheet from "@/components/ExportSheet";
import PixelMiniature from "@/components/PixelMiniature";
import PixelCanvas from "@/components/PixelCanvas";
import PixelRenderPreview from "@/components/PixelRenderPreview";
import MobileEditorToolbar from "@/components/MobileEditorToolbar";
import TemplateLibrary from "@/components/TemplateLibrary";
import { hasNetworkConnection } from "@/lib/connectivity";
import { getCropRect } from "@/lib/crop-geometry";
import { type PixelProject, type Rgb, quantizePixels } from "@/lib/pixel-art";
import { getLocalizedProjectName, heroTemplate, type Locale } from "@/lib/templates";

type Mode = "templates" | "image" | "text";
type Tool = "pan" | "pencil" | "eraser" | "picker" | "fill";
type CropMode = "cover" | "contain";
type IdeaStyle = "cute" | "retro" | "minimal";
type IdeaDetail = "simple" | "classic" | "detailed";
type CreationSource = "text" | "image" | "template" | "saved";
type WorkflowStep = "source" | "crop" | "settings" | "editor";
type GridFormat = "square" | "portrait" | "landscape" | "custom";
type GridDetail = "simple" | "classic" | "detailed";
type RenderPreviewMode = "pixel" | "original";
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
  cropZoom: number;
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
  ["pan", "✋", "Déplacer"],
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
  cropZoom: 1,
  brightness: 100,
  contrast: 108,
  saturation: 110,
  background: "#ffffff",
  dither: false,
};

const GRID_PRESETS: Record<Exclude<GridFormat, "custom">, Record<GridDetail, [number, number]>> = {
  square: { simple: [16, 16], classic: [24, 24], detailed: [32, 32] },
  portrait: { simple: [16, 20], classic: [24, 30], detailed: [32, 40] },
  landscape: { simple: [20, 16], classic: [30, 24], detailed: [40, 32] },
};

type WorkflowAction =
  | { type: "mode"; mode: Mode }
  | { type: "step"; step: WorkflowStep };

function workflowReducer(state: { mode: Mode; step: WorkflowStep }, action: WorkflowAction) {
  if (action.type === "mode") return { ...state, mode: action.mode, step: "source" as const };
  return { ...state, step: action.step };
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

async function createPixelProject(dataUrl: string, name: string, settings: ImageSettings, errorMessage: string): Promise<PixelProject> {
  const image = await loadBrowserImage(dataUrl, errorMessage);
  const canvas = document.createElement("canvas");
  canvas.width = settings.width;
  canvas.height = settings.height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error(errorMessage);

  context.fillStyle = settings.background;
  context.fillRect(0, 0, settings.width, settings.height);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.filter = `brightness(${settings.brightness}%) contrast(${settings.contrast}%) saturate(${settings.saturation}%)`;

  const cropWidth = image.width;
  const cropHeight = image.height;
  if (settings.cropMode === "cover") {
    const selectedCrop = getCropRect(cropWidth, cropHeight, settings.width / settings.height, {
      focusX: settings.focusX,
      focusY: settings.focusY,
      zoom: settings.cropZoom,
    });
    context.drawImage(image, selectedCrop.x, selectedCrop.y, selectedCrop.width, selectedCrop.height, 0, 0, settings.width, settings.height);
  } else {
    const scale = Math.min(settings.width / cropWidth, settings.height / cropHeight);
    const drawWidth = cropWidth * scale;
    const drawHeight = cropHeight * scale;
    context.drawImage(image, 0, 0, cropWidth, cropHeight, (settings.width - drawWidth) / 2, (settings.height - drawHeight) / 2, drawWidth, drawHeight);
  }
  context.filter = "none";

  const data = context.getImageData(0, 0, settings.width, settings.height).data;
  const pixels: Rgb[] = Array.from({ length: settings.width * settings.height }, (_, index) => [
    data[index * 4],
    data[index * 4 + 1],
    data[index * 4 + 2],
  ]);
  const quantized = quantizePixels(pixels, settings.width, settings.paletteSize, settings.dither);
  return {
    version: 2,
    name,
    width: settings.width,
    height: settings.height,
    palette: quantized.palette,
    targets: quantized.indices,
  };
}

export default function PixelStudio({ initialLocale = "fr" }: { initialLocale?: Locale }) {
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const [workflow, dispatchWorkflow] = useReducer(workflowReducer, { mode: "text", step: "source" });
  const mode = workflow.mode;
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
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [resetPending, setResetPending] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [resumeAvailable, setResumeAvailable] = useState(false);
  const [shouldPersistProject, setShouldPersistProject] = useState(false);
  const [creationSource, setCreationSource] = useState<CreationSource | null>(null);
  const [gridFormat, setGridFormat] = useState<GridFormat>("square");
  const [gridDetail, setGridDetail] = useState<GridDetail>("classic");
  const [previewMode, setPreviewMode] = useState<RenderPreviewMode>("pixel");
  const [previewProject, setPreviewProject] = useState<PixelProject | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [advancedSettingsOpen, setAdvancedSettingsOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [saveState, setSaveState] = useState<"saving" | "saved">("saved");
  const fileRef = useRef<HTMLInputElement>(null);
  const promptRef = useRef<HTMLInputElement>(null);
  const hasActiveProject = workflow.step === "editor";
  const closeExport = useCallback(() => setExportOpen(false), []);

  function setMode(nextMode: Mode) {
    dispatchWorkflow({ type: "mode", mode: nextMode });
  }

  function applyGridPreset(format: Exclude<GridFormat, "custom">, detail = gridDetail) {
    const [width, height] = GRID_PRESETS[format][detail];
    setGridFormat(format);
    setGridDetail(detail);
    setImageSettings((current) => ({ ...current, width, height }));
  }

  function applyDetailPreset(detail: GridDetail) {
    const format = gridFormat === "custom"
      ? imageSettings.width === imageSettings.height
        ? "square"
        : imageSettings.width > imageSettings.height ? "landscape" : "portrait"
      : gridFormat;
    applyGridPreset(format, detail);
  }

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
    if (!hydrated || !shouldPersistProject) return;
    setSaveState("saving");
    const timeout = window.setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ project, painted }));
        setSaveState("saved");
      } catch {
        // A full localStorage should never interrupt drawing.
      }
    }, 450);
    return () => window.clearTimeout(timeout);
  }, [hydrated, painted, project, shouldPersistProject]);

  useEffect(() => {
    if (workflow.step !== "settings" || !sourceDataUrl) return;
    let cancelled = false;
    setPreviewLoading(true);
    const timeout = window.setTimeout(() => {
      void createPixelProject(
        sourceDataUrl,
        sourceName,
        imageSettings,
        locale === "fr" ? "Impossible de préparer l’aperçu." : "The preview could not be prepared.",
      ).then((nextProject) => {
        if (!cancelled) setPreviewProject(nextProject);
      }).catch((error: unknown) => {
        if (!cancelled) setImageError(error instanceof Error ? error.message : locale === "fr" ? "Impossible de préparer l’aperçu." : "The preview could not be prepared.");
      }).finally(() => {
        if (!cancelled) setPreviewLoading(false);
      });
    }, 140);
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [imageSettings, locale, sourceDataUrl, sourceName, workflow.step]);

  const filled = painted.reduce<number>((total, value) => total + (value === null ? 0 : 1), 0);
  const correct = painted.reduce<number>((total, value, index) => total + (value === project.targets[index] ? 1 : 0), 0);
  const progress = correct === 0 ? 0 : Math.max(1, Math.round(correct / project.targets.length * 100));
  const cursorCoordinates = hoveredIndex === null
    ? locale === "fr" ? "Sélectionne une case" : "Select a cell"
    : locale === "fr"
      ? `Colonne ${hoveredIndex % project.width + 1}, ligne ${Math.floor(hoveredIndex / project.width) + 1}`
      : `Column ${hoveredIndex % project.width + 1}, row ${Math.floor(hoveredIndex / project.width) + 1}`;
  function clearHistory() {
    setUndoStack([]);
    setRedoStack([]);
  }

  function loadProject(next: PixelProject, source: CreationSource) {
    setProject(next);
    setPainted(Array(next.targets.length).fill(null));
    setSelected(Math.min(1, next.palette.length - 1));
    clearHistory();
    setResetPending(false);
    setResumeAvailable(false);
    setShouldPersistProject(true);
    setCreationSource(source);
    dispatchWorkflow({ type: "step", step: "editor" });
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

  function handleCanvasStrokeStart(index: number) {
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
    paintCell(index);
  }

  function handleCanvasStrokeMove(index: number) {
    if (tool === "pencil" || tool === "eraser") paintCell(index);
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
        cropZoom: 1,
        contrast: 112,
        saturation: 108,
        dither: false,
      };
      setImageSettings(settings);
      setSourceDataUrl(dataUrl);
      setSourceName(cleanPrompt);
      setFreeImageCredit(null);
      setGridFormat("square");
      setGridDetail(ideaDetail);
      setCreationSource("text");
      dispatchWorkflow({ type: "step", step: "crop" });
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
      setCreationSource("image");
      dispatchWorkflow({ type: "step", step: "crop" });
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
      const nextProject = await createPixelProject(
        dataUrl,
        name,
        settings,
        locale === "fr" ? "Impossible de lire cette image." : "This image could not be read.",
      );
      loadProject(nextProject, source);
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
      setCreationSource("image");
      dispatchWorkflow({ type: "step", step: "crop" });
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

  function createA4PrintableDataUrl() {
    const portrait = project.height >= project.width;
    const pageWidth = portrait ? 1240 : 1754;
    const pageHeight = portrait ? 1754 : 1240;
    const margin = 56;
    const legendSpace = portrait ? 210 : 285;
    const gridAreaWidth = pageWidth - margin * 2 - (portrait ? 0 : legendSpace);
    const gridAreaHeight = pageHeight - margin * 2 - (portrait ? legendSpace : 0);
    const cell = Math.max(4, Math.floor(Math.min(gridAreaWidth / project.width, gridAreaHeight / project.height)));
    const gridWidth = project.width * cell;
    const gridHeight = project.height * cell;
    const gridX = margin + Math.floor((gridAreaWidth - gridWidth) / 2);
    const gridY = margin + Math.floor((gridAreaHeight - gridHeight) / 2);
    const canvas = document.createElement("canvas");
    canvas.width = pageWidth;
    canvas.height = pageHeight;
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, pageWidth, pageHeight);

    project.targets.forEach((target, index) => {
      const x = gridX + (index % project.width) * cell;
      const y = gridY + Math.floor(index / project.width) * cell;
      context.strokeStyle = "#85818e";
      context.lineWidth = Math.max(1, cell / 22);
      context.strokeRect(x, y, cell, cell);
      if (cell >= 11) {
        context.fillStyle = "#272536";
        context.font = `700 ${Math.max(7, Math.floor(cell * 0.32))}px sans-serif`;
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillText(String(target + 1), x + cell / 2, y + cell / 2);
      }
    });

    const legendX = portrait ? margin : pageWidth - margin - legendSpace + 18;
    const legendY = portrait ? pageHeight - margin - legendSpace + 34 : margin + 28;
    const legendWidth = portrait ? pageWidth - margin * 2 : legendSpace - 28;
    const columns = portrait ? Math.min(5, project.palette.length) : Math.min(2, project.palette.length);
    const itemWidth = legendWidth / Math.max(1, columns);
    context.fillStyle = "#17162a";
    context.font = "800 23px sans-serif";
    context.textAlign = "left";
    context.fillText(tr("Légende des couleurs", "Color key"), legendX, legendY - 18);
    project.palette.forEach((color, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      const x = legendX + column * itemWidth;
      const y = legendY + row * 43;
      context.fillStyle = color;
      context.fillRect(x, y, 27, 27);
      context.strokeStyle = "#4b485a";
      context.lineWidth = 1;
      context.strokeRect(x, y, 27, 27);
      context.fillStyle = "#272536";
      context.font = "700 18px sans-serif";
      context.fillText(String(index + 1), x + 36, y + 20);
    });
    return canvas.toDataURL("image/png");
  }

  function createExportDataUrl(exportMode: "current" | "complete" | "printable") {
    if (exportMode === "printable") {
      const dataUrl = createA4PrintableDataUrl();
      return dataUrl ? { dataUrl, resolvedMode: "printable" as const } : null;
    }
    // A brand-new coloring has no painted cells. Export the generated model in
    // that case so the primary download can never produce a blank white image.
    const resolvedMode = exportMode === "current" && filled === 0 ? "complete" : exportMode;
    const cell = 32;
    const legendHeight = 0;
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

    });

    return { dataUrl: canvas.toDataURL("image/png"), resolvedMode };
  }

  function exportPng(exportMode: "current" | "complete" | "printable") {
    const exported = createExportDataUrl(exportMode);
    if (!exported) return;
    downloadDataUrl(exported.dataUrl, `${project.name || "mosaipix"}-${exported.resolvedMode}.png`);
  }

  function downloadDataUrl(dataUrl: string, filename: string) {
    const link = document.createElement("a");
    link.download = filename;
    link.href = dataUrl;
    link.click();
  }

  function dataUrlToFile(dataUrl: string, filename: string) {
    const [metadata, encoded] = dataUrl.split(",");
    const mimeType = metadata.match(/^data:([^;]+)/)?.[1] ?? "image/png";
    const binary = atob(encoded);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return new File([bytes], filename, { type: mimeType });
  }

  async function shareWithNativeApp(dataUrl: string, filename: string, text: string) {
    const capacitorWindow = window as Window & { Capacitor?: { isNativePlatform?: () => boolean } };
    if (!capacitorWindow.Capacitor?.isNativePlatform?.()) return false;
    try {
      const [{ Directory, Filesystem }, { Share }] = await Promise.all([
        import("@capacitor/filesystem"),
        import("@capacitor/share"),
      ]);
      const safeFilename = filename.replace(/[^a-zA-Z0-9._-]+/g, "-");
      const data = dataUrl.split(",")[1];
      const saved = await Filesystem.writeFile({
        path: `exports/${safeFilename}`,
        data,
        directory: Directory.Cache,
        recursive: true,
      });
      await Share.share({
        title: projectName,
        text,
        url: saved.uri,
        dialogTitle: tr("Enregistrer, imprimer ou partager", "Save, print, or share"),
      });
      return true;
    } catch {
      return false;
    }
  }

  async function saveOrSharePng(exportMode: "current" | "complete" | "printable") {
    const exported = createExportDataUrl(exportMode);
    if (!exported) return;
    const filename = `${project.name || "mosaipix"}-${exported.resolvedMode}.png`;
    const shareText = exportMode === "printable"
      ? tr("Grille Mosaipix prête à imprimer", "Mosaipix grid ready to print")
      : tr("Ma création Mosaipix", "My Mosaipix creation");
    if (await shareWithNativeApp(exported.dataUrl, filename, shareText)) return;
    const file = dataUrlToFile(exported.dataUrl, filename);
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: projectName,
          text: shareText,
        });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    downloadDataUrl(exported.dataUrl, filename);
  }

  function printPrintableGrid() {
    const exported = createExportDataUrl("printable");
    if (!exported) return;
    const capacitorWindow = window as Window & { Capacitor?: { isNativePlatform?: () => boolean } };
    if (capacitorWindow.Capacitor?.isNativePlatform?.() || /Android/i.test(navigator.userAgent)) {
      void saveOrSharePng("printable");
      return;
    }
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

  function editCreationSource() {
    if (sourceDataUrl && (creationSource === "text" || creationSource === "image")) {
      dispatchWorkflow({ type: "step", step: "crop" });
      return;
    }
    dispatchWorkflow({ type: "step", step: "source" });
    if (creationSource === "text") setMode("text");
    if (creationSource === "image") setMode("image");
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
    ["pan", "✋", "Pan"],
    ["pencil", "✎", "Pencil"],
    ["eraser", "◇", "Eraser"],
    ["picker", "⌾", "Picker"],
    ["fill", "▰", "Fill"],
  ];
  const primaryTools = toolOptions.slice(0, 3);
  const advancedTools = toolOptions.slice(3);
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
  const formatOptions: Array<[Exclude<GridFormat, "custom">, string, string]> = [
    ["square", tr("Carré", "Square"), tr("Idéal à l’écran", "Great on screen")],
    ["portrait", tr("Portrait", "Portrait"), tr("Pratique sur A4", "Works well on A4")],
    ["landscape", tr("Paysage", "Landscape"), tr("Pour les scènes larges", "For wide scenes")],
  ];
  const detailOptions: Array<[GridDetail, string]> = [
    ["simple", tr("Simple", "Simple")],
    ["classic", tr("Classique", "Classic")],
    ["detailed", tr("Détaillé", "Detailed")],
  ];
  const previewCells = imageSettings.width * imageSettings.height;
  const previewComplexity = previewCells * Math.max(1, imageSettings.paletteSize / 4);
  const previewDifficulty = previewComplexity <= 900
    ? tr("facile", "easy")
    : previewComplexity <= 3000 ? tr("équilibré", "balanced") : tr("expert", "expert");

  return (
    <main className={`studio-app step-${workflow.step}`}>
      <nav className="studio-topbar" aria-label={tr("Navigation du studio", "Studio navigation")}>
        <Link href={`/${locale}`} className="studio-home">← <span>Mosaipix</span></Link>
        <strong>{tr("Studio de création", "Creation studio")}</strong>
        <div className="language-switch" role="group" aria-label={tr("Langue", "Language")}>
          <Link href="/fr/studio" className={isFrench ? "active" : ""}>FR</Link>
          <Link href="/en/studio" className={!isFrench ? "active" : ""}>EN</Link>
        </div>
      </nav>

      <section className="studio-route" id="studio">
        <ol className="studio-stepper" aria-label={tr("Étapes de création", "Creation steps")}>
          {(["source", "crop", "settings", "editor"] as WorkflowStep[]).map((step, index) => {
            const labels = isFrench ? ["Source", "Cadrage", "Réglages", "Coloriage"] : ["Source", "Crop", "Settings", "Coloring"];
            const activeIndex = ["source", "crop", "settings", "editor"].indexOf(workflow.step);
            return <li key={step} className={workflow.step === step ? "active" : index < activeIndex ? "done" : ""}><span>{index + 1}</span>{labels[index]}</li>;
          })}
        </ol>

        {workflow.step === "source" ? <div className="studio-step source-step">
          <header className="studio-step-heading"><span className="eyebrow">{tr("ÉTAPE 1", "STEP 1")}</span><h1>{tr("Que veux-tu créer ?", "What do you want to create?")}</h1><p>{tr("Pars d’une idée, d’une photo ou d’un modèle prêt à colorier.", "Start from an idea, a photo, or a ready-to-color pattern.")}</p></header>

          {resumeAvailable ? <div className="resume-card">
            <PixelMiniature project={project} className="resume-preview" label={tr(`Aperçu de ${projectName}`, `Preview of ${projectName}`)} />
            <div><span className="eyebrow">{tr("PROJET SAUVEGARDÉ", "SAVED PROJECT")}</span><h3>{projectName}</h3><p>{project.width} × {project.height} · {project.palette.length} {tr("couleurs", "colors")}</p></div>
            <div className="resume-actions"><button className="primary compact" onClick={() => { setCreationSource("saved"); dispatchWorkflow({ type: "step", step: "editor" }); }}>{tr("Reprendre", "Resume")}</button><button className="quiet-button" onClick={() => setResumeAvailable(false)}>{tr("Créer autre chose", "Create something else")}</button></div>
          </div> : null}

          <div className="mode-tabs" role="tablist" aria-label={tr("Point de départ", "Starting point")} onKeyDown={handleModeKeys}>
            {modeOptions.map(([value, label]) => <button key={value} id={`mode-${value}`} role="tab" aria-selected={mode === value} aria-controls={`panel-${value}`} tabIndex={mode === value ? 0 : -1} className={mode === value ? "active" : ""} onClick={() => setMode(value)}>{label}</button>)}
          </div>

          <div className="source-panel" id={`panel-${mode}`} role="tabpanel" aria-labelledby={`mode-${mode}`}>
            {mode === "templates" ? <TemplateLibrary locale={locale} activeProjectName={undefined} onSelect={(item) => loadProject(item.project, "template")} /> : null}

            {mode === "image" ? <div className="image-source-card source-entry-card">
              <div className={`image-preview ${sourceDataUrl ? "has-image" : ""}`} style={sourceDataUrl ? { backgroundImage: `url(${sourceDataUrl})`, backgroundSize: "cover", backgroundPosition: "center", aspectRatio: "1" } : undefined} aria-label={sourceDataUrl ? tr(`Aperçu de ${sourceName}`, `Preview of ${sourceName}`) : tr("Aucune image sélectionnée", "No image selected")} role="img">{sourceDataUrl ? null : <span>{tr("Ta photo apparaîtra ici", "Your photo will appear here")}<br/><small>PNG, JPG {tr("ou", "or")} WebP</small></span>}</div>
              <div className="source-entry-copy"><h2>{tr("Choisis une photo", "Choose a photo")}</h2><p>{tr("Elle reste sur cet appareil. Tu pourras ensuite déplacer et zoomer l’image avant de la pixeliser.", "It stays on this device. You can then move and zoom the image before pixelating it.")}</p><button className="primary compact" onClick={() => fileRef.current?.click()}>{sourceDataUrl ? tr("Changer de photo", "Change photo") : tr("Choisir une photo", "Choose a photo")}</button>{sourceDataUrl ? <button className="quiet-button" onClick={() => dispatchWorkflow({ type: "step", step: "crop" })}>{tr("Continuer avec cette image", "Continue with this image")}</button> : null}</div>
              <input ref={fileRef} hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={importImage}/>
            </div> : null}

            {mode === "text" ? <form className="idea-panel" onSubmit={(event) => { event.preventDefault(); void generateIdea(); }}>
              <div className="idea-intro"><span className="idea-spark">✦</span><div><h3>{tr("Décris simplement ton idée", "Simply describe your idea")}</h3><p>{tr("Mosaipix crée une image, puis te laisse la cadrer avant de la transformer.", "Mosaipix creates an image, then lets you crop it before converting it.")}</p></div></div>
              <label className="idea-prompt"><span>{tr("Ton idée", "Your idea")}</span><input ref={promptRef} value={prompt} onChange={(event) => { setPrompt(event.target.value); setIdeaNotice(""); setFreeImages([]); setFreeImageError(""); }} required minLength={2} maxLength={80} placeholder={tr("Une banane souriante, un chat astronaute…", "A smiling banana, an astronaut cat…")}/></label>
              <div className="prompt-suggestions" aria-label={tr("Exemples d’idées", "Example ideas")}>{(isFrench ? ["Une banane souriante", "Un chat astronaute", "Une petite maison fleurie"] : ["A smiling banana", "An astronaut cat", "A tiny flower-covered house"]).map((suggestion) => <button type="button" key={suggestion} onClick={() => { setPrompt(suggestion); setIdeaNotice(""); setFreeImages([]); setFreeImageError(""); }}>{suggestion}</button>)}</div>
              <details className="idea-options advanced-controls">
                <summary>{tr("Personnaliser l’image", "Customize the image")}</summary>
                <fieldset className="choice-field"><legend>{tr("Ambiance", "Style")}</legend><div className="choice-cards">{ideaStyles.map(([value, label, description]) => <button type="button" key={value} className={ideaStyle === value ? "active" : ""} aria-pressed={ideaStyle === value} onClick={() => setIdeaStyle(value)}><b>{label}</b><small>{description}</small></button>)}</div></fieldset>
                <fieldset className="choice-field"><legend>{tr("Niveau de détail", "Level of detail")}</legend><div className="choice-cards compact-choices">{ideaDetails.map(([value, label, dimensions]) => <button type="button" key={value} className={ideaDetail === value ? "active" : ""} aria-pressed={ideaDetail === value} onClick={() => setIdeaDetail(value)}><b>{label}</b><small>{dimensions}</small></button>)}</div></fieldset>
              </details>
              <button className="primary idea-generate" disabled={generatingIdea}>{generatingIdea ? tr("Mosaipix imagine…", "Mosaipix is imagining…") : tr("Créer l’image", "Create the image")}<span aria-hidden="true">→</span></button>
              <p className="ai-note">{ideaRemaining === null ? tr("Seul le texte de ta demande est envoyé à l’IA, jamais tes photos. 3 créations maximum par adresse réseau et par 24 h.", "Only your written request is sent to AI, never your photos. Up to 3 creations per network address every 24 hours.") : tr(`${ideaRemaining} création${ideaRemaining > 1 ? "s" : ""} IA restante${ideaRemaining > 1 ? "s" : ""} pour ces 24 h.`, `${ideaRemaining} AI creation${ideaRemaining === 1 ? "" : "s"} left for these 24 hours.`)}</p>
              <p className="privacy-detail-link"><Link href={`/${locale}/${isFrench ? "confidentialite" : "privacy"}`}>{tr("Comment tes données sont protégées", "How your data is protected")} →</Link></p>
              {ideaError ? <p className="form-error" role="alert">{ideaError}</p> : null}
              {ideaNotice ? <p className="form-notice" role="status">{ideaNotice}</p> : null}
              <div className="free-image-option"><span>{tr("Tu préfères partir d’une vraie image ?", "Would you rather start from an existing image?")}</span><button type="button" className="quiet-button" disabled={searchingFreeImages} onClick={() => void searchFreeImages()}>{searchingFreeImages ? tr("Recherche…", "Searching…") : tr("Voir 3 images libres", "See 3 open images")}</button></div>
              {freeImageError ? <p className="form-error" role="alert">{freeImageError}</p> : null}
              {freeImages.length > 0 ? <div className="free-image-results" aria-label={tr("Images libres proposées", "Suggested open images")}>
                {freeImages.map((image) => <article key={image.id}><button type="button" className="free-image-select" disabled={choosingFreeImage !== null} onClick={() => void chooseFreeImage(image)} aria-label={tr(`Utiliser ${image.title}`, `Use ${image.title}`)}><span className="free-image-thumbnail"><NextImage src={image.previewUrl} alt="" fill sizes="(max-width: 600px) 100vw, 240px" unoptimized /></span><strong>{choosingFreeImage === image.id ? tr("Chargement…", "Loading…") : image.title}</strong></button><small>{image.creator} · {image.sourceUrl ? <a href={image.sourceUrl} target="_blank" rel="noreferrer">{tr("source", "source")}</a> : null} {image.licenseUrl ? <a href={image.licenseUrl} target="_blank" rel="noreferrer">{image.license}</a> : image.license}</small></article>)}
                <p>{tr("Résultats fournis par Openverse. Choisis une image pour régler sa transformation.", "Results provided by Openverse. Choose an image to adjust its conversion.")}</p>
              </div> : null}
            </form> : null}
          </div>
        </div> : null}

        {workflow.step === "crop" && sourceDataUrl ? <div className="studio-step crop-step">
          <header className="studio-step-heading"><span className="eyebrow">{tr("ÉTAPE 2", "STEP 2")}</span><h1>{tr("Cadre ton image", "Crop your image")}</h1><p>{tr("Le cadre suit automatiquement la forme de ta future grille.", "The frame automatically matches the shape of your future grid.")}</p></header>
          <div className="crop-layout">
            <ImageCropper dataUrl={sourceDataUrl} name={sourceName} ratio={imageSettings.width / imageSettings.height} locale={locale} transform={{ focusX: imageSettings.focusX, focusY: imageSettings.focusY, zoom: imageSettings.cropZoom }} onChange={(next) => setImageSettings((current) => ({ ...current, focusX: next.focusX, focusY: next.focusY, cropZoom: next.zoom }))}/>
            <aside className="crop-format-panel crop-format-minimal">
              <fieldset className="choice-field"><legend>{tr("Forme de la grille", "Grid shape")}</legend><div className="choice-cards compact-choices">{formatOptions.map(([format, label, description]) => <button type="button" key={format} className={gridFormat === format ? "active" : ""} aria-pressed={gridFormat === format} onClick={() => applyGridPreset(format)}><b>{label}</b><small>{description}</small></button>)}</div></fieldset>
              <p className="crop-format-note">{tr("La finesse et les couleurs se règlent juste après, avec le résultat sous les yeux.", "Detail and colors come next, with the result always in view.")}</p>
            </aside>
          </div>
          <div className="studio-step-actions"><button className="quiet-button" onClick={() => dispatchWorkflow({ type: "step", step: "source" })}>← {tr("Changer de source", "Change source")}</button><button className="primary compact" onClick={() => dispatchWorkflow({ type: "step", step: "settings" })}>{tr("Continuer vers les réglages", "Continue to settings")} →</button></div>
        </div> : null}

        {workflow.step === "settings" && sourceDataUrl ? <div className="studio-step settings-step">
          <header className="studio-step-heading"><span className="eyebrow">{tr("ÉTAPE 3", "STEP 3")}</span><h1>{tr("Prévisualise et ajuste", "Preview and adjust")}</h1><p>{tr("Le rendu ci-dessous est le vrai pixel art. Chaque réglage est visible immédiatement.", "The result below is the real pixel art. Every adjustment is visible immediately.")}</p></header>
          <div className={`settings-layout live-settings-layout ${advancedSettingsOpen ? "advanced-tuning" : ""}`}>
            <section className="settings-preview live-render-card" aria-labelledby="render-preview-title">
              <div className="preview-card-heading">
                <div><span className="eyebrow">{tr("APERÇU RÉEL", "LIVE PREVIEW")}</span><h2 id="render-preview-title">{sourceName}</h2></div>
                <div className="preview-mode-switch" role="group" aria-label={tr("Type d’aperçu", "Preview type")}>
                  <button type="button" className={previewMode === "original" ? "active" : ""} aria-pressed={previewMode === "original"} onClick={() => setPreviewMode("original")}>{tr("Original", "Original")}</button>
                  <button type="button" className={previewMode === "pixel" ? "active" : ""} aria-pressed={previewMode === "pixel"} onClick={() => setPreviewMode("pixel")}>{tr("Pixel art", "Pixel art")}</button>
                </div>
              </div>
              <div className={`live-preview-stage ${previewLoading ? "loading" : ""}`}>
                {previewMode === "original"
                  ? <ImageCropper dataUrl={sourceDataUrl} name={sourceName} ratio={imageSettings.width / imageSettings.height} locale={locale} transform={{ focusX: imageSettings.focusX, focusY: imageSettings.focusY, zoom: imageSettings.cropZoom }} onChange={(next) => setImageSettings((current) => ({ ...current, focusX: next.focusX, focusY: next.focusY, cropZoom: next.zoom }))}/>
                  : previewProject ? <PixelRenderPreview project={previewProject} label={tr(`Aperçu pixelisé de ${sourceName}`, `Pixelated preview of ${sourceName}`)} /> : <div className="preview-placeholder">{tr("Préparation de l’aperçu…", "Preparing preview…")}</div>}
                {previewLoading ? <span className="preview-updating" role="status">{tr("Mise à jour…", "Updating…")}</span> : null}
              </div>
              <div className="render-facts">
                <b>{imageSettings.width} × {imageSettings.height}</b>
                <span>{imageSettings.paletteSize} {tr("couleurs", "colors")}</span>
                <span>{previewCells} {tr("cases", "cells")}</span>
                <em>{previewDifficulty}</em>
              </div>
              {previewProject ? <div className="preview-palette" aria-label={tr("Palette calculée", "Generated palette")}>{previewProject.palette.map((color, index) => <span key={`${color}-${index}`} style={{ background: color }} title={`${index + 1} · ${color}`} />)}</div> : null}
            </section>
            <div className="image-controls simple-panel live-controls-panel">
              <fieldset className="choice-field"><legend>{tr("Niveau de détail", "Level of detail")}</legend><div className="choice-cards compact-choices detail-counts">{detailOptions.map(([detail, label]) => { const presetFormat = gridFormat === "custom" ? (imageSettings.width === imageSettings.height ? "square" : imageSettings.width > imageSettings.height ? "landscape" : "portrait") : gridFormat; const dimensions = GRID_PRESETS[presetFormat][detail]; return <button type="button" key={detail} className={gridDetail === detail && gridFormat !== "custom" ? "active" : ""} aria-pressed={gridDetail === detail && gridFormat !== "custom"} onClick={() => applyDetailPreset(detail)}><b>{label}</b><small>{dimensions.join(" × ")}</small></button>; })}</div></fieldset>
              <fieldset className="choice-field"><legend>{tr("Nombre de couleurs", "Number of colors")}</legend><div className="choice-cards compact-choices color-counts">{[4, 8, 12].map((count) => <button type="button" key={count} className={imageSettings.paletteSize === count ? "active" : ""} aria-pressed={imageSettings.paletteSize === count} onClick={() => updateImageSetting("paletteSize", count)}><b>{count}</b><small>{tr("couleurs", "colors")}</small></button>)}</div></fieldset>
              <details className="advanced-controls" onToggle={(event) => setAdvancedSettingsOpen(event.currentTarget.open)}>
                <summary>{tr("Réglages avancés", "Advanced settings")}</summary>
                <div className="control-group dimensions"><label>{tr("Colonnes", "Columns")}<input type="number" min="8" max="64" value={imageSettings.width} onChange={(event) => { setGridFormat("custom"); updateImageSetting("width", Math.max(8, Math.min(64, Number(event.target.value)))); }}/></label><span>×</span><label>{tr("Lignes", "Rows")}<input type="number" min="8" max="64" value={imageSettings.height} onChange={(event) => { setGridFormat("custom"); updateImageSetting("height", Math.max(8, Math.min(64, Number(event.target.value)))); }}/></label><button type="button" className="swap-dimensions" onClick={() => { setGridFormat("custom"); setImageSettings((current) => ({ ...current, width: current.height, height: current.width })); }}>⇄ {tr("Permuter", "Swap")}</button></div>
                <label className="range-label palette-range"><span>{tr("Palette détaillée", "Detailed palette")} <b>{imageSettings.paletteSize} {tr("couleurs", "colors")}</b></span><input aria-label={tr("Nombre précis de couleurs", "Exact number of colors")} type="range" min="2" max="20" step="1" value={imageSettings.paletteSize} onChange={(event) => updateImageSetting("paletteSize", Number(event.target.value))}/><small>{tr("Plus de couleurs préservent les nuances, mais rendent le coloriage plus complexe.", "More colors preserve nuances but make coloring more complex.")}</small></label>
                <div className="control-group"><label>{tr("Cadrage", "Crop")}<select value={imageSettings.cropMode} onChange={(event) => updateImageSetting("cropMode", event.target.value as CropMode)}><option value="cover">{tr("Remplir et recadrer", "Fill and crop")}</option><option value="contain">{tr("Afficher en entier", "Show full image")}</option></select></label><label>{tr("Fond", "Background")}<input aria-label={tr("Couleur du fond transparent", "Transparent background color")} type="color" value={imageSettings.background} onChange={(event) => updateImageSetting("background", event.target.value)}/></label></div>
                {imageAdjustments.map(([key, label]) => <label className="range-label" key={key}><span>{label} <b>{imageSettings[key]}%</b></span><input type="range" min="50" max="160" value={imageSettings[key]} onChange={(event) => updateImageSetting(key, Number(event.target.value))}/></label>)}
                <label className="check-label"><input type="checkbox" checked={imageSettings.dither} onChange={(event) => updateImageSetting("dither", event.target.checked)}/> {tr("Texture pixelisée", "Pixel texture")} <small>{tr("Ajoute du détail aux transitions de couleur.", "Adds detail to color transitions.")}</small></label>
              </details>
              <button className="primary compact generate-button" disabled={processing || previewLoading || !previewProject} onClick={() => previewProject ? loadProject(previewProject, creationSource ?? "image") : void generateFromImage(sourceDataUrl, sourceName, imageSettings, creationSource ?? "image")}>{processing || previewLoading ? tr("Mise à jour…", "Updating…") : tr("Utiliser ce rendu", "Use this result")}</button>
              {imageError ? <p className="form-error" role="alert">{imageError}</p> : null}
            </div>
          </div>
          <div className="studio-step-actions"><button className="quiet-button" onClick={() => dispatchWorkflow({ type: "step", step: "crop" })}>← {tr("Revoir le cadrage", "Review crop")}</button></div>
        </div> : null}

        {hasActiveProject ? <div id="editor" className="editor-card studio-editor">
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
              exportLabel={tr("Exporter", "Export")}
              onTool={setTool}
              onColor={(index) => { setSelected(index); setTool("pencil"); }}
              onUndo={undo}
              onRedo={redo}
              onExport={() => setExportOpen(true)}
            />
            <div className="canvas-quick-actions"><button onClick={editCreationSource}>← {tr("Modifier la création", "Edit creation")}</button><button className="quick-export-button" onClick={() => setExportOpen(true)}>↗ {tr("Exporter", "Export")}</button><details className="view-settings"><summary>{tr("Affichage", "View")}</summary><div className="view-controls"><label>{tr("Aide", "Guide")} <input type="range" min="0" max="100" step="5" value={referenceOpacity} onChange={(event) => setReferenceOpacity(Number(event.target.value))}/><b>{referenceOpacity}%</b></label><label className="toggle"><input type="checkbox" checked={showNumbers} onChange={(event) => setShowNumbers(event.target.checked)}/> {tr("Numéros", "Numbers")}</label><label className="toggle"><input type="checkbox" checked={showGrid} onChange={(event) => setShowGrid(event.target.checked)}/> {tr("Traits", "Grid lines")}</label></div></details></div>
            <div className="coordinate-bar" aria-live="polite">{cursorCoordinates}<span>{tr("Pince pour zoomer ou utilise l’outil main pour déplacer.", "Pinch to zoom or use the hand tool to pan.")}</span></div>
            <PixelCanvas locale={locale} project={project} painted={painted} tool={tool} selected={selected} showGrid={showGrid} showNumbers={showNumbers} referenceOpacity={referenceOpacity} onStrokeStart={handleCanvasStrokeStart} onStrokeMove={handleCanvasStrokeMove} onHover={setHoveredIndex}/>
          </section>
        </div> : null}
        <ExportSheet
          locale={locale}
          open={exportOpen}
          projectName={projectName}
          saveState={saveState}
          hasPainting={filled > 0}
          onClose={closeExport}
          onSaveCurrent={() => void saveOrSharePng("current")}
          onSavePrintable={() => void saveOrSharePng("printable")}
          onPrint={printPrintableGrid}
          onSaveComplete={() => void saveOrSharePng("complete")}
        />
      </section>
    </main>
  );
}
