import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Copy, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { createTechnician } from "@/lib/api/technicians.functions";

export type AppRole = "admin" | "supervisor" | "senior_tech" | "tech";

export const MENU_OPTIONS: { key: string; label: string }[] = [
  { key: "dashboard", label: "Dashboard" },
  { key: "chamados", label: "Chamados" },
  { key: "tecnicos", label: "Equipe Técnica" },
  { key: "cadastros-pendentes", label: "Cadastros Pendentes" },
  { key: "atribuicao", label: "Atribuição" },
  { key: "clientes", label: "Clientes" },
  { key: "mensagens", label: "Mensagens" },
  { key: "relatorios", label: "Relatórios" },
  { key: "monitoramento", label: "Monitoramento" },
  { key: "logs", label: "Logs" },
  { key: "configuracoes", label: "Configurações" },
];

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  prefill?: {
    full_name?: string; email?: string; phone?: string | null;
    cpf?: string | null; rg?: string | null; birth_date?: string | null;
    cep?: string | null; address?: string | null; address_number?: string | null;
    address_complement?: string | null; neighborhood?: string | null;
    city?: string | null; state?: string | null; specialty?: string | null;
  };
  title?: string;
  onCreated?: (userId: string) => Promise<void> | void;
}

export function StaffCreateSheet({ open, onOpenChange, prefill, title = "Adicionar usuário", onCreated }: Props) {
  const create = useServerFn(createTechnician);
  const [submitting, setSubmitting] = useState(false);

  const initialName = prefill?.full_name?.split(" ") ?? [];
  const [first, setFirst] = useState(initialName[0] ?? "");
  const [last, setLast] = useState(initialName.slice(1).join(" "));
  const [email, setEmail] = useState(prefill?.email ?? "");
  const [role, setRole] = useState<AppRole>("tech");
  const [password, setPassword] = useState(() => genPassword());
  const [menus, setMenus] = useState<Record<string, boolean>>(() => {
    // por padrão técnico vê só dashboard, chamados, mensagens
    const def: Record<string, boolean> = {};
    MENU_OPTIONS.forEach((m) => { def[m.key] = ["dashboard", "chamados", "mensagens"].includes(m.key); });
    return def;
  });

  function toggle(k: string) { setMenus((m) => ({ ...m, [k]: !m[k] })); }
  function regen() { setPassword(genPassword()); }
  function copyPass() {
    navigator.clipboard.writeText(password);
    toast.success("Senha copiada");
  }

  async function submit() {
    if (!first.trim() || !email.trim() || password.length < 8) {
      toast.error("Preencha nome, e-mail e senha (mín. 8 caracteres)"); return;
    }
    setSubmitting(true);
    try {
      const full_name = `${first} ${last}`.trim();
      const res: any = await create({
        data: {
          full_name, email: email.trim().toLowerCase(), password, role,
          phone: prefill?.phone ?? null, cpf: prefill?.cpf ?? null, rg: prefill?.rg ?? null,
          birth_date: prefill?.birth_date ?? null,
          cep: prefill?.cep ?? null, address: prefill?.address ?? null,
          address_number: prefill?.address_number ?? null,
          address_complement: prefill?.address_complement ?? null,
          neighborhood: prefill?.neighborhood ?? null,
          city: prefill?.city ?? null, state: prefill?.state ?? null,
          specialty: prefill?.specialty ?? null,
          employment_type: "field",
        },
      });
      const uid = res?.user_id as string | undefined;

      // grava permissões em admin_permissions
      if (uid) {
        const { supabase } = await import("@/integrations/supabase/client");
        await (supabase.from("admin_permissions") as any).upsert(
          { user_id: uid, permissions: { menus } },
          { onConflict: "user_id" },
        );
      }

      toast.success("Usuário criado", { description: email });
      if (onCreated && uid) await onCreated(uid);
      onOpenChange(false);
    } catch (e: any) {
      toast.error("Falha", { description: e?.message ?? String(e) });
    } finally { setSubmitting(false); }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>
            Cria o acesso completo: usuário, perfil, papel e permissões de menu.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Nome *</Label>
              <Input value={first} onChange={(e) => setFirst(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Sobrenome</Label>
              <Input value={last} onChange={(e) => setLast(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">E-mail *</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Senha inicial *</Label>
            <div className="flex gap-2">
              <Input value={password} onChange={(e) => setPassword(e.target.value)} className="font-mono" />
              <Button type="button" size="icon" variant="outline" onClick={regen} title="Gerar nova"><RefreshCw className="h-4 w-4" /></Button>
              <Button type="button" size="icon" variant="outline" onClick={copyPass} title="Copiar"><Copy className="h-4 w-4" /></Button>
            </div>
            <p className="text-[11px] text-muted-foreground">O técnico poderá redefinir a senha depois do primeiro login.</p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Nível de acesso *</Label>
            <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="tech">Técnico</SelectItem>
                <SelectItem value="senior_tech">Técnico Sênior</SelectItem>
                <SelectItem value="supervisor">Supervisor</SelectItem>
                <SelectItem value="admin">Administrador</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Permissões de menu</Label>
            <p className="mt-1 text-[11px] text-muted-foreground">Itens desmarcados ficam invisíveis no painel deste usuário (administradores sempre veem tudo).</p>
            <div className="mt-2 grid grid-cols-2 gap-2 rounded-lg border border-border bg-surface-muted/30 p-3">
              {MENU_OPTIONS.map((m) => (
                <label key={m.key} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-accent">
                  <Checkbox checked={!!menus[m.key]} onCheckedChange={() => toggle(m.key)} />
                  <span className="text-xs">{m.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <SheetFooter className="mt-6 flex-row gap-2 sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />} Criar acesso
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function genPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#";
  let out = ""; for (let i = 0; i < 12; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}
