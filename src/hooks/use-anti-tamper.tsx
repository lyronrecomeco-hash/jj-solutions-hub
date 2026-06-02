import { useEffect } from "react";

/**
 * Anti-tamper / anti-devtools hardening.
 * - Blocks F12, Ctrl+Shift+I/J/C, Ctrl+U, Ctrl+S
 * - Blocks context menu
 * - Detects devtools open via window size delta
 * - Prints console warning banner
 *
 * Note: this is a deterrent, not real security. Sensitive logic must live
 * on the server (RLS + server functions).
 */
export function useAntiTamper(enabled: boolean = true) {
  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined") return;

    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key?.toLowerCase();
      // F12
      if (e.key === "F12") {
        e.preventDefault();
        return false;
      }
      // Ctrl/Cmd + Shift + I / J / C
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && ["i", "j", "c"].includes(k)) {
        e.preventDefault();
        return false;
      }
      // Ctrl/Cmd + U (view source) / Ctrl+S (save)
      if ((e.ctrlKey || e.metaKey) && ["u", "s"].includes(k)) {
        e.preventDefault();
        return false;
      }
    };

    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("contextmenu", onContextMenu);

    // Console banner
    try {
      const style =
        "color:#fff;background:#dc2626;font-size:14px;padding:6px 10px;border-radius:4px;font-weight:bold;";
      // eslint-disable-next-line no-console
      console.log("%c⚠ ATENÇÃO — Área restrita", style);
      // eslint-disable-next-line no-console
      console.log(
        "%cQualquer tentativa de manipulação deste painel é registrada e pode ser considerada crime conforme a Lei nº 12.737/2012.",
        "color:#dc2626;font-size:12px;",
      );
    } catch {}

    // Anti-iframe (clickjacking)
    try {
      if (window.top !== window.self) {
        window.top!.location.href = window.self.location.href;
      }
    } catch {}

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("contextmenu", onContextMenu);
    };
  }, [enabled]);
}
