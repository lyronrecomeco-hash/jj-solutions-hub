import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ScrollText, Loader2, Search, Activity, Filter } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_app/logs")({ component: LogsPage });

type Log = {
  id: string;
  actor_id: string | null;
  actor_email: string | null;
  action: string;
  entity: string | null;
  entity_id: string | null;
  level: string;
  metadata: any;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
};

const LEVEL_CLS: Record<string, string> = {
  info: "bg-info/10 text-info border-info/30",
  warn: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40",
  error: "bg-destructive/10 text-destructive border-destructive/30",
};

function LogsPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [entity, setEntity] = useState<string>("all");

  useEffect(() => {
    (supabase.from("system_logs") as any)
      .select("*").order("created_at", { ascending: false }).limit(500)
      .then(({ data }: any) => { setLogs((data ?? []) as Log[]); setLoading(false); });
    const ch = supabase
      .channel("system-logs-feed")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "system_logs" },
        (payload) => setLogs((prev) => [payload.new as Log, ...prev].slice(0, 500)))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const entities = useMemo(() => Array.from(new Set(logs.map((l) => l.entity).filter(Boolean))) as string[], [logs]);

  const rows = useMemo(() => logs.filter((r) => {
    if (entity !== "all" && r.entity !== entity) return false;
    if (q && ![r.action, r.entity, r.entity_id, r.actor_email, JSON.stringify(r.metadata)].join(" ").toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  }), [logs, entity, q]);

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-6 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary"><ScrollText className="h-5 w-5" /></div>
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Logs & Auditoria</h1>
          <p className="text-sm text-muted-foreground">Eventos em tempo real · registrados automaticamente pelo sistema.</p>
        </div>
        <span className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-3 py-1 text-[11px] font-medium text-success">
          <Activity className="h-3 w-3 animate-pulse" /> Ao vivo
        </span>
      </header>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar ação, ator, entidade…" className="h-10 pl-9 bg-surface-muted" />
        </div>
        <Select value={entity} onValueChange={setEntity}>
          <SelectTrigger className="h-10 w-[180px] bg-surface-muted"><Filter className="h-3.5 w-3.5 mr-1" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas entidades</SelectItem>
            {entities.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-soft">
        {loading ? (
          <div className="py-16 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : rows.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">Nenhum evento registrado ainda.</div>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((r) => (
              <li key={r.id} className="flex items-start gap-3 px-4 py-3">
                <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${r.level === "warn" ? "bg-amber-500" : r.level === "error" ? "bg-destructive" : "bg-primary"}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-semibold">{r.action}</span>
                    {r.entity && <Badge variant="outline" className="text-[10px] uppercase">{r.entity}</Badge>}
                    {r.level !== "info" && <Badge variant="outline" className={`text-[10px] uppercase ${LEVEL_CLS[r.level] ?? ""}`}>{r.level}</Badge>}
                  </div>
                  {r.metadata && (
                    <div className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
                      {Object.entries(r.metadata).slice(0, 4).map(([k, v]) => `${k}: ${String(v)}`).join(" · ")}
                    </div>
                  )}
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
                    {r.actor_email && <span>{r.actor_email}</span>}
                    {r.entity_id && <span className="font-mono">#{r.entity_id.slice(0, 8)}</span>}
                  </div>
                </div>
                <div className="text-right text-[11px] text-muted-foreground">
                  <div>{new Date(r.created_at).toLocaleTimeString("pt-BR")}</div>
                  <div className="text-[10px]">{new Date(r.created_at).toLocaleDateString("pt-BR")}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
