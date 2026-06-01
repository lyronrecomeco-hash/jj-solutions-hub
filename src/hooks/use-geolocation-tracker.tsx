import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

/**
 * Upserts the technician's geolocation while they are logged in.
 * Requires user permission. Silently no-ops if denied.
 */
export function useGeolocationTracker(intervalMs = 15_000) {
  const { user } = useAuth();
  useEffect(() => {
    if (!user || typeof navigator === "undefined" || !navigator.geolocation) return;
    let cancelled = false;

    const push = (pos: GeolocationPosition) => {
      if (cancelled) return;
      (supabase.from("technician_locations") as any).upsert({
        user_id: user.id,
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy ?? null,
        heading: pos.coords.heading ?? null,
        speed: pos.coords.speed ?? null,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" }).then(() => {});
    };

    const onError = () => { /* silent */ };

    // First reading + interval
    navigator.geolocation.getCurrentPosition(push, onError, { enableHighAccuracy: true, maximumAge: 10_000, timeout: 15_000 });
    const id = window.setInterval(() => {
      navigator.geolocation.getCurrentPosition(push, onError, { enableHighAccuracy: true, maximumAge: 10_000, timeout: 15_000 });
    }, intervalMs);

    return () => { cancelled = true; window.clearInterval(id); };
  }, [user, intervalMs]);
}
