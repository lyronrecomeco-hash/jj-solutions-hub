import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Check, X, Loader2, ClipboardList } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { reviewTechnicianSignup } from "@/lib/api/technicians.functions";

export const Route = createFileRoute("/_app/cadastros-pendentes")({ component: PendingPage });

type Row = {
  id: string; full_name: string; email: string; phone: string | null;
  specialty: string | null; desired_employment_type: string;
  status: "pending" | "approved" | "rejected"; created_at: string;
};

function PendingPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const review = useServerFn(reviewTechnicianSignup);

  async function load() {
    const { data } = await supabase
      .from("technician_signups")
      .select("id, full_name, email, phone, specialty, desired_employment_type, status, created_at")
      .order("created_at", { ascending: false });
    setRows((data ?? []) as Row[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function decide(id: string, decision: "approved" | "rejected") {
    try {
      await review({ data: { signup_id: id, decision } });
      toast.success(decision === "approved" ? "Cadastro aprovado" : "Cadastro rejeitado");
      load();
    } catch (e: any) {
      toast.error("Erro", { description: e?.message ?? String(e) });
    }
  }

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <ClipboardList className="h-5 w-5" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Cadastros Pendentes</h1>
          <p className="text-sm text-muted-foreground">Solicitações de auto-cadastro de técnicos.</p>
        </div>
      </div>

      {loading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
      {!loading && rows.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-surface-muted p-10 text-center text-sm text-muted-foreground">
          Nenhuma solicitação pendente.
        </div>
      )}

      <div className="grid gap-3">
        {rows.map((r) => (
          <div key={r.id} className="rounded-xl border border-border bg-surface p-5 shadow-soft">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold">{r.full_name}</h3>
                  <Badge variant={r.status === "pending" ? "outline" : r.status === "approved" ? "default" : "destructive"}>
                    {r.status}
                  </Badge>
                  <Badge variant="outline" className="uppercase">{r.desired_employment_type}</Badge>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {r.email} {r.phone && `· ${r.phone}`} {r.specialty && `· ${r.specialty}`}
                </div>
              </div>
              {r.status === "pending" && (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => decide(r.id, "rejected")}>
                    <X className="h-4 w-4" /> Rejeitar
                  </Button>
                  <Button size="sm" onClick={() => decide(r.id, "approved")}>
                    <Check className="h-4 w-4" /> Aprovar
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
