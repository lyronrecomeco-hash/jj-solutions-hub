import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Search, IdCard, Pencil, Trash2, Eye, BarChart3, Mail, Phone, Loader2, MapPin } from "lucide-react";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CrachaModal } from "@/components/cracha-modal";
import { TechnicianFormSheet } from "@/components/technician-form-sheet";
import { TechnicianViewSheet } from "@/components/technician-view-sheet";
import { TrackingModal } from "@/components/tracking-modal";
import { deleteTechnician, updateTechnician } from "@/lib/api/technicians.functions";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_app/tecnicos")({ component: TechniciansPage });

type Row = {
  id: string; full_name: string; email: string; phone: string | null;
  specialty: string | null; job_title: string | null; registration_code: string | null;
  employment_type: "field" | "clt" | "pj" | "internal"; photo_url: string | null; status: string;
};

const employmentLabel: Record<Row["employment_type"], { label: string; cls: string }> = {
  field:    { label: "Field",   cls: "bg-info/15 text-info border-info/30" },
  clt:      { label: "CLT",     cls: "bg-success/15 text-success border-success/30" },
  pj:       { label: "PJ",      cls: "bg-warning/15 text-warning-foreground border-warning/30" },
  internal: { label: "Interno", cls: "bg-primary/15 text-primary border-primary/30" },
};

function TechniciansPage() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [viewFor, setViewFor] = useState<Row | null>(null);
  const [badgeFor, setBadgeFor] = useState<Row | null>(null);
  const [editFor, setEditFor] = useState<Row | null>(null);
  const [statsFor, setStatsFor] = useState<Row | null>(null);
  const [deleteFor, setDeleteFor] = useState<Row | null>(null);
  const [trackFor, setTrackFor] = useState<Row | null>(null);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["technicians"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone, specialty, job_title, registration_code, employment_type, photo_url, status")
        .order("full_name");
      return (data ?? []) as Row[];
    },
  });

  const delFn = useServerFn(deleteTechnician);
  const delMut = useMutation({
    mutationFn: (id: string) => delFn({ data: { user_id: id } }),
    onSuccess: () => { toast.success("Técnico excluído"); qc.invalidateQueries({ queryKey: ["technicians"] }); setDeleteFor(null); },
    onError: (e: any) => toast.error("Falha ao excluir", { description: e?.message }),
  });

  const filtered = rows.filter((r) =>
    [r.full_name, r.email, r.specialty, r.registration_code].filter(Boolean).some((v) => v!.toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Equipe</p>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Equipe Técnica</h1>
          <p className="text-sm text-muted-foreground">Gerencie técnicos, vínculos, crachás e desempenho.</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" /> Adicionar técnico
          </Button>
        )}
      </div>

      <div className="mb-4 max-w-sm">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome, email, especialidade, matrícula…" className="h-10 pl-9 bg-surface-muted" />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-soft">
        <Table>
          <TableHeader>
            <TableRow className="bg-surface-muted/70">
              <TableHead>Técnico</TableHead><TableHead>Especialidade</TableHead><TableHead>Vínculo</TableHead>
              <TableHead>Matrícula</TableHead><TableHead>Contato</TableHead><TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={7} className="py-10 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></TableCell></TableRow>}
            {!isLoading && filtered.length === 0 && <TableRow><TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">Nenhum técnico encontrado.</TableCell></TableRow>}
            {filtered.map((r) => {
              const initials = r.full_name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
              const emp = employmentLabel[r.employment_type] ?? employmentLabel.field;
              return (
                <TableRow key={r.id} className="hover:bg-surface-muted/40">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        {r.photo_url && <img src={r.photo_url} alt="" className="h-full w-full object-cover" />}
                        <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">{initials}</AvatarFallback>
                      </Avatar>
                      <div className="leading-tight">
                        <div className="text-sm font-semibold">{r.full_name}</div>
                        <div className="text-xs text-muted-foreground">{r.job_title ?? "—"}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{r.specialty ?? "—"}</TableCell>
                  <TableCell><Badge variant="outline" className={emp.cls}>{emp.label}</Badge></TableCell>
                  <TableCell className="font-mono text-xs">{r.registration_code ?? "—"}</TableCell>
                  <TableCell>
                    <div className="space-y-0.5 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5"><Mail className="h-3 w-3" />{r.email}</div>
                      {r.phone && <div className="flex items-center gap-1.5"><Phone className="h-3 w-3" />{r.phone}</div>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5 text-xs">
                      <span className={`h-1.5 w-1.5 rounded-full ${r.status === "online" ? "bg-success" : r.status === "busy" ? "bg-warning" : "bg-muted-foreground/50"}`} />
                      {r.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-0.5">
                      <Button size="icon" variant="ghost" className="h-8 w-8" title="Ver perfil" onClick={() => setViewFor(r)}><Eye className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8" title="Ver crachá" onClick={() => setBadgeFor(r)}><IdCard className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8" title="Monitorar localização" onClick={() => setTrackFor(r)}><MapPin className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8" title="Desempenho" onClick={() => setStatsFor(r)}><BarChart3 className="h-4 w-4" /></Button>
                      {isAdmin && (
                        <>
                          <Button size="icon" variant="ghost" className="h-8 w-8" title="Editar" onClick={() => setEditFor(r)}><Pencil className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" title="Excluir" onClick={() => setDeleteFor(r)}><Trash2 className="h-4 w-4" /></Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <TechnicianFormSheet open={addOpen} onOpenChange={setAddOpen} />
      <TechnicianViewSheet tech={viewFor} open={!!viewFor} onOpenChange={(o) => !o && setViewFor(null)} />
      <CrachaModal tech={badgeFor} open={!!badgeFor} onOpenChange={(o) => !o && setBadgeFor(null)} />
      <TrackingModal tech={trackFor ? { id: trackFor.id, full_name: trackFor.full_name } : null} open={!!trackFor} onOpenChange={(o) => !o && setTrackFor(null)} />
      <EditDialog row={editFor} onClose={() => setEditFor(null)} onSaved={() => qc.invalidateQueries({ queryKey: ["technicians"] })} />
      <StatsDialog row={statsFor} onClose={() => setStatsFor(null)} />

      <AlertDialog open={!!deleteFor} onOpenChange={(o) => !o && setDeleteFor(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir técnico?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação remove permanentemente o acesso de <b>{deleteFor?.full_name}</b>. Não pode ser desfeito.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={delMut.isPending}
              onClick={(e) => { e.preventDefault(); if (deleteFor) delMut.mutate(deleteFor.id); }}>
              {delMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Excluir definitivamente"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function EditDialog({ row, onClose, onSaved }: { row: Row | null; onClose: () => void; onSaved: () => void }) {
  const upd = useServerFn(updateTechnician);
  const [form, setForm] = useState<Row | null>(null);
  const open = !!row;
  if (row && (form?.id !== row.id)) setForm(row);

  const mut = useMutation({
    mutationFn: () => upd({ data: {
      id: form!.id, full_name: form!.full_name, phone: form!.phone, job_title: form!.job_title,
      specialty: form!.specialty, registration_code: form!.registration_code, employment_type: form!.employment_type,
    }}),
    onSuccess: () => { toast.success("Técnico atualizado"); onSaved(); onClose(); },
    onError: (e: any) => toast.error("Falha ao salvar", { description: e?.message }),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar técnico</DialogTitle>
          <DialogDescription>Atualize informações profissionais e vínculo.</DialogDescription>
        </DialogHeader>
        {form && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2"><Label>Nome completo</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Telefone</Label><Input value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Matrícula</Label><Input value={form.registration_code ?? ""} onChange={(e) => setForm({ ...form, registration_code: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Cargo</Label><Input value={form.job_title ?? ""} onChange={(e) => setForm({ ...form, job_title: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Especialidade</Label><Input value={form.specialty ?? ""} onChange={(e) => setForm({ ...form, specialty: e.target.value })} /></div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Vínculo</Label>
              <Select value={form.employment_type} onValueChange={(v) => setForm({ ...form, employment_type: v as Row["employment_type"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="field">Field (freelancer)</SelectItem>
                  <SelectItem value="clt">CLT</SelectItem>
                  <SelectItem value="pj">PJ</SelectItem>
                  <SelectItem value="internal">Interno</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => mut.mutate()} disabled={mut.isPending}>
            {mut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StatsDialog({ row, onClose }: { row: Row | null; onClose: () => void }) {
  const open = !!row;
  const { data: stats } = useQuery({
    queryKey: ["tech-stats", row?.id],
    enabled: !!row,
    queryFn: async () => {
      const since = new Date(Date.now() - 7 * 86400000).toISOString();
      const { data } = await supabase
        .from("tickets")
        .select("status, created_at")
        .eq("assigned_to", row!.id)
        .gte("created_at", since);
      const rows = data ?? [];
      const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
      const buckets: Record<string, number> = Object.fromEntries(days.map((d) => [d, 0]));
      rows.filter((r: any) => r.status === "resolved").forEach((r: any) => {
        const d = new Date(r.created_at);
        buckets[days[d.getDay()]] = (buckets[days[d.getDay()]] ?? 0) + 1;
      });
      return {
        chart: days.map((d) => ({ dia: d, resolvidos: buckets[d] })),
        total: rows.length,
        resolvidos: rows.filter((r: any) => r.status === "resolved").length,
      };
    },
  });
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Desempenho · {row?.full_name}</DialogTitle>
          <DialogDescription>Resumo dos últimos 7 dias.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-3 gap-3 py-2">
          <Stat label="Chamados (7 dias)" value={String(stats?.total ?? 0)} />
          <Stat label="Resolvidos" value={String(stats?.resolvidos ?? 0)} />
          <Stat label="Taxa" value={stats && stats.total ? `${Math.round((stats.resolvidos / stats.total) * 100)}%` : "—"} />
        </div>
        <div className="rounded-xl border border-border bg-surface p-3">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stats?.chart ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="dia" stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip cursor={{ fill: "var(--color-accent)", opacity: 0.35, radius: 6 }}
                contentStyle={{ background: "var(--color-popover)", color: "var(--color-popover-foreground)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="resolvidos" fill="var(--color-chart-1)" radius={[6, 6, 0, 0]} maxBarSize={36} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 font-display text-xl font-semibold">{value}</div>
    </div>
  );
}
