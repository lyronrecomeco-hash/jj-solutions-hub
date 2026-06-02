import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Shield, ShieldCheck, ShieldAlert, UserCog, Search, Loader2, Plus, Trash2, Eye, Pencil } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { StaffCreateSheet } from "@/components/staff-create-sheet";

export const Route = createFileRoute("/_app/administradores")({ component: AdminsPage });

type AppRole = "admin" | "supervisor" | "senior_tech" | "tech";
const ROLE_LABEL: Record<AppRole, string> = {
  admin: "Administrador", supervisor: "Supervisor", senior_tech: "Técnico Sênior", tech: "Técnico",
};
const ROLE_CLS: Record<AppRole, string> = {
  admin: "border-destructive/30 bg-destructive/10 text-destructive",
  supervisor: "border-primary/30 bg-primary/10 text-primary",
  senior_tech: "border-info/30 bg-info/10 text-info",
  tech: "border-border bg-muted text-muted-foreground",
};

function AdminsPage() {
  const qc = useQueryClient();
  const { isAdmin, user } = useAuth();
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [removing, setRemoving] = useState<{ user_id: string; role: AppRole; name: string } | null>(null);
  const [viewing, setViewing] = useState<{ profile: any; roles: AppRole[] } | null>(null);
  const [editing, setEditing] = useState<{ user_id: string; profile: any; currentRoles: AppRole[] } | null>(null);
  const [editRole, setEditRole] = useState<AppRole>("tech");

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["staff-list"],
    queryFn: async () => {
      const { data: roles } = await supabase
        .from("user_roles").select("id, user_id, role, created_at")
        .order("created_at", { ascending: false });
      if (!roles?.length) return [];
      const ids = Array.from(new Set(roles.map((r) => r.user_id)));
      const { data: profiles } = await supabase
        .from("profiles").select("id, full_name, email, avatar_url, job_title").in("id", ids);
      const pmap = new Map((profiles ?? []).map((p) => [p.id, p]));
      return roles.map((r) => ({ ...r, profile: pmap.get(r.user_id) }));
    },
  });

  const revoke = useMutation({
    mutationFn: async ({ user_id, role }: { user_id: string; role: AppRole }) => {
      if (user_id === user?.id && role === "admin") {
        throw new Error("Você não pode revogar seu próprio acesso de Administrador.");
      }
      const { error } = await supabase
        .from("user_roles").delete().eq("user_id", user_id).eq("role", role);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Acesso revogado");
      qc.invalidateQueries({ queryKey: ["staff-list"] });
      setRemoving(null);
    },
    onError: (e: any) => toast.error("Falha", { description: e?.message }),
  });

  const addRole = useMutation({
    mutationFn: async ({ user_id, role }: { user_id: string; role: AppRole }) => {
      const { error } = await (supabase.from("user_roles") as any)
        .insert({ user_id, role });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Papel atualizado");
      qc.invalidateQueries({ queryKey: ["staff-list"] });
      setEditing(null);
    },
    onError: (e: any) => toast.error("Falha", { description: e?.message }),
  });

  if (!isAdmin) {
    return (
      <div className="px-6 py-10 text-center">
        <ShieldAlert className="mx-auto h-10 w-10 text-muted-foreground" />
        <p className="mt-3 text-sm text-muted-foreground">Acesso restrito a Administradores.</p>
      </div>
    );
  }

  const filtered = rows.filter((r: any) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (r.profile?.full_name ?? "").toLowerCase().includes(s)
      || (r.profile?.email ?? "").toLowerCase().includes(s);
  });

  const byUser = new Map<string, { profile: any; roles: { id: string; role: AppRole }[] }>();
  for (const r of filtered) {
    const entry = byUser.get(r.user_id) ?? { profile: r.profile, roles: [] };
    entry.roles.push({ id: r.id, role: r.role });
    byUser.set(r.user_id, entry);
  }

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Sistema</p>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Administradores & Acessos</h1>
          <p className="text-sm text-muted-foreground">Gerencie quem pode acessar a plataforma e o que cada um vê.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> Adicionar
        </Button>
      </header>

      <div className="rounded-xl border border-border bg-surface shadow-soft">
        <div className="flex items-center gap-2 border-b border-border p-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Filtrar por nome ou e-mail"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 border-0 bg-transparent shadow-none focus-visible:ring-0"
          />
        </div>
        {isLoading ? (
          <div className="p-10 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : byUser.size === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            <UserCog className="mx-auto mb-3 h-8 w-8 opacity-40" />
            Nenhum usuário com papéis ainda. Clique em <b>Adicionar</b> para criar o primeiro.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {Array.from(byUser.entries()).map(([uid, entry]) => {
              const currentRoles = entry.roles.map((r) => r.role);
              const primaryRole = currentRoles.includes("admin") ? "admin" : currentRoles[0];
              const primaryRoleObj = entry.roles.find((r) => r.role === primaryRole) ?? entry.roles[0];
              return (
                <li key={uid} className="flex flex-wrap items-center gap-3 p-4">
                  <div className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {(entry.profile?.full_name ?? "?").slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{entry.profile?.full_name ?? "—"}</div>
                    <div className="truncate text-xs text-muted-foreground">{entry.profile?.email ?? uid}</div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {entry.roles.map((r) => (
                      <Badge key={r.id} variant="outline" className={`gap-1 ${ROLE_CLS[r.role]}`}>
                        {r.role === "admin" ? <ShieldCheck className="h-3 w-3" /> : <Shield className="h-3 w-3" />}
                        {ROLE_LABEL[r.role]}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      title="Editar papel"
                      onClick={() => {
                        setEditing({ user_id: uid, profile: entry.profile, currentRoles });
                        setEditRole(primaryRole);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      title="Ver detalhes"
                      onClick={() => setViewing({ profile: entry.profile, roles: currentRoles })}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      title="Excluir / revogar acesso"
                      onClick={() => primaryRoleObj && setRemoving({
                        user_id: uid, role: primaryRoleObj.role,
                        name: entry.profile?.full_name ?? entry.profile?.email ?? uid,
                      })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <StaffCreateSheet
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => qc.invalidateQueries({ queryKey: ["staff-list"] })}
      />

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Detalhes do usuário</DialogTitle>
            <DialogDescription>Informações de acesso e papéis atribuídos.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div><span className="text-muted-foreground">Nome:</span> <b>{viewing?.profile?.full_name ?? "—"}</b></div>
            <div><span className="text-muted-foreground">E-mail:</span> {viewing?.profile?.email ?? "—"}</div>
            <div><span className="text-muted-foreground">Cargo:</span> {viewing?.profile?.job_title ?? "—"}</div>
            <div>
              <span className="text-muted-foreground">Papéis:</span>{" "}
              <div className="mt-1 flex flex-wrap gap-1.5">
                {viewing?.roles.map((r) => (
                  <Badge key={r} variant="outline" className={`gap-1 ${ROLE_CLS[r]}`}>{ROLE_LABEL[r]}</Badge>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar papel</DialogTitle>
            <DialogDescription>Adicione um novo papel para {editing?.profile?.full_name ?? "este usuário"}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Papéis atuais</Label>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {editing?.currentRoles.map((r) => (
                  <Badge key={r} variant="outline" className={`gap-1 ${ROLE_CLS[r]}`}>{ROLE_LABEL[r]}</Badge>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Adicionar novo papel</Label>
              <Select value={editRole} onValueChange={(v) => setEditRole(v as AppRole)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(["admin", "supervisor", "senior_tech", "tech"] as AppRole[])
                    .filter((r) => !editing?.currentRoles.includes(r))
                    .map((r) => <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button
              disabled={addRole.isPending || !editing || editing.currentRoles.includes(editRole)}
              onClick={() => editing && addRole.mutate({ user_id: editing.user_id, role: editRole })}
            >
              {addRole.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Adicionar papel"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!removing} onOpenChange={(o) => !o && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revogar acesso?</AlertDialogTitle>
            <AlertDialogDescription>
              Remover o papel <b>{removing && ROLE_LABEL[removing.role]}</b> de <b>{removing?.name}</b>?
              Esta ação é imediata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => removing && revoke.mutate({ user_id: removing.user_id, role: removing.role })}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Revogar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
