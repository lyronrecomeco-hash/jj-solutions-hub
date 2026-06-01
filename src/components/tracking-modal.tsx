import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Loader2, MapPin } from "lucide-react";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";

type Loc = { user_id: string; lat: number; lng: number; updated_at: string };
type Tech = { id: string; full_name: string };

const techIcon = L.divIcon({
  className: "tech-marker",
  html: `<div style="width:24px;height:24px;border-radius:50%;background:#2563eb;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.35)"></div>`,
  iconSize: [24, 24], iconAnchor: [12, 12],
});

function Recenter({ pos }: { pos: [number, number] }) {
  const map = useMap();
  useEffect(() => { map.setView(pos, map.getZoom() ?? 13); }, [pos[0], pos[1]]); // eslint-disable-line
  return null;
}

export function TrackingModal({ tech, open, onOpenChange }: { tech: Tech | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  const [loc, setLoc] = useState<Loc | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tech || !open) { setLoc(null); return; }
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden">
        <DialogHeader className="border-b border-border px-5 py-3">
          <DialogTitle className="flex items-center gap-2 text-base">
            <MapPin className="h-4 w-4 text-primary" /> Rastreio · {tech?.full_name}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {loc ? `Atualizado em ${new Date(loc.updated_at).toLocaleString("pt-BR")}` : "Aguardando última posição…"}
          </DialogDescription>
        </DialogHeader>
        <div className="h-[480px] bg-surface-muted">
          {loading ? (
            <div className="grid h-full place-items-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : !loc ? (
            <div className="grid h-full place-items-center px-6 text-center text-sm text-muted-foreground">
              Sem localização registrada. O técnico precisa estar logado e ter concedido permissão de localização.
            </div>
          ) : (
            <MapContainer center={[loc.lat, loc.lng]} zoom={14} style={{ height: "100%", width: "100%" }} scrollWheelZoom>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
              <Recenter pos={[loc.lat, loc.lng]} />
              <Marker position={[loc.lat, loc.lng]} icon={techIcon}>
                <Popup>
                  <strong>{tech?.full_name}</strong><br />
                  {loc.lat.toFixed(5)}, {loc.lng.toFixed(5)}
                </Popup>
              </Marker>
            </MapContainer>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
