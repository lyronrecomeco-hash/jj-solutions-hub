import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { UserCog, Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_app/atribuicao")({ component: AssignmentPage });

function AssignmentPage() {
  const qc = useQueryClient();
  const [assigning, setAssigning] = useState<Record<string, string>>({});

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["unassigned-tickets"],
    queryFn: async () => {
      const { data } = await supabase
        .from("tickets")
        .select("id, ticket_number, title, priority, status, created_at, clients(company)")
        .is("assigned_to", null)
        .order("created_at", { ascending: false });
      return (data ?? []) as any[];
    },
  });

  const { data: techs = [] } = useQuery({
    queryKey: ["techs-assign"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, full_name, specialty").order("full_name");
      return data ?? [];
    },
  });

  const assign = useMutation({
    mutationFn: async ({ ticket_id, user_id }: { ticket_id: string; user_id: string }) => {
      const { error } = await supabase.from("tickets").update({ assigned_to: user_id, status: "in_progress" }).eq("id", ticket_id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { toast.success("Chamado atribuído"); qc.invalidateQueries({ queryKey: ["unassigned-tickets"] }); },
    onError: (e: any) => toast.error("Falha", { description: e?.message }),
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
        <div className="border-b border-border p-4 text-sm font-semibold">Chamados sem responsável <span className="ml-2 text-muted-foreground">({tickets.length})</span></div>
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
                <div className="flex items-center gap-2">
                  <Select value={assigning[t.id] ?? ""} onValueChange={(v) => setAssigning((a) => ({ ...a, [t.id]: v }))}>
                    <SelectTrigger className="h-9 w-[220px] bg-surface-muted"><SelectValue placeholder="Selecionar técnico" /></SelectTrigger>
                    <SelectContent>
                      {techs.map((tech: any) => (
                        <SelectItem key={tech.id} value={tech.id}>{tech.full_name}{tech.specialty ? ` · ${tech.specialty}` : ""}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button size="sm" disabled={!assigning[t.id] || assign.isPending} onClick={() => assign.mutate({ ticket_id: t.id, user_id: assigning[t.id] })}>
                    Atribuir <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
