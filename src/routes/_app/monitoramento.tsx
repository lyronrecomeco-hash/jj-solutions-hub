import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo, useRef } from "react";
import { MapPin, Loader2, Users, Circle, Crosshair } from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { useTheme } from "@/hooks/use-theme";

export const Route = createFileRoute("/_app/monitoramento")({ component: MonitoringPage });

type Loc = { user_id: string; lat: number; lng: number; updated_at: string; accuracy: number | null; speed: number | null };
type Tech = { id: string; full_name: string; photo_url: string | null; specialty: string | null };

const DEFAULT_CENTER: [number, number] = [-15.78, -47.93];

function dotIcon(label: string, online: boolean) {
  const color = online ? "#16a34a" : "#94a3b8";
  return L.divIcon({
    className: "tech-marker",
    html: `<div style="position:relative;display:grid;place-items:center;width:34px;height:34px;border-radius:50%;background:${color};color:white;font-weight:700;font-size:11px;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.35)">${label}<span style="position:absolute;bottom:-5px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:7px solid ${color}"></span></div>`,
    iconSize: [34, 40], iconAnchor: [17, 40],
  });
}

function FlyTo({ pos }: { pos: [number, number] | null }) {
  const map = useMap();
  useEffect(() => { if (pos) map.flyTo(pos, Math.max(map.getZoom(), 15), { duration: 0.6 }); }, [pos?.[0], pos?.[1]]); // eslint-disable-line
  return null;
}

// Lightweight reverse geocoding via Nominatim (caches per coarse coord).
const geocodeCache = new Map<string, string>();
async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const key = `${lat.toFixed(3)},${lng.toFixed(3)}`;
  if (geocodeCache.has(key)) return geocodeCache.get(key)!;
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`, {
      headers: { "Accept-Language": "pt-BR" },
    });
    const j = await res.json();
    const a = j.address ?? {};
    const street = a.road || a.pedestrian || a.cycleway || "";
    const num = a.house_number ? `, ${a.house_number}` : "";
    const district = a.suburb || a.neighbourhood || a.city_district || "";
    const city = a.city || a.town || a.village || a.municipality || "";
    const text = [`${street}${num}`.trim(), district, city].filter(Boolean).join(" · ");
    const fallback = j.display_name?.split(",").slice(0, 3).join(",").trim();
    const result = text || fallback || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    geocodeCache.set(key, result);
    return result;
  } catch {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }
}

function relTime(iso: string) {
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `há ${s}s`;
  if (s < 3600) return `há ${Math.round(s / 60)} min`;
  return `há ${Math.round(s / 3600)}h`;
}

function MonitoringPage() {
  const { theme } = useTheme();
  const [locs, setLocs] = useState<Loc[]>([]);
  const [techs, setTechs] = useState<Tech[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [addresses, setAddresses] = useState<Record<string, string>>({});
  const [, setTick] = useState(0);
  const lookedUp = useRef<Set<string>>(new Set());

  // Re-render once per second so "há Xs" stays live.
  useEffect(() => { const id = setInterval(() => setTick((t) => t + 1), 1000); return () => clearInterval(id); }, []);

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

  // Resolve addresses for new locations (rate-limited by cache key).
  useEffect(() => {
    locs.forEach(async (l) => {
      const key = `${l.user_id}|${l.lat.toFixed(3)},${l.lng.toFixed(3)}`;
      if (lookedUp.current.has(key)) return;
      lookedUp.current.add(key);
      const addr = await reverseGeocode(l.lat, l.lng);
      setAddresses((prev) => ({ ...prev, [l.user_id]: addr }));
    });
  }, [locs]);

  const techsById = useMemo(() => Object.fromEntries(techs.map((t) => [t.id, t])), [techs]);
  const onlineThreshold = Date.now() - 5 * 60_000;

  const enriched = useMemo(() => {
    return locs
      .map((l) => ({
        loc: l,
        tech: techsById[l.user_id],
        online: new Date(l.updated_at).getTime() > onlineThreshold,
        address: addresses[l.user_id],
      }))
      .filter((x) => x.tech)
      .filter((x) => !q || x.tech.full_name.toLowerCase().includes(q.toLowerCase()))
      .sort((a, b) => Number(b.online) - Number(a.online) || a.tech.full_name.localeCompare(b.tech.full_name));
  }, [locs, techsById, addresses, q, onlineThreshold]);

  const selectedLoc = enriched.find((e) => e.loc.user_id === selected)?.loc ?? enriched[0]?.loc;
  const center: [number, number] = selectedLoc ? [selectedLoc.lat, selectedLoc.lng] : DEFAULT_CENTER;
  const flyPos: [number, number] | null = selected && selectedLoc ? [selectedLoc.lat, selectedLoc.lng] : null;

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-5 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary"><MapPin className="h-5 w-5" /></div>
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Monitoramento</h1>
          <p className="text-sm text-muted-foreground">Rastreio em tempo real da equipe em campo.</p>
        </div>
        <span className="ml-auto inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs">
          <Users className="h-3.5 w-3.5" /> {enriched.filter((e) => e.online).length} online · {enriched.length} total
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        {/* Text sidebar */}
        <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-soft">
          <div className="border-b border-border p-3">
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar técnico…" className="h-9 bg-surface-muted" />
          </div>
          <div className="max-h-[68vh] overflow-y-auto divide-y divide-border">
            {loading ? (
              <div className="grid h-40 place-items-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : enriched.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-muted-foreground">Nenhum técnico transmitindo localização.</div>
            ) : enriched.map(({ loc, tech, online, address }) => {
              const initials = tech.full_name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
              const isSel = selected === loc.user_id;
              return (
                <button
                  key={loc.user_id}
                  onClick={() => setSelected(loc.user_id)}
                  className={`flex w-full items-start gap-3 px-3 py-3 text-left transition hover:bg-surface-muted/60 ${isSel ? "bg-primary/5" : ""}`}
                >
                  <Avatar className="h-10 w-10 shrink-0">
                    {tech.photo_url && <img src={tech.photo_url} alt="" className="h-full w-full object-cover" />}
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="truncate text-sm font-semibold">{tech.full_name}</div>
                      <Circle className={`h-2 w-2 shrink-0 fill-current ${online ? "text-success" : "text-muted-foreground"}`} />
                    </div>
                    {tech.specialty && <div className="truncate text-[11px] text-muted-foreground">{tech.specialty}</div>}
                    <div className="mt-1 flex items-start gap-1 text-[11px] text-muted-foreground">
                      <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                      <span className="line-clamp-2">{address ?? `${loc.lat.toFixed(5)}, ${loc.lng.toFixed(5)}`}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
                      <span>{relTime(loc.updated_at)}</span>
                      {loc.accuracy != null && <span>· ±{Math.round(loc.accuracy)}m</span>}
                      {loc.speed != null && loc.speed > 0 && <span>· {Math.round(loc.speed * 3.6)} km/h</span>}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Map */}
        <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-soft">
          <div className="h-[68vh]">
            {loading ? (
              <div className="grid h-full place-items-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : (
              <MapContainer center={center} zoom={selectedLoc ? 14 : 4} style={{ height: "100%", width: "100%" }} scrollWheelZoom attributionControl={false}>
                <TileLayer
                  url={theme === "dark"
                    ? "https://{s}.basemaps.cartocdn.com/rastertiles/dark_nolabels/{z}/{x}/{y}{r}.png"
                    : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png"}
                  subdomains="abcd" maxZoom={20} detectRetina
                />
                <TileLayer
                  url={theme === "dark"
                    ? "https://{s}.basemaps.cartocdn.com/rastertiles/dark_only_labels/{z}/{x}/{y}{r}.png"
                    : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png"}
                  subdomains="abcd" maxZoom={20} detectRetina
                />
                <FlyTo pos={flyPos} />
                {enriched.map(({ loc, tech, online }) => {
                  const initials = tech.full_name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
                  return (
                    <Marker
                      key={loc.user_id}
                      position={[loc.lat, loc.lng]}
                      icon={dotIcon(initials, online)}
                      eventHandlers={{ click: () => setSelected(loc.user_id) }}
                    >
                      <Popup>
                        <div className="text-sm">
                          <div className="font-semibold">{tech.full_name}</div>
                          {tech.specialty && <div className="text-xs text-muted-foreground">{tech.specialty}</div>}
                          <div className="mt-1 text-[11px] text-muted-foreground">
                            {addresses[loc.user_id] ?? `${loc.lat.toFixed(5)}, ${loc.lng.toFixed(5)}`}
                          </div>
                          <div className="text-[11px] text-muted-foreground">{relTime(loc.updated_at)}</div>
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

      <p className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Crosshair className="h-3 w-3" /> Posições atualizadas em tempo real conforme o técnico se desloca.
      </p>
    </div>
  );
}
