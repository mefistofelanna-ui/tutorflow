"use client";

import { ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export default function LessonMenu({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLDetailsElement>(null);
  const menu = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!open) return;
    const position = () => {
      if (!trigger.current || !menu.current) return;
      const anchor = trigger.current.getBoundingClientRect();
      const popup = menu.current;
      const viewport = window.visualViewport;
      const left = viewport?.offsetLeft ?? 0;
      const top = viewport?.offsetTop ?? 0;
      const width = viewport?.width ?? window.innerWidth;
      const height = viewport?.height ?? window.innerHeight;
      const margin = 8, gap = 8;
      popup.style.maxHeight = `${Math.max(0, height - margin * 2)}px`;
      const bounds = popup.getBoundingClientRect();
      const below = top + height - margin - anchor.bottom - gap;
      const above = anchor.top - top - margin - gap;
      const upwards = bounds.height > below && above > below;
      popup.style.maxHeight = `${Math.max(0, upwards ? above : below)}px`;
      const menuHeight = popup.getBoundingClientRect().height;
      popup.style.left = `${Math.max(left + margin, Math.min(anchor.right - bounds.width, left + width - bounds.width - margin))}px`;
      popup.style.top = `${Math.max(top + margin, upwards ? anchor.top - gap - menuHeight : anchor.bottom + gap)}px`;
    };
    position();
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, true);
    window.visualViewport?.addEventListener("resize", position);
    window.visualViewport?.addEventListener("scroll", position);
    const observer = new ResizeObserver(position);
    if (trigger.current) observer.observe(trigger.current);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", position);
      window.removeEventListener("scroll", position, true);
      window.visualViewport?.removeEventListener("resize", position);
      window.visualViewport?.removeEventListener("scroll", position);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const close = () => { if (trigger.current) trigger.current.open = false; setOpen(false); };
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !trigger.current?.contains(event.target) && !menu.current?.contains(event.target)) close();
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") { close(); trigger.current?.querySelector("summary")?.focus(); }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, [open]);

  return <details className="lesson-menu" ref={trigger} onToggle={event => setOpen(event.currentTarget.open)}>
    <summary aria-label={label} aria-expanded={open}>•••</summary>
    {open && createPortal(<div className="lesson-menu-popup" ref={menu}>{children}</div>, document.body)}
  </details>;
}
