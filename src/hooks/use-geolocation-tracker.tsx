import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

/**
 * Real-time geolocation tracker for the signed-in technician.
 * - Uses watchPosition for continuous updates (browser fires as the device moves).
 * - Also force-pushes the latest reading every `intervalMs` to keep the row fresh
 *   even when the user is standing still (so "Atualizado há Xs" stays accurate).
 * Silent no-op if permission is denied.
 */
export function useGeolocationTracker(intervalMs = 5_000) {
  const { user } = useAuth();
  const last = useRef<GeolocationPosition | null>(null);

  useEffect(() => {
    if (!user || typeof navigator === "undefined" || !navigator.geolocation) return;
    let cancelled = false;

    const push = (pos: GeolocationPosition) => {
      if (cancelled) return;
      last.current = pos;
      (supabase.from("technician_locations") as any).upsert(
        {
          user_id: user.id,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy ?? null,
          heading: pos.coords.heading ?? null,
          speed: pos.coords.speed ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      ).then(() => {});
    };

    const onError = () => {};

    const watchId = navigator.geolocation.watchPosition(push, onError, {
      enableHighAccuracy: true,
      maximumAge: 1_000,
      timeout: 20_000,
    });

    // Heartbeat: re-push last known position so the timestamp stays current.
    const heartbeat = window.setInterval(() => {
      if (last.current) push(last.current);
    }, intervalMs);

    return () => {
      cancelled = true;
      navigator.geolocation.clearWatch(watchId);
      window.clearInterval(heartbeat);
    };
  }, [user, intervalMs]);
}
