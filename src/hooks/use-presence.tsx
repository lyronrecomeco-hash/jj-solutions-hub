import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

/**
 * Marks the current user as online while the panel is open.
 * - On mount: status = online, last_seen_at = now
 * - Heartbeat every 30s updates last_seen_at
 * - On hide/unload/sign-out: status = offline
 */
export function usePresence() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    let alive = true;

    const setStatus = async (status: "online" | "offline") => {
      try {
        await supabase
          .from("profiles")
          .update({ status, last_seen_at: new Date().toISOString() } as any)
          .eq("id", user.id);
      } catch {}
    };

    setStatus("online");
    const beat = window.setInterval(() => { if (alive) setStatus("online"); }, 30_000);

    const onVisibility = () => { if (document.visibilityState === "hidden") setStatus("offline"); else setStatus("online"); };
    const onUnload = () => {
      try {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}`;
        const body = JSON.stringify({ status: "offline", last_seen_at: new Date().toISOString() });
        navigator.sendBeacon?.(url, new Blob([body], { type: "application/json" }));
      } catch {}
      setStatus("offline");
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("beforeunload", onUnload);

    return () => {
      alive = false;
      window.clearInterval(beat);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("beforeunload", onUnload);
      setStatus("offline");
    };
  }, [user]);
}
