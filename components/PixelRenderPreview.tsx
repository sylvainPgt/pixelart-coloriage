"use client";

import { useEffect, useRef } from "react";
import type { PixelProject } from "@/lib/pixel-art";

type PixelRenderPreviewProps = {
  project: PixelProject;
  label: string;
};

export default function PixelRenderPreview({ project, label }: PixelRenderPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    canvas.width = project.width;
    canvas.height = project.height;
    context.imageSmoothingEnabled = false;
    project.targets.forEach((paletteIndex, index) => {
      context.fillStyle = project.palette[paletteIndex] ?? "#ffffff";
      context.fillRect(index % project.width, Math.floor(index / project.width), 1, 1);
    });
  }, [project]);

  return (
    <canvas
      ref={canvasRef}
      className="pixel-render-preview"
      style={{ aspectRatio: `${project.width} / ${project.height}` }}
      role="img"
      aria-label={label}
    />
  );
}
