"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PixelProject } from "@/lib/pixel-art";

type CanvasTool = "pan" | "pencil" | "eraser" | "picker" | "fill";
type PaintLayer = Array<number | null>;

type PixelCanvasProps = {
  locale: "fr" | "en";
  project: PixelProject;
  painted: PaintLayer;
  tool: CanvasTool;
  selected: number;
  showGrid: boolean;
  showNumbers: boolean;
  referenceOpacity: number;
  onStrokeStart: (index: number) => void;
  onStrokeMove: (index: number) => void;
  onHover: (index: number | null) => void;
};

const CELL = 32;
const clamp = (value: number, minimum: number, maximum: number) => Math.max(minimum, Math.min(maximum, value));

export default function PixelCanvas({
  locale,
  project,
  painted,
  tool,
  selected,
  showGrid,
  showNumbers,
  referenceOpacity,
  onStrokeStart,
  onStrokeMove,
  onHover,
}: PixelCanvasProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const gestureRef = useRef<{ distance: number; zoom: number; centerX: number; centerY: number } | null>(null);
  const drawingRef = useRef(false);
  const lastCellRef = useRef<number | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState({ width: 1, height: 1 });
  const [keyboardCell, setKeyboardCell] = useState(0);
  const isFrench = locale === "fr";
  const incorrectCount = painted.reduce<number>(
    (count, paintedIndex, index) => count + (paintedIndex !== null && paintedIndex !== project.targets[index] ? 1 : 0),
    0,
  );

  const fit = useCallback(() => {
    const host = hostRef.current;
    if (!host) return;
    const bounds = host.getBoundingClientRect();
    const gridWidth = project.width * CELL;
    const gridHeight = project.height * CELL;
    const nextZoom = clamp(Math.min((bounds.width - 32) / gridWidth, (bounds.height - 32) / gridHeight), 0.08, 5);
    setZoom(nextZoom);
    setOffset({ x: (bounds.width - gridWidth * nextZoom) / 2, y: (bounds.height - gridHeight * nextZoom) / 2 });
  }, [project.height, project.width]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize((current) =>
        current.width === width && current.height === height
          ? current
          : { width, height },
      );
    });
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    fit();
  }, [fit, size.height, size.width]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(size.width * dpr));
    canvas.height = Math.max(1, Math.round(size.height * dpr));
    const context = canvas.getContext("2d");
    if (!context) return;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, size.width, size.height);
    context.fillStyle = "#eeeae2";
    context.fillRect(0, 0, size.width, size.height);
    context.save();
    context.translate(offset.x, offset.y);
    context.scale(zoom, zoom);
    context.fillStyle = "#17162a";
    context.fillRect(-5, -5, project.width * CELL + 10, project.height * CELL + 10);

    for (let index = 0; index < project.targets.length; index += 1) {
      const column = index % project.width;
      const row = Math.floor(index / project.width);
      const x = column * CELL;
      const y = row * CELL;
      const target = project.targets[index];
      const paintedIndex = painted[index];
      context.fillStyle = paintedIndex === null ? "#ffffff" : project.palette[paintedIndex];
      context.fillRect(x, y, CELL, CELL);

      if (paintedIndex === null && referenceOpacity > 0) {
        context.globalAlpha = referenceOpacity / 100;
        context.fillStyle = project.palette[target];
        context.fillRect(x + 7, y + 7, CELL - 14, CELL - 14);
        context.globalAlpha = 1;
      }
      if (showNumbers && zoom * CELL >= 12) {
        context.fillStyle = "#17162a";
        context.font = "800 11px system-ui, sans-serif";
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillText(String(target + 1), x + CELL / 2, y + CELL / 2);
      }
      if (showGrid) {
        context.strokeStyle = "#17162a";
        context.lineWidth = 1 / zoom;
        context.strokeRect(x, y, CELL, CELL);
      }
      if (paintedIndex !== null && paintedIndex !== target && zoom * CELL >= 10) {
        context.fillStyle = "#b3203f";
        context.font = "900 12px system-ui, sans-serif";
        context.textAlign = "right";
        context.textBaseline = "bottom";
        context.fillText("×", x + CELL - 3, y + CELL - 2);
      }
    }
    const keyboardX = (keyboardCell % project.width) * CELL;
    const keyboardY = Math.floor(keyboardCell / project.width) * CELL;
    context.strokeStyle = project.palette[selected] ?? "#604bd8";
    context.lineWidth = 4 / zoom;
    context.strokeRect(keyboardX + 2 / zoom, keyboardY + 2 / zoom, CELL - 4 / zoom, CELL - 4 / zoom);
    context.restore();
  }, [keyboardCell, offset, painted, project, referenceOpacity, selected, showGrid, showNumbers, size, zoom]);

  function zoomAround(nextZoom: number, clientX?: number, clientY?: number) {
    const host = hostRef.current;
    if (!host) return;
    const bounds = host.getBoundingClientRect();
    const pointX = clientX === undefined ? bounds.width / 2 : clientX - bounds.left;
    const pointY = clientY === undefined ? bounds.height / 2 : clientY - bounds.top;
    const clamped = clamp(nextZoom, 0.08, 8);
    const logicalX = (pointX - offset.x) / zoom;
    const logicalY = (pointY - offset.y) / zoom;
    setOffset({ x: pointX - logicalX * clamped, y: pointY - logicalY * clamped });
    setZoom(clamped);
  }

  function cellAt(clientX: number, clientY: number) {
    const host = hostRef.current;
    if (!host) return null;
    const bounds = host.getBoundingClientRect();
    const x = (clientX - bounds.left - offset.x) / zoom;
    const y = (clientY - bounds.top - offset.y) / zoom;
    const column = Math.floor(x / CELL);
    const row = Math.floor(y / CELL);
    if (column < 0 || row < 0 || column >= project.width || row >= project.height) return null;
    return row * project.width + column;
  }

  function pointerDistance() {
    const points = [...pointersRef.current.values()];
    if (points.length < 2) return 0;
    return Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
  }

  function pointerCenter() {
    const points = [...pointersRef.current.values()];
    return { x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 };
  }

  return (
    <div ref={hostRef} className="pixel-canvas-host">
      <canvas
        ref={canvasRef}
        className={`pixel-canvas tool-${tool}`}
        role="application"
        aria-label={isFrench
          ? `Grille de coloriage ${project.width} par ${project.height}${incorrectCount > 0 ? `, ${incorrectCount} couleur incorrecte${incorrectCount > 1 ? "s" : ""}` : ""}`
          : `${project.width} by ${project.height} coloring grid${incorrectCount > 0 ? `, ${incorrectCount} incorrect color${incorrectCount > 1 ? "s" : ""}` : ""}`}
        tabIndex={0}
        onKeyDown={(event) => {
          let next = keyboardCell;
          if (event.key === "ArrowLeft") next = Math.max(0, keyboardCell - 1);
          else if (event.key === "ArrowRight") next = Math.min(project.targets.length - 1, keyboardCell + 1);
          else if (event.key === "ArrowUp") next = Math.max(0, keyboardCell - project.width);
          else if (event.key === "ArrowDown") next = Math.min(project.targets.length - 1, keyboardCell + project.width);
          else if (event.key === "Home") next = Math.floor(keyboardCell / project.width) * project.width;
          else if (event.key === "End") next = Math.min(project.targets.length - 1, Math.floor(keyboardCell / project.width) * project.width + project.width - 1);
          else if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onStrokeStart(keyboardCell);
            return;
          } else return;
          event.preventDefault();
          setKeyboardCell(next);
          onHover(next);
        }}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
          if (pointersRef.current.size === 2) {
            drawingRef.current = false;
            const center = pointerCenter();
            gestureRef.current = { distance: pointerDistance(), zoom, centerX: center.x, centerY: center.y };
            return;
          }
          const index = cellAt(event.clientX, event.clientY);
          if (tool === "pan") return;
          if (index === null) return;
          lastCellRef.current = index;
          drawingRef.current = tool === "pencil" || tool === "eraser";
          onStrokeStart(index);
        }}
        onPointerMove={(event) => {
          const previous = pointersRef.current.get(event.pointerId);
          if (!previous) {
            onHover(cellAt(event.clientX, event.clientY));
            return;
          }
          pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
          if (pointersRef.current.size >= 2) {
            const gesture = gestureRef.current;
            if (gesture) zoomAround(gesture.zoom * pointerDistance() / Math.max(1, gesture.distance), gesture.centerX, gesture.centerY);
            return;
          }
          if (tool === "pan") {
            setOffset((current) => ({ x: current.x + event.clientX - previous.x, y: current.y + event.clientY - previous.y }));
            return;
          }
          const index = cellAt(event.clientX, event.clientY);
          onHover(index);
          if (drawingRef.current && index !== null && index !== lastCellRef.current) {
            lastCellRef.current = index;
            onStrokeMove(index);
          }
        }}
        onPointerUp={(event) => {
          pointersRef.current.delete(event.pointerId);
          drawingRef.current = false;
          lastCellRef.current = null;
          gestureRef.current = null;
        }}
        onPointerCancel={(event) => {
          pointersRef.current.delete(event.pointerId);
          drawingRef.current = false;
          lastCellRef.current = null;
          gestureRef.current = null;
        }}
        onPointerLeave={() => onHover(null)}
        onWheel={(event) => {
          event.preventDefault();
          zoomAround(zoom * (event.deltaY > 0 ? 0.9 : 1.1), event.clientX, event.clientY);
        }}
      />
      <div className="canvas-floating-controls" aria-label={isFrench ? "Contrôles de vue" : "View controls"}>
        <button type="button" aria-label={isFrench ? "Réduire" : "Zoom out"} onClick={() => zoomAround(zoom * 0.8)}>−</button>
        <button type="button" onClick={fit}>{isFrench ? "Ajuster" : "Fit"}</button>
        <button type="button" aria-label={isFrench ? "Agrandir" : "Zoom in"} onClick={() => zoomAround(zoom * 1.25)}>+</button>
        <span>{Math.round(zoom * 100)}%</span>
      </div>
      <span className="canvas-gesture-help">{isFrench ? "Pince pour zoomer · Outil main pour déplacer" : "Pinch to zoom · Use the hand tool to pan"}</span>
    </div>
  );
}
