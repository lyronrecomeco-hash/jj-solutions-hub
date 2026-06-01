import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { MapPin, Loader2, Users } from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_app/monitoramento")({ component: MonitoringPage });

type Loc = { user_id: string; lat: number; lng: number; updated_at: string; accuracy: number | null };
type Tech = { id: string; full_name: string; photo_url: string | null; specialty: string | null };

// Default centro: Brasil
const DEFAULT_CENTER: [number, number] = [-15.78, -47.93];

function dotIcon(label: string, online: boolean) {
  const color = online ? "#16a34a" : "#94a3b8";
  return L.divIcon({
    className: "custom-marker",
    html: `<div style="position:relative;display:grid;place-items:center;width:36px;height:36px;border-radius:50%;background:${color};color:white;font-weight:700;font-size:11px;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)">${label}<span style="position:absolute;bottom:-4px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:7px solid ${color}"></span></div>`,
    iconSize: [36, 42],
    iconAnchor: [18, 42],
  });
}

function MonitoringPage() {
  const [locs, setLocs] = useState<Loc[]>([]);
  const [techs, setTechs] = useState<Tech[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      (supabase.from("technician_locations") as any).select("*"),
      supabase.from("profiles").select("id, full_name, photo_url, specialty"),
    ]).then(([l, p]) => {
      if (!mounted) return;
      setLocs((l.data ?? []) as Loc[]);
      setTechs((p.data ?? []) as Tech[]);
      setLoading(false);
    });
    const ch = supabase
      .channel("loc-monitor")
      .on("postgres_changes", { event: "*", schema: "public", table: "technician_locations" }, (payload) => {
        const row = payload.new as Loc;
        if (!row) return;
        setLocs((prev) => {
          const idx = prev.findIndex((x) => x.user_id === row.user_id);
          if (idx === -1) return [...prev, row];
          const cp = [...prev]; cp[idx] = row; return cp;
        });
      })
      .subscribe();
    return () => { mounted = false; supabase.removeChannel(ch); };
  }, []);

  const techsById = useMemo(() => Object.fromEntries(techs.map((t) => [t.id, t])), [techs]);
  const center: [number, number] = locs.length ? [locs[0].lat, locs[0].lng] : DEFAULT_CENTER;
  const onlineThreshold = Date.now() - 5 * 60_000;

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-5 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary"><MapPin className="h-5 w-5" /></div>
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Monitoramento</h1>
          <p className="text-sm text-muted-foreground">Rastreio em tempo real da equipe em campo.</p>
        </div>
        <span className="ml-auto inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs">
          <Users className="h-3.5 w-3.5" /> {locs.length} técnico{locs.length === 1 ? "" : "s"} ativo{locs.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-soft">
        <div className="h-[68vh]">
          {loading ? (
            <div className="grid h-full place-items-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <MapContainer center={center} zoom={locs.length ? 12 : 4} style={{ height: "100%", width: "100%" }} scrollWheelZoom>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
              {locs.map((l) => {
                const t = techsById[l.user_id];
                const initials = (t?.full_name || "?").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
                const online = new Date(l.updated_at).getTime() > onlineThreshold;
                return (
                  <Marker key={l.user_id} position={[l.lat, l.lng]} icon={dotIcon(initials, online)}>
                    <Popup>
                      <div className="text-sm">
                        <div className="font-semibold">{t?.full_name ?? l.user_id}</div>
                        {t?.specialty && <div className="text-xs text-muted-foreground">{t.specialty}</div>}
                        <div className="mt-1 text-[11px] text-muted-foreground">
                          Atualizado: {new Date(l.updated_at).toLocaleString("pt-BR")}
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          )}
        </div>
      </div>
    </div>
  );
}
