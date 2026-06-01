import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import {
  Plus, Search, Ticket, AlertTriangle, Clock, CheckCircle2, Filter, Loader2, ArrowRight,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_app/chamados")({ component: TicketsPage });

type Ticket = {
  id: string;
  ticket_number: string;
  title: string;
  description: string | null;
  status: string;
  priority: "low" | "medium" | "high" | "critical";
  client_id: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  assigned_to: string | null;
  created_at: string;
  deadline: string | null;
  clients?: { company: string } | null;
  profiles?: { full_name: string } | null;
};

const STATUS_LABEL: Record<string, string> = {
  open: "Aberto", in_progress: "Em andamento", waiting_part: "Aguardando peça",
  waiting_client: "Aguardando cliente", resolved: "Resolvido",
  partially_resolved: "Parcial", not_resolved: "Não resolvido", cancelled: "Cancelado",
};

const PRIORITY: Record<Ticket["priority"], { label: string; cls: string; dot: string }> = {
  critical: { label: "Crítico", cls: "border-destructive/30 bg-destructive/10 text-destructive", dot: "bg-destructive" },
  high:     { label: "Alta",    cls: "border-warning/30 bg-warning/15 text-warning-foreground", dot: "bg-warning" },
  medium:   { label: "Média",   cls: "border-info/30 bg-info/10 text-info", dot: "bg-info" },
  low:      { label: "Baixa",   cls: "border-border bg-muted text-muted-foreground", dot: "bg-muted-foreground/60" },
};

function TicketsPage() {
  const [q, setQ] = useState("");
  const [tab, setTab] = useState("all");
  const [priority, setPriority] = useState<string>("all");
  const [open, setOpen] = useState(false);

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["tickets-list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("tickets")
        .select("id, ticket_number, title, description, status, priority, client_id, contact_name, contact_phone, assigned_to, created_at, deadline, clients(company), profiles:assigned_to(full_name)")
        .order("created_at", { ascending: false })
        .limit(200);
      return (data ?? []) as unknown as Ticket[];
    },
  });

  const filtered = useMemo(() => tickets.filter((t) => {
    if (tab !== "all" && t.status !== tab) return false;
    if (priority !== "all" && t.priority !== priority) return false;
    if (q && ![t.title, t.ticket_number, t.contact_name, t.clients?.company].join(" ").toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  }), [tickets, tab, priority, q]);

  const counts = {
    open: tickets.filter((t) => t.status === "open").length,
    in_progress: tickets.filter((t) => t.status === "in_progress").length,
    resolved: tickets.filter((t) => t.status === "resolved").length,
    critical: tickets.filter((t) => t.priority === "critical").length,
  };

  return (
    <div className="w-full space-y-5 px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Operação</p>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Chamados</h1>
          <p className="text-sm text-muted-foreground">Gestão completa de atendimentos técnicos.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4" /> Novo chamado</Button>
          </DialogTrigger>
          <NewTicketDialog onClose={() => setOpen(false)} />
        </Dialog>
      </header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Mini label="Abertos" value={counts.open} icon={Ticket} tone="info" />
        <Mini label="Em andamento" value={counts.in_progress} icon={Clock} tone="warning" />
        <Mini label="Resolvidos" value={counts.resolved} icon={CheckCircle2} tone="success" />
        <Mini label="Críticos" value={counts.critical} icon={AlertTriangle} tone="destructive" />
      </div>

      <div className="rounded-xl border border-border bg-surface shadow-soft">
        <div className="flex flex-wrap items-center gap-3 border-b border-border p-3">
          <Tabs value={tab} onValueChange={setTab} className="flex-1">
            <TabsList className="bg-surface-muted">
              <TabsTrigger value="all">Todos</TabsTrigger>
              <TabsTrigger value="open">Abertos</TabsTrigger>
              <TabsTrigger value="in_progress">Em andamento</TabsTrigger>
              <TabsTrigger value="waiting_part">Aguardando peça</TabsTrigger>
              <TabsTrigger value="resolved">Resolvidos</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="relative w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar chamado…" className="h-9 pl-9 bg-surface-muted" />
          </div>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger className="h-9 w-[170px] bg-surface-muted"><Filter className="h-3.5 w-3.5 mr-1" /><SelectValue placeholder="Prioridade" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas prioridades</SelectItem>
              <SelectItem value="critical">Crítica</SelectItem>
              <SelectItem value="high">Alta</SelectItem>
              <SelectItem value="medium">Média</SelectItem>
              <SelectItem value="low">Baixa</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Tabs value={tab}>
          <TabsContent value={tab} className="m-0">
            {isLoading ? (
              <div className="py-16 text-center text-muted-foreground"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></div>
            ) : filtered.length === 0 ? (
              <div className="py-16 text-center text-sm text-muted-foreground">Nenhum chamado encontrado.</div>
            ) : (
              <ul className="divide-y divide-border">
                {filtered.map((t) => <TicketRow key={t.id} t={t} />)}
              </ul>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function TicketRow({ t }: { t: Ticket }) {
  const p = PRIORITY[t.priority];
  return (
    <li>
      <Link to="/chamados/$id" params={{ id: t.id }} className="flex items-center gap-4 px-4 py-3.5 hover:bg-surface-muted/50">
        <span className={cn("h-9 w-1 rounded-full", p.dot)} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-medium text-muted-foreground">{t.ticket_number}</span>
            <Badge variant="outline" className={cn("h-5 px-1.5 text-[10px]", p.cls)}>{p.label}</Badge>
            <span className="text-[11px] text-muted-foreground">{STATUS_LABEL[t.status] ?? t.status}</span>
          </div>
          <div className="mt-0.5 truncate text-sm font-semibold">{t.title}</div>
          <div className="mt-0.5 truncate text-xs text-muted-foreground">
            {t.clients?.company ?? t.contact_name ?? "—"}{t.profiles?.full_name ? ` · ${t.profiles.full_name}` : ""}
          </div>
        </div>
        <div className="hidden text-right text-[11px] text-muted-foreground sm:block">
          <div>{new Date(t.created_at).toLocaleDateString("pt-BR")}</div>
          {t.deadline && <div className="text-warning-foreground">SLA {new Date(t.deadline).toLocaleDateString("pt-BR")}</div>}
        </div>
        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
      </Link>
    </li>
  );
}

function Mini({ label, value, icon: Icon, tone }: { label: string; value: number; icon: any; tone: "info" | "success" | "warning" | "destructive" }) {
  const cls = {
    info: "text-info bg-info/10",
    success: "text-success bg-success/10",
    warning: "text-warning-foreground bg-warning/15",
    destructive: "text-destructive bg-destructive/10",
  }[tone];
  return (
    <div className="rounded-xl border border-border bg-surface p-4 shadow-soft">
      <div className="flex items-center justify-between">
        <span className={cn("grid h-8 w-8 place-items-center rounded-lg", cls)}><Icon className="h-4 w-4" /></span>
      </div>
      <div className="mt-2">
        <div className="font-display text-xl font-semibold tracking-tight">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}

function NewTicketDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [form, setForm] = useState({
    title: "", description: "", priority: "medium" as Ticket["priority"],
    client_id: "", contact_name: "", contact_phone: "", equipment: "", address: "",
    assigned_to: "",
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients-min"],
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("id, company").order("company");
      return data ?? [];
    },
  });

  const { data: techs = [] } = useQuery({
    queryKey: ["techs-min"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, full_name").order("full_name");
      return data ?? [];
    },
  });

  const mut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("tickets").insert({
        title: form.title,
        description: form.description || null,
        priority: form.priority,
        client_id: form.client_id || null,
        contact_name: form.contact_name || null,
        contact_phone: form.contact_phone || null,
        equipment: form.equipment || null,
        address: form.address || null,
        assigned_to: form.assigned_to || null,
        created_by: user?.id ?? null,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Chamado criado");
      qc.invalidateQueries({ queryKey: ["tickets-list"] });
      qc.invalidateQueries({ queryKey: ["dashboard-tickets"] });
      onClose();
    },
    onError: (e: any) => toast.error("Falha", { description: e?.message }),
  });

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>Novo chamado</DialogTitle>
        <DialogDescription>Registre um atendimento técnico e atribua a um responsável.</DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2 space-y-1.5">
          <Label>Título *</Label>
          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Resumo do problema" />
        </div>
        <div className="sm:col-span-2 space-y-1.5">
          <Label>Descrição</Label>
          <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Detalhes técnicos, comportamento esperado, etc." />
        </div>
        <div className="space-y-1.5">
          <Label>Prioridade</Label>
          <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v as Ticket["priority"] })}>
            <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Baixa</SelectItem>
              <SelectItem value="medium">Média</SelectItem>
              <SelectItem value="high">Alta</SelectItem>
              <SelectItem value="critical">Crítica</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Cliente</Label>
          <Select value={form.client_id} onValueChange={(v) => setForm({ ...form, client_id: v })}>
            <SelectTrigger className="h-10"><SelectValue placeholder="Selecionar cliente" /></SelectTrigger>
            <SelectContent>
              {clients.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.company}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Contato</Label>
          <Input value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Telefone</Label>
          <Input value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Equipamento</Label>
          <Input value={form.equipment} onChange={(e) => setForm({ ...form, equipment: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Atribuir a</Label>
          <Select value={form.assigned_to} onValueChange={(v) => setForm({ ...form, assigned_to: v })}>
            <SelectTrigger className="h-10"><SelectValue placeholder="Técnico" /></SelectTrigger>
            <SelectContent>
              {techs.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="sm:col-span-2 space-y-1.5">
          <Label>Endereço de atendimento</Label>
          <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={() => mut.mutate()} disabled={!form.title || mut.isPending}>
          {mut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar chamado"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
