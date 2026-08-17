import type { CSSProperties } from "react";
import type { PixelProject } from "@/lib/pixel-art";

type PixelMiniatureProps = {
  project: PixelProject;
  className?: string;
  label?: string;
};

export default function PixelMiniature({ project, className = "", label }: PixelMiniatureProps) {
  return (
    <div
      className={`pixel-miniature ${className}`.trim()}
      style={{ "--mini-columns": project.width } as CSSProperties}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {project.targets.map((paletteIndex, index) => (
        <span key={index} style={{ background: project.palette[paletteIndex] }} />
      ))}
    </div>
  );
}
