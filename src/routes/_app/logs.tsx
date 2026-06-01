import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ScrollText, Loader2, Search } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_app/logs")({ component: LogsPage });

type Log = { id: string; user_id: string | null; action: string; entity: string | null; entity_id: string | null; details: any; created_at: string };

function LogsPage() {
  const [q, setQ] = useState("");

  const { data: ticketHistory = [], isLoading } = useQuery({
    queryKey: ["audit-feed"],
    queryFn: async () => {
      const [{ data: th }, { data: audit }] = await Promise.all([
        supabase.from("ticket_history").select("id, action, ticket_id, user_id, created_at, details").order("created_at", { ascending: false }).limit(200),
        (supabase.from("audit_logs") as any).select("id, action, entity, entity_id, user_id, details, created_at").order("created_at", { ascending: false }).limit(200),
      ]);
      const a = (th ?? []).map((r: any) => ({ id: r.id, action: r.action, entity: "ticket", entity_id: r.ticket_id, user_id: r.user_id, details: r.details, created_at: r.created_at }));
      const b = (audit ?? []) as Log[];
      return [...a, ...b].sort((x, y) => y.created_at.localeCompare(x.created_at));
    },
  });

  const rows = useMemo(() => ticketHistory.filter((r) => !q || [r.action, r.entity, r.entity_id].join(" ").toLowerCase().includes(q.toLowerCase())), [ticketHistory, q]);

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-6 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary"><ScrollText className="h-5 w-5" /></div>
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Logs & Auditoria</h1>
          <p className="text-sm text-muted-foreground">Rastreio cronológico das ações na plataforma.</p>
        </div>
      </header>

      <div className="mb-4 max-w-sm">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar ação, entidade ou ID…" className="h-10 pl-9 bg-surface-muted" />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-soft">
        {isLoading ? (
          <div className="py-16 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : rows.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">Nenhum evento registrado.</div>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((r) => (
              <li key={r.id} className="flex items-start gap-4 px-4 py-3.5">
                <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{r.action}</span>
                    {r.entity && <Badge variant="outline" className="text-[10px] uppercase">{r.entity}</Badge>}
                  </div>
                  {r.entity_id && <div className="font-mono text-[11px] text-muted-foreground">{r.entity_id}</div>}
                </div>
                <div className="text-[11px] text-muted-foreground">{new Date(r.created_at).toLocaleString("pt-BR")}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
