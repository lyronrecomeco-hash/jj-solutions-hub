import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Loader2, MapPin, Navigation, ExternalLink } from "lucide-react";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/hooks/use-theme";

type Loc = { user_id: string; lat: number; lng: number; updated_at: string; accuracy: number | null; speed: number | null };
type Tech = { id: string; full_name: string };

const techIcon = L.divIcon({
  className: "tech-marker",
  html: `<div style="position:relative;width:20px;height:20px;border-radius:50%;background:#2563eb;border:3px solid white;box-shadow:0 0 0 6px rgba(37,99,235,0.18), 0 2px 8px rgba(0,0,0,0.35)"><span style="position:absolute;inset:-6px;border-radius:50%;border:2px solid rgba(37,99,235,0.45);animation:pulse 2s infinite"></span></div>`,
  iconSize: [20, 20], iconAnchor: [10, 10],
});

function FlyTo({ pos }: { pos: [number, number] }) {
  const map = useMap();
  useEffect(() => { map.flyTo(pos, Math.max(map.getZoom() ?? 15, 15), { duration: 0.6 }); }, [pos[0], pos[1]]); // eslint-disable-line
  return null;
}

const geocodeCache = new Map<string, string>();
async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  if (geocodeCache.has(key)) return geocodeCache.get(key)!;
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=17&addressdetails=1`, {
      headers: { "Accept-Language": "pt-BR" },
    });
    const j = await res.json();
    const a = j.address ?? {};
    const street = a.road || a.pedestrian || "";
    const num = a.house_number ? `, ${a.house_number}` : "";
    const district = a.suburb || a.neighbourhood || "";
    const city = a.city || a.town || a.village || "";
    const text = [`${street}${num}`.trim(), district, city].filter(Boolean).join(" · ");
    const out = text || j.display_name?.split(",").slice(0, 3).join(",").trim() || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    geocodeCache.set(key, out);
    return out;
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

export function TrackingModal({ tech, open, onOpenChange }: { tech: Tech | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { theme } = useTheme();
  const [loc, setLoc] = useState<Loc | null>(null);
  const [loading, setLoading] = useState(true);
  const [address, setAddress] = useState<string>("");
  const [, setTick] = useState(0);

  useEffect(() => { const id = setInterval(() => setTick((t) => t + 1), 1000); return () => clearInterval(id); }, []);

  useEffect(() => {
    if (!tech || !open) { setLoc(null); setAddress(""); return; }
    setLoading(true);
    (supabase.from("technician_locations") as any).select("*").eq("user_id", tech.id).maybeSingle()
      .then(({ data }: any) => { setLoc(data); setLoading(false); });
    const ch = supabase
      .channel(`track:${tech.id}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "technician_locations", filter: `user_id=eq.${tech.id}` },
        (payload) => setLoc(payload.new as Loc))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [tech, open]);

  useEffect(() => {
    if (loc) reverseGeocode(loc.lat, loc.lng).then(setAddress);
  }, [loc?.lat, loc?.lng]); // eslint-disable-line

  const tilesUrl = theme === "dark"
    ? "https://{s}.basemaps.cartocdn.com/rastertiles/dark_nolabels/{z}/{x}/{y}{r}.png"
    : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png";
  const labelsUrl = theme === "dark"
    ? "https://{s}.basemaps.cartocdn.com/rastertiles/dark_only_labels/{z}/{x}/{y}{r}.png"
    : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] p-0 overflow-hidden">
        <DialogHeader className="border-b border-border px-5 py-3">
          <DialogTitle className="flex items-center gap-2 text-base">
            <MapPin className="h-4 w-4 text-primary" /> Rastreio · {tech?.full_name}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {loc ? `Atualizado ${relTime(loc.updated_at)} · ${new Date(loc.updated_at).toLocaleString("pt-BR")}` : "Aguardando última posição…"}
          </DialogDescription>
        </DialogHeader>
        <div className="grid md:grid-cols-[300px_1fr]">
          {/* Side info */}
          <div className="border-b border-border bg-surface-muted/30 p-4 text-sm md:border-b-0 md:border-r">
            {!loc ? (
              <div className="py-6 text-center text-xs text-muted-foreground">Sem localização registrada.</div>
            ) : (
              <div className="space-y-3">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Endereço aproximado</div>
                  <div className="mt-0.5 text-sm font-medium leading-snug">{address || "Carregando endereço…"}</div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <div className="text-muted-foreground">Precisão</div>
                    <div className="font-semibold">{loc.accuracy ? `±${Math.round(loc.accuracy)}m` : "—"}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Velocidade</div>
                    <div className="font-semibold">{loc.speed != null && loc.speed > 0 ? `${Math.round(loc.speed * 3.6)} km/h` : "Parado"}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Latitude</div>
                    <div className="font-mono text-[11px]">{loc.lat.toFixed(6)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Longitude</div>
                    <div className="font-mono text-[11px]">{loc.lng.toFixed(6)}</div>
                  </div>
                </div>
                <div className="rounded-md border border-border bg-surface px-3 py-2 text-[11px] text-muted-foreground">
                  <Navigation className="mr-1 inline h-3 w-3" /> Atualização ao vivo enquanto o técnico estiver online.
                </div>
                <Button asChild variant="outline" size="sm" className="w-full">
                  <a href={`https://www.google.com/maps?q=${loc.lat},${loc.lng}`} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3.5 w-3.5" /> Abrir no Google Maps
                  </a>
                </Button>
              </div>
            )}
          </div>

          {/* Map */}
          <div className="h-[60vh] bg-surface-muted md:h-[520px]">
            {loading ? (
              <div className="grid h-full place-items-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : !loc ? (
              <div className="grid h-full place-items-center px-6 text-center text-sm text-muted-foreground">
                Sem localização. O técnico precisa estar logado e ter permitido o acesso à localização.
              </div>
            ) : (
              <MapContainer
                center={[loc.lat, loc.lng]}
                zoom={16}
                style={{ height: "100%", width: "100%" }}
                scrollWheelZoom
                zoomControl
                attributionControl={false}
              >
                <TileLayer url={tilesUrl} subdomains="abcd" maxZoom={20} detectRetina />
                <TileLayer url={labelsUrl} subdomains="abcd" maxZoom={20} detectRetina />
                <FlyTo pos={[loc.lat, loc.lng]} />
                <Marker position={[loc.lat, loc.lng]} icon={techIcon}>
                  <Popup>
                    <strong>{tech?.full_name}</strong><br />
                    {address || `${loc.lat.toFixed(5)}, ${loc.lng.toFixed(5)}`}
                  </Popup>
                </Marker>
              </MapContainer>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
