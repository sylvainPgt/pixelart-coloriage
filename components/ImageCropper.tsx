"use client";

import { useEffect, useRef, useState } from "react";
import { getCropRect, type CropTransform } from "@/lib/crop-geometry";

type ImageCropperProps = {
  dataUrl: string;
  name: string;
  ratio: number;
  transform: CropTransform;
  locale: "fr" | "en";
  onChange: (transform: CropTransform) => void;
};

const clamp = (value: number, minimum: number, maximum: number) => Math.max(minimum, Math.min(maximum, value));

export default function ImageCropper({ dataUrl, name, ratio, transform, locale, onChange }: ImageCropperProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const gestureRef = useRef<{ distance: number; zoom: number } | null>(null);
  const [ready, setReady] = useState(false);
  const isFrench = locale === "fr";

  useEffect(() => {
    let cancelled = false;
    const image = new Image();
    image.onload = () => {
      if (cancelled) return;
      imageRef.current = image;
      setReady(true);
    };
    image.onerror = () => setReady(false);
    image.src = dataUrl;
    return () => {
      cancelled = true;
      imageRef.current = null;
    };
  }, [dataUrl]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image || !ready) return;

    const draw = () => {
      const bounds = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(1, Math.round(bounds.width * dpr));
      const height = Math.max(1, Math.round(bounds.height * dpr));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      const context = canvas.getContext("2d");
      if (!context) return;
      const crop = getCropRect(image.naturalWidth, image.naturalHeight, ratio, transform);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.clearRect(0, 0, bounds.width, bounds.height);
      context.fillStyle = "#17162a";
      context.fillRect(0, 0, bounds.width, bounds.height);
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, bounds.width, bounds.height);
    };

    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [ratio, ready, transform]);

  function updateFromDrag(deltaX: number, deltaY: number) {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image) return;
    const bounds = canvas.getBoundingClientRect();
    const crop = getCropRect(image.naturalWidth, image.naturalHeight, ratio, transform);
    const rangeX = Math.max(1, image.naturalWidth - crop.width);
    const rangeY = Math.max(1, image.naturalHeight - crop.height);
    const focusDeltaX = -(deltaX / Math.max(1, bounds.width)) * crop.width / rangeX * 100;
    const focusDeltaY = -(deltaY / Math.max(1, bounds.height)) * crop.height / rangeY * 100;
    onChange({
      ...transform,
      focusX: clamp(transform.focusX + focusDeltaX, 0, 100),
      focusY: clamp(transform.focusY + focusDeltaY, 0, 100),
    });
  }

  function pointerDistance() {
    const points = [...pointersRef.current.values()];
    if (points.length < 2) return 0;
    return Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
  }

  return (
    <div className="crop-editor">
      <div className="crop-canvas-frame" style={{ aspectRatio: `${Math.max(1, ratio * 1000)} / 1000` }}>
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={isFrench ? `Zone recadrée de ${name}` : `Cropped area of ${name}`}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
            if (pointersRef.current.size === 2) gestureRef.current = { distance: pointerDistance(), zoom: transform.zoom };
          }}
          onPointerMove={(event) => {
            const previous = pointersRef.current.get(event.pointerId);
            if (!previous) return;
            pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
            if (pointersRef.current.size >= 2) {
              const gesture = gestureRef.current;
              const distance = pointerDistance();
              if (gesture && gesture.distance > 0) onChange({ ...transform, zoom: clamp(gesture.zoom * distance / gesture.distance, 1, 5) });
              return;
            }
            updateFromDrag(event.clientX - previous.x, event.clientY - previous.y);
          }}
          onPointerUp={(event) => {
            pointersRef.current.delete(event.pointerId);
            gestureRef.current = null;
          }}
          onPointerCancel={(event) => {
            pointersRef.current.delete(event.pointerId);
            gestureRef.current = null;
          }}
          onWheel={(event) => {
            event.preventDefault();
            onChange({ ...transform, zoom: clamp(transform.zoom + (event.deltaY > 0 ? -0.12 : 0.12), 1, 5) });
          }}
        />
        {!ready ? <span className="crop-loading">{isFrench ? "Préparation de l’image…" : "Preparing image…"}</span> : null}
        <span className="crop-guide" aria-hidden="true" />
      </div>
      <div className="crop-controls">
        <label><span>{isFrench ? "Zoom" : "Zoom"}<b>{Math.round(transform.zoom * 100)}%</b></span><input type="range" min="1" max="5" step="0.05" value={transform.zoom} onChange={(event) => onChange({ ...transform, zoom: Number(event.target.value) })}/></label>
        <button type="button" onClick={() => onChange({ focusX: 50, focusY: 50, zoom: 1 })}>{isFrench ? "Réinitialiser" : "Reset"}</button>
      </div>
      <p>{isFrench ? "Fais glisser l’image pour choisir la zone. Pince avec deux doigts pour zoomer." : "Drag the image to choose the area. Pinch with two fingers to zoom."}</p>
    </div>
  );
}
