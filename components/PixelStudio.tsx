"use client";

import { ChangeEvent, PointerEvent, useEffect, useMemo, useRef, useState } from "react";

type Mode = "templates" | "image" | "text";
type PixelProject = { name: string; size: number; pixels: string[] };

const COLORS = ["#17172b", "#ff5c8a", "#ff9f43", "#ffd93d", "#6bdb78", "#55c7f3", "#7868e6", "#f8f6ff"];

const templates: PixelProject[] = [
  makeTemplate("Cœur pop", 12, (x, y) => {
    const heart = (x > 1 && x < 10 && y > 1 && y < 8 && ((x < 6 && y > Math.abs(x - 3)) || (x >= 6 && y > Math.abs(x - 8)))) || (y >= 7 && y < 11 && x > y - 6 && x < 17 - y);
    return heart ? (y < 5 ? "#ff5c8a" : "#e83e75") : "#f8f6ff";
  }),
  makeTemplate("Mini paysage", 12, (x, y) => y < 5 ? "#55c7f3" : y === 5 ? "#ffd93d" : y > 8 ? "#6bdb78" : (x + y) % 5 < 2 ? "#7868e6" : "#4a3e9b"),
  makeTemplate("Space invader", 12, (x, y) => {
    const mirror = x > 5 ? 11 - x : x;
    const shape = [[3,4],[2,5],[1,5],[1,4],[1,4],[1,5],[2,5],[2,4]][y - 2];
    return shape && mirror >= shape[0] && mirror <= shape[1] ? "#7868e6" : "#f8f6ff";
  }),
];

function makeTemplate(name: string, size: number, color: (x: number, y: number) => string): PixelProject {
  return { name, size, pixels: Array.from({ length: size * size }, (_, i) => color(i % size, Math.floor(i / size))) };
}

function textProject(prompt: string, size: number): PixelProject {
  const p = prompt.toLowerCase();
  if (p.includes("coeur") || p.includes("cœur") || p.includes("amour")) return { ...templates[0], name: prompt };
  if (p.includes("espace") || p.includes("alien") || p.includes("robot")) return { ...templates[2], name: prompt };
  let seed = [...prompt].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0, 2166136261);
  const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  return makeTemplate(prompt || "Surprise pixel", size, (x, y) => {
    const cx = size / 2; const cy = size / 2;
    const distance = Math.hypot(x - cx, y - cy);
    const wave = Math.sin((x + y) * .8 + random() * .8);
    return COLORS[(Math.floor(distance + wave * 2 + random() * 2) % 6) + 1];
  });
}

function uniquePalette(pixels: string[]) {
  return [...new Set(pixels)].slice(0, 12);
}

export default function PixelStudio() {
  const [mode, setMode] = useState<Mode>("templates");
  const [project, setProject] = useState<PixelProject>(templates[0]);
  const [painted, setPainted] = useState<(string | null)[]>(() => Array(144).fill(null));
  const [selected, setSelected] = useState("#ff5c8a");
  const [prompt, setPrompt] = useState("");
  const [gridSize, setGridSize] = useState(16);
  const [isPainting, setIsPainting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem("pixelia-project");
    if (!saved) return;
    try {
      const data = JSON.parse(saved) as { project: PixelProject; painted: (string | null)[] };
      setProject(data.project); setPainted(data.painted);
    } catch { localStorage.removeItem("pixelia-project"); }
  }, []);

  useEffect(() => {
    localStorage.setItem("pixelia-project", JSON.stringify({ project, painted }));
  }, [project, painted]);

  const palette = useMemo(() => uniquePalette(project.pixels), [project]);
  const colored = painted.filter(Boolean).length;
  const progress = Math.round(colored / painted.length * 100);

  function loadProject(next: PixelProject) {
    setProject(next); setPainted(Array(next.size * next.size).fill(null));
    setSelected(uniquePalette(next.pixels).find(c => c !== "#f8f6ff") || next.pixels[0]);
  }

  function paint(index: number) {
    setPainted(current => { const next = [...current]; next[index] = selected; return next; });
  }

  function handlePointer(event: PointerEvent<HTMLButtonElement>, index: number) {
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsPainting(true); paint(index);
  }

  function importImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; if (!file) return;
    const image = new Image(); image.onload = () => {
      const canvas = document.createElement("canvas"); canvas.width = gridSize; canvas.height = gridSize;
      const ctx = canvas.getContext("2d", { willReadFrequently: true }); if (!ctx) return;
      const side = Math.min(image.width, image.height); const sx = (image.width - side) / 2; const sy = (image.height - side) / 2;
      ctx.drawImage(image, sx, sy, side, side, 0, 0, gridSize, gridSize);
      const data = ctx.getImageData(0, 0, gridSize, gridSize).data;
      const pixels = Array.from({ length: gridSize * gridSize }, (_, i) => {
        const r = Math.round(data[i * 4] / 51) * 51; const g = Math.round(data[i * 4 + 1] / 51) * 51; const b = Math.round(data[i * 4 + 2] / 51) * 51;
        return `#${[r,g,b].map(v => v.toString(16).padStart(2,"0")).join("")}`;
      });
      loadProject({ name: file.name.replace(/\.[^.]+$/, ""), size: gridSize, pixels }); URL.revokeObjectURL(image.src);
    }; image.src = URL.createObjectURL(file);
  }

  function exportPng() {
    const canvas = document.createElement("canvas"); const cell = 32; canvas.width = project.size * cell; canvas.height = project.size * cell;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    project.pixels.forEach((target, i) => { ctx.fillStyle = painted[i] || target; ctx.fillRect((i % project.size) * cell, Math.floor(i / project.size) * cell, cell, cell); });
    const link = document.createElement("a"); link.download = `${project.name || "pixelia"}.png`; link.href = canvas.toDataURL("image/png"); link.click();
  }

  return (
    <main onPointerUp={() => setIsPainting(false)} onPointerLeave={() => setIsPainting(false)}>
      <nav className="nav shell"><a className="brand" href="#top"><span className="brand-mark">P</span> Pixelia</a><div className="nav-links"><a href="#studio">Studio</a><a href="#how">Comment ça marche</a><span className="badge">Gratuit · Sans compte</span></div></nav>

      <section className="hero shell" id="top">
        <div className="hero-copy"><span className="eyebrow">✦ Ton imagination, pixel par pixel</span><h1>Crée. Colorie.<br/><em>Fais-le vibrer.</em></h1><p>Transforme une photo ou quelques mots en pixel art, puis colorie ta création directement en ligne.</p><a className="primary" href="#studio">Commencer à créer <span>→</span></a><small>✓ Aucune installation &nbsp; ✓ Sauvegarde automatique</small></div>
        <div className="hero-art" aria-label="Aperçu décoratif d'un cœur en pixel art"><div className="orbit one">✦</div><div className="orbit two">●</div><div className="pixel-heart">♥</div><div className="float-card"><b>78%</b><span>colorié</span></div></div>
      </section>

      <section className="studio-section" id="studio"><div className="shell">
        <div className="section-heading"><span className="eyebrow">LE STUDIO</span><h2>À toi de jouer</h2><p>Choisis ton point de départ. Tout se passe ici, sans quitter la page.</p></div>
        <div className="mode-tabs" role="tablist">
          <button className={mode === "templates" ? "active" : ""} onClick={() => setMode("templates")}>▦ Modèles</button>
          <button className={mode === "image" ? "active" : ""} onClick={() => setMode("image")}>↑ Une image</button>
          <button className={mode === "text" ? "active" : ""} onClick={() => setMode("text")}>✦ Une idée</button>
        </div>
        <div className="source-panel">
          {mode === "templates" && <div className="template-list">{templates.map((item, i) => <button key={item.name} className={project.name === item.name ? "template active" : "template"} onClick={() => loadProject(item)}><span>{["♥","⌁","👾"][i]}</span><b>{item.name}</b><small>12 × 12 · Facile</small></button>)}</div>}
          {mode === "image" && <div className="upload-row"><div><b>Transforme ta photo</b><p>PNG, JPG ou WebP. Elle reste sur ton appareil.</p></div><label>Grille <select value={gridSize} onChange={e => setGridSize(Number(e.target.value))}><option>12</option><option>16</option><option>24</option><option>32</option></select></label><button className="primary compact" onClick={() => fileRef.current?.click()}>Choisir une image</button><input ref={fileRef} hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={importImage}/></div>}
          {mode === "text" && <form className="prompt-row" onSubmit={e => { e.preventDefault(); loadProject(textProject(prompt, 16)); }}><div><b>Décris ton idée</b><p>Notre générateur crée un motif unique, gratuitement.</p></div><input value={prompt} onChange={e => setPrompt(e.target.value)} required maxLength={80} placeholder="Un petit robot dans l'espace…"/><button className="primary compact">Générer ✦</button></form>}
        </div>

        <div className="editor-card">
          <aside className="tools"><div><span className="label">COULEURS</span><div className="palette">{palette.map(color => <button key={color} className={selected === color ? "swatch selected" : "swatch"} style={{ background: color }} aria-label={`Choisir ${color}`} onClick={() => setSelected(color)}/>)}</div></div><div><span className="label">PROGRESSION</span><div className="progress-label"><b>{progress}%</b><span>{colored} / {painted.length} pixels</span></div><div className="progress"><i style={{ width: `${progress}%` }}/></div></div><div className="tool-actions"><button onClick={() => setPainted(Array(painted.length).fill(null))}>↺ Recommencer</button><button onClick={exportPng}>↓ Exporter PNG</button></div><p className="tip">Astuce : maintiens et glisse pour colorier plus vite.</p></aside>
          <section className="canvas-wrap"><header><div><span className="status-dot"/> EN COURS</div><b>{project.name}</b><span>{project.size} × {project.size}</span></header><div className="pixel-grid" style={{ gridTemplateColumns: `repeat(${project.size}, 1fr)` }} onPointerMove={e => { if (!isPainting) return; const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement; const index = Number(el.dataset.index); if (!Number.isNaN(index)) paint(index); }}>{project.pixels.map((target, i) => <button key={i} data-index={i} aria-label={`Pixel ${i + 1}`} onPointerDown={e => handlePointer(e, i)} style={{ background: painted[i] || "#ffffff", borderColor: painted[i] ? painted[i]! : `${target}55` }}><i style={{ background: target }}/></button>)}</div></section>
        </div>
      </div></section>

      <section className="how shell" id="how"><div className="section-heading"><span className="eyebrow">SIMPLE COMME BONJOUR</span><h2>Trois étapes, un chef-d’œuvre</h2></div><div className="steps"><article><span>01</span><i>⌁</i><h3>Choisis</h3><p>Une photo, une idée ou un modèle prêt à jouer.</p></article><article><span>02</span><i>✦</i><h3>Pixelise</h3><p>Pixelia prépare une palette claire et une jolie grille.</p></article><article><span>03</span><i>♥</i><h3>Colorie</h3><p>Remplis, sauvegarde automatiquement et partage.</p></article></div></section>
      <footer><div className="shell"><a className="brand" href="#top"><span className="brand-mark">P</span> Pixelia</a><p>Fabriqué avec ♥ et beaucoup de petits carrés.</p><span>© 2026 Pixelia</span></div></footer>
    </main>
  );
}
