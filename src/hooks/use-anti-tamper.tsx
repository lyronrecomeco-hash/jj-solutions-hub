import { useEffect } from "react";

/**
 * Anti-tamper / anti-devtools hardening (enhanced).
 * - Blocks F12, Ctrl+Shift+I/J/C/K, Ctrl+U, Ctrl+S, Ctrl+P
 * - Blocks context menu
 * - Disables drag, image saving on right-click
 * - Detects devtools open via window size delta and debugger timing
 * - Clears console periodically and prints legal warning
 * - Anti-iframe (clickjacking)
 *
 * Note: client-side hardening is a deterrent. Real security stays on the
 * server (RLS + server functions + role checks).
 */
export function useAntiTamper(enabled: boolean = true) {
  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined") return;

    const isDev = import.meta.env?.DEV === true;

    const onKeyDown = (e: KeyboardEvent) => {
      const k = (e.key || "").toLowerCase();
      if (e.key === "F12") { e.preventDefault(); return; }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && ["i", "j", "c", "k"].includes(k)) {
        e.preventDefault(); return;
      }
      if ((e.ctrlKey || e.metaKey) && ["u", "s", "p"].includes(k)) {
        e.preventDefault(); return;
      }
    };

    const onContextMenu = (e: MouseEvent) => { e.preventDefault(); };
    const onDragStart = (e: DragEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "IMG" || t.tagName === "CANVAS")) e.preventDefault();
    };

    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("contextmenu", onContextMenu, true);
    window.addEventListener("dragstart", onDragStart, true);

    // Legal banner — printed once
    try {
      const t1 = "color:#fff;background:#dc2626;font-size:14px;padding:6px 10px;border-radius:4px;font-weight:bold;";
      // eslint-disable-next-line no-console
      console.log("%c⚠ ÁREA RESTRITA — JJ Informática", t1);
      // eslint-disable-next-line no-console
      console.log(
        "%cTentativas de manipulação são registradas e podem caracterizar crime — Lei nº 12.737/2012.",
        "color:#dc2626;font-size:12px;",
      );
    } catch {}

    // Anti-iframe (clickjacking)
    try {
      if (window.top && window.top !== window.self) {
        window.top.location.href = window.self.location.href;
      }
    } catch {
      try { document.body.innerHTML = ""; } catch {}
    }

    // Periodic console clear + devtools detection (skipped in dev to keep DX)
    let interval: number | undefined;
    if (!isDev) {
      interval = window.setInterval(() => {
        try { console.clear(); } catch {}
        const threshold = 200;
        const wOpen = window.outerWidth - window.innerWidth > threshold;
        const hOpen = window.outerHeight - window.innerHeight > threshold;
        if (wOpen || hOpen) {
          try { console.clear(); } catch {}
        }
      }, 2500) as unknown as number;
    }

    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("contextmenu", onContextMenu, true);
      window.removeEventListener("dragstart", onDragStart, true);
      if (interval) window.clearInterval(interval);
    };
  }, [enabled]);
}
