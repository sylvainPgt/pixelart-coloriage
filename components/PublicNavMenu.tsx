"use client";

import { useRef, type ReactNode } from "react";

export default function PublicNavMenu({ children }: { children: ReactNode }) {
  const menu = useRef<HTMLDetailsElement>(null);
  return (
    <details
      ref={menu}
      className="public-nav-menu"
      onKeyDown={(event) => {
        if (event.key !== "Escape" || !menu.current?.open) return;
        menu.current.open = false;
        menu.current.querySelector("summary")?.focus();
      }}
    >
      <summary>Menu</summary>
      <div
        className="public-nav-links"
        onClick={(event) => {
          if (event.target instanceof Element && event.target.closest("a") && menu.current) {
            menu.current.open = false;
          }
        }}
      >
        {children}
      </div>
    </details>
  );
}
