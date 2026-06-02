import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Building2, Plus, Search, Pencil, Trash2, Loader2, Mail, Phone, MapPin, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_app/clientes")({ component: ClientsPage });

type Client = {
  id: string; company: string; contact_name: string | null; email: string | null; phone: string | null;
  city: string | null; state: string | null; address: string | null; notes: string | null; created_at: string;
};

const PAGE = 10;

function ClientsPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [confirmDel, setConfirmDel] = useState<Client | null>(null);

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, company, contact_name, email, phone, city, state, address, notes, created_at")
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as Client[];
    },
  });

  const filtered = useMemo(() => {
    const term = q.toLowerCase();
    return clients.filter((c) =>
      !term || [c.company, c.contact_name, c.email, c.city, c.phone].filter(Boolean).join(" ").toLowerCase().includes(term),
    );
  }, [clients, q]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const slice = filtered.slice((page - 1) * PAGE, page * PAGE);
  useEffect(() => { setPage(1); }, [q]);

  const upsert = useMutation({
    mutationFn: async (c: Partial<Client>) => {
      const payload = {
        company: c.company, contact_name: c.contact_name, email: c.email, phone: c.phone,
        city: c.city, state: c.state, address: c.address, notes: c.notes,
      };
      if (c.id) {
        const { error } = await supabase.from("clients").update(payload).eq("id", c.id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase.from("clients").insert(payload as any);
        if (error) throw new Error(error.message);
      }
    },
    onSuccess: () => {
      toast.success(editing?.id ? "Cliente atualizado" : "Cliente criado");
      setEditOpen(false); setEditing(null);
      qc.invalidateQueries({ queryKey: ["clients"] });
    },
    onError: (e: any) => toast.error("Erro ao salvar", { description: e?.message }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clients").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Cliente removido");
      setConfirmDel(null);
      qc.invalidateQueries({ queryKey: ["clients"] });
    },
    onError: (e: any) => toast.error("Erro ao remover", { description: e?.message }),
  });

  function openNew() { setEditing({ id: "", company: "", contact_name: "", email: "", phone: "", city: "", state: "", address: "", notes: "", created_at: "" }); setEditOpen(true); }
  function openEdit(c: Client) { setEditing({ ...c }); setEditOpen(true); }

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary"><Building2 className="h-5 w-5" /></div>
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight">Clientes</h1>
            <p className="text-sm text-muted-foreground">Cadastro de empresas atendidas e contatos.</p>
          </div>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4" /> Novo cliente</Button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar empresa, contato, cidade…" className="h-10 pl-9 bg-surface-muted" />
        </div>
        <div className="ml-auto text-xs text-muted-foreground">{filtered.length} resultado(s)</div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-soft">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-muted/60 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Empresa</th>
                <th className="px-4 py-3">Contato</th>
                <th className="px-4 py-3">E-mail / Telefone</th>
                <th className="px-4 py-3">Cidade</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></td></tr>
              ) : slice.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">Nenhum cliente cadastrado.</td></tr>
              ) : slice.map((c) => (
                <tr key={c.id} className="hover:bg-surface-muted/40">
                  <td className="px-4 py-3 font-medium">{c.company}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.contact_name || "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
                      {c.email && <span className="inline-flex items-center gap-1.5"><Mail className="h-3 w-3" />{c.email}</span>}
                      {c.phone && <span className="inline-flex items-center gap-1.5"><Phone className="h-3 w-3" />{c.phone}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {(c.city || c.state) ? (
                      <span className="inline-flex items-center gap-1.5"><MapPin className="h-3 w-3" />{[c.city, c.state].filter(Boolean).join(" / ")}</span>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(c)} title="Editar"><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setConfirmDel(c)} title="Excluir"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border bg-surface-muted/40 px-4 py-2.5 text-xs text-muted-foreground">
            <span>Página {page} de {totalPages}</span>
            <div className="flex gap-1">
              <Button size="icon" variant="outline" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
              <Button size="icon" variant="outline" className="h-8 w-8" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
        )}
      </div>

      <Sheet open={editOpen} onOpenChange={(o) => { setEditOpen(o); if (!o) setEditing(null); }}>
        <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col gap-0 p-0">
          <SheetHeader className="border-b border-border px-6 py-4">
            <SheetTitle>{editing?.id ? "Editar cliente" : "Novo cliente"}</SheetTitle>
            <SheetDescription className="text-xs">
              {editing?.id ? "Atualize os dados desta empresa cliente." : "Preencha os dados para cadastrar uma nova empresa cliente."}
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {editing && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <F label="Empresa *" full><Input value={editing.company} onChange={(e) => setEditing({ ...editing, company: e.target.value })} placeholder="Nome da empresa" /></F>
                <F label="Contato"><Input value={editing.contact_name ?? ""} onChange={(e) => setEditing({ ...editing, contact_name: e.target.value })} placeholder="Pessoa responsável" /></F>
                <F label="E-mail"><Input type="email" value={editing.email ?? ""} onChange={(e) => setEditing({ ...editing, email: e.target.value })} placeholder="contato@empresa.com" /></F>
                <F label="Telefone"><Input value={editing.phone ?? ""} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} placeholder="(11) 99999-0000" /></F>
                <F label="Cidade"><Input value={editing.city ?? ""} onChange={(e) => setEditing({ ...editing, city: e.target.value })} /></F>
                <F label="Estado"><Input value={editing.state ?? ""} onChange={(e) => setEditing({ ...editing, state: e.target.value })} maxLength={2} /></F>
                <F label="Endereço" full><Input value={editing.address ?? ""} onChange={(e) => setEditing({ ...editing, address: e.target.value })} /></F>
                <F label="Observações" full><Textarea rows={4} value={editing.notes ?? ""} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} placeholder="Notas internas sobre este cliente" /></F>
              </div>
            )}
          </div>
          <SheetFooter className="border-t border-border px-6 py-3">
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button onClick={() => editing && upsert.mutate(editing)} disabled={!editing?.company || upsert.isPending}>
              {upsert.isPending && <Loader2 className="h-4 w-4 animate-spin" />} {editing?.id ? "Salvar alterações" : "Cadastrar cliente"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover cliente?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita. {confirmDel?.company} será removido.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmDel && del.mutate(confirmDel.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function F({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={`space-y-1.5 ${full ? "sm:col-span-2" : ""}`}>
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
