import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Check, X, Loader2, ClipboardList, ChevronLeft, ChevronRight, Mail, Phone, MapPin } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { reviewTechnicianSignup } from "@/lib/api/technicians.functions";

export const Route = createFileRoute("/_app/cadastros-pendentes")({ component: PendingPage });

type Row = {
  id: string; full_name: string; email: string; phone: string | null;
  specialty: string | null; desired_employment_type: string; city: string | null; state: string | null;
  status: "pending" | "approved" | "rejected"; created_at: string;
};

const PAGE = 10;

function PendingPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [page, setPage] = useState(1);
  const review = useServerFn(reviewTechnicianSignup);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("technician_signups")
      .select("id, full_name, email, phone, specialty, desired_employment_type, city, state, status, created_at")
      .order("created_at", { ascending: false });
    setRows((data ?? []) as Row[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const filtered = rows.filter((r) => {
    if (filter !== "all" && r.status !== filter) return false;
    if (q && ![r.full_name, r.email, r.specialty, r.city].filter(Boolean).join(" ").toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const slice = filtered.slice((page - 1) * PAGE, page * PAGE);

  useEffect(() => { setPage(1); }, [q, filter]);

  async function decide(id: string, decision: "approved" | "rejected") {
    try {
      await review({ data: { signup_id: id, decision } });
      toast.success(decision === "approved" ? "Cadastro aprovado" : "Cadastro rejeitado");
      load();
    } catch (e: any) { toast.error("Erro", { description: e?.message ?? String(e) }); }
  }

  const counts = {
    pending: rows.filter((r) => r.status === "pending").length,
    approved: rows.filter((r) => r.status === "approved").length,
    rejected: rows.filter((r) => r.status === "rejected").length,
  };

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary"><ClipboardList className="h-5 w-5" /></div>
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Cadastros Pendentes</h1>
          <p className="text-sm text-muted-foreground">Solicitações de auto-cadastro de técnicos.</p>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-3 sm:max-w-md">
        <Stat label="Pendentes" value={counts.pending} tone="warning" />
        <Stat label="Aprovados" value={counts.approved} tone="success" />
        <Stat label="Rejeitados" value={counts.rejected} tone="destructive" />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar nome, email, cidade…" className="h-10 bg-surface-muted" />
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
          <SelectTrigger className="h-10 w-[180px] bg-surface-muted"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pending">Pendentes</SelectItem>
            <SelectItem value="approved">Aprovados</SelectItem>
            <SelectItem value="rejected">Rejeitados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
      {!loading && filtered.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-surface-muted p-10 text-center text-sm text-muted-foreground">
          Nenhuma solicitação encontrada.
        </div>
      )}

      <div className="grid gap-3">
        {slice.map((r) => (
          <div key={r.id} className="rounded-xl border border-border bg-surface p-5 shadow-soft">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-semibold">{r.full_name}</h3>
                  <Badge variant={r.status === "pending" ? "outline" : r.status === "approved" ? "default" : "destructive"}>{r.status}</Badge>
                  <Badge variant="outline" className="uppercase">{r.desired_employment_type}</Badge>
                </div>
                <div className="mt-1.5 grid grid-cols-1 gap-1 text-xs text-muted-foreground sm:grid-cols-3">
                  <span className="inline-flex items-center gap-1.5"><Mail className="h-3 w-3" />{r.email}</span>
                  {r.phone && <span className="inline-flex items-center gap-1.5"><Phone className="h-3 w-3" />{r.phone}</span>}
                  {(r.city || r.state) && <span className="inline-flex items-center gap-1.5"><MapPin className="h-3 w-3" />{[r.city, r.state].filter(Boolean).join(" / ")}</span>}
                </div>
                {r.specialty && <div className="mt-1 text-xs">Especialidade: <span className="font-medium">{r.specialty}</span></div>}
                <div className="mt-1 text-[11px] text-muted-foreground">Enviado em {new Date(r.created_at).toLocaleString("pt-BR")}</div>
              </div>
              {r.status === "pending" && (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => decide(r.id, "rejected")}><X className="h-4 w-4" /> Rejeitar</Button>
                  <Button size="sm" onClick={() => decide(r.id, "approved")}><Check className="h-4 w-4" /> Aprovar</Button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="mt-5 flex items-center justify-between text-xs text-muted-foreground">
          <span>Página {page} de {totalPages} · {filtered.length} resultados</span>
          <div className="flex gap-1">
            <Button size="icon" variant="outline" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
            <Button size="icon" variant="outline" className="h-8 w-8" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: "warning" | "success" | "destructive" }) {
  const cls = { warning: "text-warning-foreground bg-warning/15", success: "text-success bg-success/10", destructive: "text-destructive bg-destructive/10" }[tone];
  return (
    <div className={`rounded-xl border border-border p-3 ${cls}`}>
      <div className="text-[10px] font-semibold uppercase tracking-wider opacity-80">{label}</div>
      <div className="mt-0.5 font-display text-xl font-semibold">{value}</div>
    </div>
  );
}
