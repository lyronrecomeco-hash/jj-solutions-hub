import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Check, X, Loader2, ClipboardList, ChevronLeft, ChevronRight, Eye, Pause, Trash2, Mail, Phone, MapPin, Calendar, IdCard } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { reviewTechnicianSignup } from "@/lib/api/technicians.functions";
import { holdTechnicianSignup, deleteTechnicianSignup } from "@/lib/api/signups.functions";

export const Route = createFileRoute("/_app/cadastros-pendentes")({ component: PendingPage });

type Row = {
  id: string; full_name: string; email: string; phone: string | null;
  specialty: string | null; desired_employment_type: string; city: string | null; state: string | null;
  address: string | null; cpf: string | null; rg: string | null; birth_date: string | null;
  status: "pending" | "approved" | "rejected" | "on_hold"; created_at: string;
};

const PAGE = 10;

function PendingPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected" | "on_hold">("pending");
  const [page, setPage] = useState(1);
  const [viewing, setViewing] = useState<Row | null>(null);
  const [confirmDel, setConfirmDel] = useState<Row | null>(null);

  const review = useServerFn(reviewTechnicianSignup);
  const hold = useServerFn(holdTechnicianSignup);
  const del = useServerFn(deleteTechnicianSignup);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("technician_signups")
      .select("id, full_name, email, phone, specialty, desired_employment_type, city, state, address, cpf, rg, birth_date, status, created_at")
      .order("created_at", { ascending: false });
    setRows((data ?? []) as Row[]);
    setLoading(false);
  }
  useEffect(() => {
    load();
    const ch = supabase
      .channel("signups-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "technician_signups" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

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
  async function holdOne(id: string) {
    try { await hold({ data: { signup_id: id } }); toast.success("Cadastro em espera"); load(); }
    catch (e: any) { toast.error("Erro", { description: e?.message ?? String(e) }); }
  }
  async function removeOne(id: string) {
    try { await del({ data: { signup_id: id } }); toast.success("Cadastro removido"); setConfirmDel(null); load(); }
    catch (e: any) { toast.error("Erro", { description: e?.message ?? String(e) }); }
  }

  const counts = {
    pending: rows.filter((r) => r.status === "pending").length,
    approved: rows.filter((r) => r.status === "approved").length,
    rejected: rows.filter((r) => r.status === "rejected").length,
    on_hold: rows.filter((r) => r.status === "on_hold").length,
  };

  const statusBadge = (s: Row["status"]) => {
    const map: Record<Row["status"], { v: any; label: string }> = {
      pending: { v: "outline", label: "Pendente" },
      approved: { v: "default", label: "Aprovado" },
      rejected: { v: "destructive", label: "Rejeitado" },
      on_hold: { v: "secondary", label: "Em espera" },
    };
    const m = map[s];
    return <Badge variant={m.v}>{m.label}</Badge>;
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

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:max-w-3xl">
        <Stat label="Pendentes" value={counts.pending} tone="warning" />
        <Stat label="Em espera" value={counts.on_hold} tone="muted" />
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
            <SelectItem value="on_hold">Em espera</SelectItem>
            <SelectItem value="approved">Aprovados</SelectItem>
            <SelectItem value="rejected">Rejeitados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-soft">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-muted/60 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">E-mail</th>
                <th className="px-4 py-3">Cidade</th>
                <th className="px-4 py-3">Enviado</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></td></tr>
              ) : slice.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">Nenhuma solicitação encontrada.</td></tr>
              ) : slice.map((r) => (
                <tr key={r.id} className="hover:bg-surface-muted/40">
                  <td className="px-4 py-3 font-medium">{r.full_name}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{r.email}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{[r.city, r.state].filter(Boolean).join(" / ") || "—"}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString("pt-BR")}</td>
                  <td className="px-4 py-3">{statusBadge(r.status)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setViewing(r)} title="Ver"><Eye className="h-4 w-4" /></Button>
                      {r.status === "pending" && (
                        <>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-success hover:text-success" onClick={() => decide(r.id, "approved")} title="Aprovar"><Check className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => decide(r.id, "rejected")} title="Rejeitar"><X className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => holdOne(r.id)} title="Em espera"><Pause className="h-4 w-4" /></Button>
                        </>
                      )}
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setConfirmDel(r)} title="Excluir"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border bg-surface-muted/40 px-4 py-2.5 text-xs text-muted-foreground">
            <span>Página {page} de {totalPages} · {filtered.length} resultados</span>
            <div className="flex gap-1">
              <Button size="icon" variant="outline" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
              <Button size="icon" variant="outline" className="h-8 w-8" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
        )}
      </div>

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{viewing?.full_name}</DialogTitle></DialogHeader>
          {viewing && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                {statusBadge(viewing.status)}
                <Badge variant="outline" className="uppercase">{viewing.desired_employment_type}</Badge>
                {viewing.specialty && <Badge variant="secondary">{viewing.specialty}</Badge>}
              </div>
              <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <Info icon={Mail} label="E-mail" v={viewing.email} />
                <Info icon={Phone} label="Telefone" v={viewing.phone} />
                <Info icon={IdCard} label="CPF" v={viewing.cpf} />
                <Info icon={IdCard} label="RG" v={viewing.rg} />
                <Info icon={Calendar} label="Nascimento" v={viewing.birth_date ? new Date(viewing.birth_date).toLocaleDateString("pt-BR") : null} />
                <Info icon={MapPin} label="Cidade" v={[viewing.city, viewing.state].filter(Boolean).join(" / ")} />
                <Info icon={MapPin} label="Endereço" v={viewing.address} full />
              </div>
              <div className="text-[11px] text-muted-foreground">Enviado em {new Date(viewing.created_at).toLocaleString("pt-BR")}</div>
              {viewing.status === "pending" && (
                <div className="flex flex-wrap gap-2 border-t border-border pt-4">
                  <Button onClick={() => { decide(viewing.id, "approved"); setViewing(null); }}><Check className="h-4 w-4" /> Aprovar</Button>
                  <Button variant="outline" onClick={() => { decide(viewing.id, "rejected"); setViewing(null); }}><X className="h-4 w-4" /> Rejeitar</Button>
                  <Button variant="outline" onClick={() => { holdOne(viewing.id); setViewing(null); }}><Pause className="h-4 w-4" /> Em espera</Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover cadastro?</AlertDialogTitle>
            <AlertDialogDescription>A solicitação de {confirmDel?.full_name} será excluída definitivamente.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmDel && removeOne(confirmDel.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: "warning" | "success" | "destructive" | "muted" }) {
  const cls = {
    warning: "text-warning-foreground bg-warning/15",
    success: "text-success bg-success/10",
    destructive: "text-destructive bg-destructive/10",
    muted: "text-muted-foreground bg-surface-muted",
  }[tone];
  return (
    <div className={`rounded-xl border border-border p-3 ${cls}`}>
      <div className="text-[10px] font-semibold uppercase tracking-wider opacity-80">{label}</div>
      <div className="mt-0.5 font-display text-xl font-semibold">{value}</div>
    </div>
  );
}

function Info({ icon: Icon, label, v, full }: { icon: any; label: string; v: string | null | undefined; full?: boolean }) {
  return (
    <div className={`rounded-lg border border-border bg-surface-muted/40 px-3 py-2 ${full ? "sm:col-span-2" : ""}`}>
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"><Icon className="h-3 w-3" />{label}</div>
      <div className="mt-0.5 text-sm">{v || "—"}</div>
    </div>
  );
}
