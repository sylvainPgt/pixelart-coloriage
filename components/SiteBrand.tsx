export default function SiteBrand() {
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
