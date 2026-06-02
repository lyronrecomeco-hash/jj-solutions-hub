import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { UserCog, Loader2, UserPlus } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AssignTechDialog } from "@/components/assign-tech-dialog";

export const Route = createFileRoute("/_app/atribuicao")({ component: AssignmentPage });

function AssignmentPage() {
  const [target, setTarget] = useState<{ id: string; number: string } | null>(null);

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["unassigned-tickets"],
    queryFn: async () => {
      const { data } = await supabase
        .from("tickets")
        .select("id, ticket_number, title, priority, status, created_at, clients(company)")
        .is("assigned_to", null)
        .not("status", "in", "(cancelled,closed)")
        .order("created_at", { ascending: false });
      return (data ?? []) as any[];
    },
  });

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-6 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary"><UserCog className="h-5 w-5" /></div>
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Atribuição de Chamados</h1>
          <p className="text-sm text-muted-foreground">Distribua chamados pendentes para a equipe técnica.</p>
        </div>
      </header>

      <div className="rounded-xl border border-border bg-surface shadow-soft">
        <div className="border-b border-border p-4 text-sm font-semibold">
          Chamados sem responsável <span className="ml-2 text-muted-foreground">({tickets.length})</span>
        </div>
        {isLoading ? (
          <div className="py-16 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : tickets.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">Tudo distribuído. Bom trabalho.</div>
        ) : (
          <ul className="divide-y divide-border">
            {tickets.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center gap-3 px-4 py-3.5">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-medium text-muted-foreground">{t.ticket_number}</span>
                    <Badge variant="outline" className="text-[10px] uppercase">{t.priority}</Badge>
                  </div>
                  <div className="mt-0.5 truncate text-sm font-semibold">{t.title}</div>
                  <div className="text-xs text-muted-foreground">{t.clients?.company ?? "Sem cliente"}</div>
                </div>
                <Button size="sm" onClick={() => setTarget({ id: t.id, number: t.ticket_number })}>
                  <UserPlus className="h-3.5 w-3.5" /> Atribuir
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <AssignTechDialog
        ticketId={target?.id ?? null}
        ticketNumber={target?.number}
        open={!!target}
        onOpenChange={(o) => !o && setTarget(null)}
      />
    </div>
  );
}

