import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import {
  Plus, Search, Ticket, AlertTriangle, Clock, CheckCircle2, Filter, Loader2, ArrowRight,
  Image as ImageIcon, LayoutList, KanbanSquare, UserPlus, ArrowRightCircle,
  CheckCircle, XCircle, ExternalLink, ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, useDraggable, useDroppable, useSensor, useSensors,
} from "@dnd-kit/core";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AssignTechDialog } from "@/components/assign-tech-dialog";
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
  closed: "Finalizado",
};

const KANBAN_COLUMNS: { key: string; label: string; stripe: string; dot: string }[] = [
  { key: "open",               label: "Abertos",         stripe: "bg-info",         dot: "text-info" },
  { key: "in_progress",        label: "Em andamento",    stripe: "bg-amber-500",    dot: "text-amber-500" },
  { key: "waiting_part",       label: "Aguardando peça", stripe: "bg-purple-500",   dot: "text-purple-500" },
  { key: "resolved",           label: "Resolvidos",      stripe: "bg-success",      dot: "text-success" },
  { key: "not_resolved",       label: "Não resolvidos",  stripe: "bg-destructive",  dot: "text-destructive" },
  { key: "cancelled",          label: "Cancelados",      stripe: "bg-muted-foreground/50", dot: "text-muted-foreground" },
  { key: "closed",             label: "Finalizados",     stripe: "bg-primary",      dot: "text-primary" },
];

const PRIORITY: Record<Ticket["priority"], { label: string; cls: string; dot: string }> = {
  critical: { label: "Crítico", cls: "border-destructive/30 bg-destructive/10 text-destructive", dot: "bg-destructive" },
  high:     { label: "Alta",    cls: "border-amber-500/40 bg-amber-500/15 text-amber-700 dark:text-amber-300", dot: "bg-amber-500" },
  medium:   { label: "Média",   cls: "border-info/30 bg-info/10 text-info", dot: "bg-info" },
  low:      { label: "Baixa",   cls: "border-border bg-muted text-muted-foreground", dot: "bg-muted-foreground/60" },
};

const TICKET_SELECT = "id, ticket_number, title, description, status, priority, client_id, contact_name, contact_phone, assigned_to, created_at, deadline";

async function hydrateTickets(rows: any[]): Promise<Ticket[]> {
  const clientIds = [...new Set(rows.map((r) => r.client_id).filter(Boolean))];
  const assigneeIds = [...new Set(rows.map((r) => r.assigned_to).filter(Boolean))];
  const [clientsRes, profilesRes] = await Promise.all([
    clientIds.length ? supabase.from("clients").select("id, company").in("id", clientIds) : Promise.resolve({ data: [] }),
    assigneeIds.length ? supabase.from("profiles").select("id, full_name").in("id", assigneeIds) : Promise.resolve({ data: [] }),
  ]);
  const clients = new Map((clientsRes.data ?? []).map((c: any) => [c.id, { company: c.company }]));
  const profiles = new Map((profilesRes.data ?? []).map((p: any) => [p.id, { full_name: p.full_name }]));
  return rows.map((r) => ({
    ...r,
    clients: r.client_id ? clients.get(r.client_id) ?? null : null,
    profiles: r.assigned_to ? profiles.get(r.assigned_to) ?? null : null,
  })) as Ticket[];
}

function TicketsPage() {
  const qc = useQueryClient();
  const { isStaff } = useAuth();
  const [q, setQ] = useState("");
  const [tab, setTab] = useState("all");
  const [priority, setPriority] = useState<string>("all");
  const [view, setView] = useState<"list" | "kanban">("list");
  const [sheetOpen, setSheetOpen] = useState(false);

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["tickets-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tickets")
        .select(TICKET_SELECT)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw new Error(error.message);
      return hydrateTickets(data ?? []);
    },
    staleTime: 30_000,
  });

  // Realtime: refetch on any ticket change
  useEffect(() => {
    const ch = supabase
      .channel("tickets-board")
      .on("postgres_changes", { event: "*", schema: "public", table: "tickets" }, () => {
        qc.invalidateQueries({ queryKey: ["tickets-list"] });
        qc.invalidateQueries({ queryKey: ["dashboard-tickets"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  const filtered = useMemo(() => tickets.filter((t) => {
    if (tab === "unassigned") {
      if (t.assigned_to) return false;
    } else if (tab !== "all" && t.status !== tab) return false;
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
  const unassignedTickets = tickets.filter((t) => !t.assigned_to && !["cancelled", "closed"].includes(t.status));

  return (
    <div className="w-full space-y-5 px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Operação</p>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Chamados</h1>
          <p className="text-sm text-muted-foreground">Gestão completa de atendimentos técnicos.</p>
        </div>
        <Button onClick={() => setSheetOpen(true)}><Plus className="h-4 w-4" /> Novo chamado</Button>
      </header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Mini label="Abertos" value={counts.open} icon={Ticket} tone="info" />
        <Mini label="Em andamento" value={counts.in_progress} icon={Clock} tone="warning" />
        <Mini label="Resolvidos" value={counts.resolved} icon={CheckCircle2} tone="success" />
        <Mini label="Críticos" value={counts.critical} icon={AlertTriangle} tone="destructive" />
      </div>

      

      <div className="rounded-xl border border-border bg-surface shadow-soft">
        <div className="flex flex-col gap-3 border-b border-border p-3 sm:flex-row sm:flex-wrap sm:items-center">
          {isStaff && (
            <Tabs value={view} onValueChange={(v) => setView(v as any)}>
              <TabsList className="bg-surface-muted">
                <TabsTrigger value="list"><LayoutList className="mr-1 h-3.5 w-3.5" /> Lista</TabsTrigger>
                <TabsTrigger value="kanban"><KanbanSquare className="mr-1 h-3.5 w-3.5" /> Kanban</TabsTrigger>
              </TabsList>
            </Tabs>
          )}
          {view === "list" && (
            <Tabs value={tab} onValueChange={setTab} className="flex-1 min-w-0 overflow-x-auto">
              <TabsList className="bg-surface-muted">
                <TabsTrigger value="all">Todos</TabsTrigger>
                <TabsTrigger value="open">Abertos</TabsTrigger>
                <TabsTrigger value="in_progress">Em andamento</TabsTrigger>
                <TabsTrigger value="waiting_part">Aguardando peça</TabsTrigger>
                <TabsTrigger value="resolved">Resolvidos</TabsTrigger>
              </TabsList>
            </Tabs>
          )}
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar chamado…" className="h-9 pl-9 bg-surface-muted" />
          </div>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger className="h-9 w-full sm:w-[170px] bg-surface-muted"><Filter className="h-3.5 w-3.5 mr-1" /><SelectValue placeholder="Prioridade" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas prioridades</SelectItem>
              <SelectItem value="critical">Crítica</SelectItem>
              <SelectItem value="high">Alta</SelectItem>
              <SelectItem value="medium">Média</SelectItem>
              <SelectItem value="low">Baixa</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {view === "list" || !isStaff ? (
          isLoading ? (
            <div className="py-16 text-center text-muted-foreground"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">Nenhum chamado encontrado.</div>
          ) : (
            <ul className="divide-y divide-border">
              {filtered.map((t) => <TicketRow key={t.id} t={t} />)}
            </ul>
          )
        ) : (
          <KanbanBoard tickets={filtered} />
        )}
      </div>

      <NewTicketSheet open={sheetOpen} onOpenChange={setSheetOpen} />
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

function UnassignedStrip({ tickets }: { tickets: Ticket[] }) {
  const [target, setTarget] = useState<Ticket | null>(null);
  if (tickets.length === 0) return null;
  return (
    <div className="rounded-xl border border-border bg-surface shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold">Chamados a atribuir</h2>
          <p className="text-xs text-muted-foreground">Mesma fila da aba Atribuição, sincronizada aqui em Chamados.</p>
        </div>
        <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-300">{tickets.length} sem técnico</Badge>
      </div>
      <div className="grid gap-2 p-3 md:grid-cols-2 xl:grid-cols-3">
        {tickets.slice(0, 6).map((t) => (
          <div key={t.id} className="flex min-w-0 items-center gap-3 rounded-lg border border-border bg-surface-muted/35 p-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] font-medium text-muted-foreground">{t.ticket_number}</span>
                <Badge variant="outline" className={cn("h-5 px-1.5 text-[10px]", PRIORITY[t.priority].cls)}>{PRIORITY[t.priority].label}</Badge>
              </div>
              <div className="mt-0.5 truncate text-sm font-semibold">{t.title}</div>
              <div className="truncate text-xs text-muted-foreground">{t.clients?.company ?? t.contact_name ?? "Sem cliente"}</div>
            </div>
            <Button size="sm" onClick={() => setTarget(t)}>
              <UserPlus className="h-3.5 w-3.5" /> Atribuir
            </Button>
          </div>
        ))}
      </div>
      <AssignTechDialog
        ticketId={target?.id ?? null}
        ticketNumber={target?.ticket_number}
        open={!!target}
        onOpenChange={(o) => !o && setTarget(null)}
      />
    </div>
  );
}

function KanbanBoard({ tickets }: { tickets: Ticket[] }) {
  const qc = useQueryClient();
  const { isStaff } = useAuth();
  const [active, setActive] = useState<Ticket | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const move = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const patch: any = { status };
      if (status === "in_progress") patch.started_at = new Date().toISOString();
      if (["resolved", "not_resolved", "cancelled", "partially_resolved", "closed"].includes(status)) {
        patch.closed_at = new Date().toISOString();
      }
      const { error } = await supabase.from("tickets").update(patch).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: ["tickets-list"] });
      const prev = qc.getQueryData<Ticket[]>(["tickets-list"]);
      qc.setQueryData<Ticket[]>(["tickets-list"], (old) =>
        (old ?? []).map((t) => t.id === id ? { ...t, status } : t)
      );
      return { prev };
    },
    onError: (e: any, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["tickets-list"], ctx.prev);
      toast.error("Falha ao mover", { description: e?.message });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tickets-list"] }),
  });

  function onDragStart(e: DragStartEvent) {
    const t = tickets.find((x) => x.id === e.active.id);
    if (t) setActive(t);
  }
  function onDragEnd(e: DragEndEvent) {
    setActive(null);
    if (!isStaff) { toast.info("Só a gestão pode arrastar entre colunas."); return; }
    const overId = e.over?.id as string | undefined;
    const id = e.active.id as string;
    if (!overId) return;
    const t = tickets.find((x) => x.id === id);
    if (!t || t.status === overId) return;
    move.mutate({ id, status: overId });
  }

  return (
    <div className="overflow-x-auto p-3">
      <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div className="flex gap-3 min-w-max xl:min-w-0">
          {KANBAN_COLUMNS.map((col) => {
            const items = tickets.filter((t) => t.status === col.key);
            return <Column key={col.key} col={col} items={items} />;
          })}
        </div>
        <DragOverlay>
          {active ? <KanbanCard t={active} dragging /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

function Column({ col, items }: { col: { key: string; label: string; stripe: string; dot: string }; items: Ticket[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: col.key });
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex w-[210px] xl:w-auto xl:flex-1 xl:min-w-[170px] shrink-0 flex-col overflow-hidden rounded-lg border border-border bg-surface-muted/40 transition",
        isOver && "ring-2 ring-primary ring-offset-1 ring-offset-background"
      )}
    >
      <div className={cn("h-[3px] w-full", col.stripe)} />
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="flex items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-surface-muted/60"
      >
        <span className="truncate text-[11px] font-bold uppercase tracking-wider text-foreground/80">{col.label}</span>
        <span className="flex items-center gap-1.5">
          <span className="rounded-md bg-surface px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">{items.length}</span>
          <svg className={cn("h-3 w-3 text-muted-foreground transition-transform", collapsed && "-rotate-90")} viewBox="0 0 20 20" fill="currentColor"><path d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" /></svg>
        </span>
      </button>
      {!collapsed && (
        <div className="flex min-h-[120px] flex-col gap-1.5 p-1.5 pt-0">
          {items.length === 0 ? (
            <div className="m-1 grid flex-1 place-items-center rounded-md border border-dashed border-border/60 py-8 text-center text-[11px] text-muted-foreground">
              Solte chamados aqui
            </div>
          ) : items.map((t) => <KanbanCard key={t.id} t={t} />)}
        </div>
      )}
    </div>
  );
}

function KanbanCard({ t, dragging }: { t: Ticket; dragging?: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: t.id });
  const p = PRIORITY[t.priority];
  const qc = useQueryClient();
  const [menuOpen, setMenuOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);

  const NEXT_STATUS: Record<string, { key: string; label: string } | null> = {
    open: { key: "in_progress", label: "Iniciar atendimento" },
    in_progress: { key: "resolved", label: "Marcar como resolvido" },
    waiting_part: { key: "in_progress", label: "Voltar para em andamento" },
    resolved: { key: "closed", label: "Finalizar e arquivar" },
    not_resolved: { key: "open", label: "Reabrir" },
    cancelled: { key: "open", label: "Reabrir" },
    closed: null,
  };
  const next = NEXT_STATUS[t.status];

  const changeStatus = useMutation({
    mutationFn: async (status: string) => {
      const patch: any = { status };
      if (status === "in_progress") patch.started_at = new Date().toISOString();
      if (["resolved", "not_resolved", "cancelled", "closed"].includes(status)) {
        patch.closed_at = new Date().toISOString();
      }
      const { error } = await supabase.from("tickets").update(patch).eq("id", t.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tickets-list"] });
      qc.invalidateQueries({ queryKey: ["dashboard-tickets"] });
      qc.invalidateQueries({ queryKey: ["unassigned-tickets"] });
      setMenuOpen(false);
    },
    onError: (e: any) => toast.error("Falha", { description: e?.message }),
  });

  return (
    <>
      <div
        ref={setNodeRef}
        className={cn(
          "group relative rounded-md border border-border bg-surface shadow-soft transition",
          isDragging && "opacity-50",
          dragging && "rotate-1 shadow-lg"
        )}
      >
        {/* Top action bar — chevron sits on TOP of the card */}
        <Popover open={menuOpen} onOpenChange={setMenuOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              className="flex w-full items-center justify-center gap-1 rounded-t-md border-b border-border/60 bg-surface-muted/40 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground transition hover:bg-surface-muted hover:text-foreground data-[state=open]:bg-surface-muted data-[state=open]:text-foreground"
              aria-label="Ações"
            >
              Ações
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", menuOpen && "rotate-180")} />
            </button>
          </PopoverTrigger>
          <PopoverContent side="bottom" align="center" sideOffset={6} className="w-60 rounded-lg border-border bg-popover p-1.5 shadow-floating">
            <Link
              to="/chamados/$id"
              params={{ id: t.id }}
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-surface-muted"
            >
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
              Abrir chamado
            </Link>
            <MenuButton
              icon={UserPlus}
              label={t.assigned_to ? "Reatribuir técnico" : "Atribuir técnico"}
              onClick={() => { setMenuOpen(false); setAssignOpen(true); }}
            />
            {next && (
              <MenuButton
                icon={ArrowRightCircle}
                label={next.label}
                onClick={() => changeStatus.mutate(next.key)}
                disabled={changeStatus.isPending}
              />
            )}
            {!["closed", "resolved", "cancelled"].includes(t.status) && (
              <MenuButton
                icon={CheckCircle}
                label="Encerrar como resolvido"
                onClick={() => changeStatus.mutate("resolved")}
                disabled={changeStatus.isPending}
              />
            )}
            {t.status !== "cancelled" && (
              <MenuButton
                icon={XCircle}
                label="Cancelar chamado"
                tone="danger"
                onClick={() => changeStatus.mutate("cancelled")}
                disabled={changeStatus.isPending}
              />
            )}
          </PopoverContent>
        </Popover>

        <div
          {...attributes}
          {...listeners}
          className="cursor-grab px-2.5 py-2 active:cursor-grabbing"
        >
          <div className="flex items-center justify-between gap-1.5">
            <span className="font-mono text-[11px] font-bold tracking-tight">{t.ticket_number}</span>
            <Badge variant="outline" className={cn("h-[18px] gap-1 px-1.5 text-[9px] font-medium", p.cls)}>
              <span className={cn("h-1 w-1 rounded-full", p.dot)} />
              {p.label}
            </Badge>
          </div>
          <div className="mt-1 line-clamp-1 text-[12px] font-medium leading-snug">{t.title}</div>
          <div className="mt-0.5 truncate text-[10.5px] text-muted-foreground">
            {t.clients?.company ?? t.contact_name ?? "—"}
          </div>
          <div className="mt-1.5 flex items-center justify-between gap-2">
            <span className="font-mono text-[10px] text-muted-foreground">
              {new Date(t.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            </span>
            {t.profiles?.full_name ? (
              <span className="truncate rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold text-primary">
                {t.profiles.full_name.split(" ")[0]}
              </span>
            ) : (
              <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-semibold text-amber-700 dark:text-amber-300">
                Sem técnico
              </span>
            )}
          </div>
        </div>
      </div>

      <AssignTechDialog
        ticketId={assignOpen ? t.id : null}
        ticketNumber={t.ticket_number}
        open={assignOpen}
        onOpenChange={setAssignOpen}
      />
    </>
  );
}

function MenuButton({ icon: Icon, label, onClick, disabled, tone }: { icon: any; label: string; onClick: () => void; disabled?: boolean; tone?: "danger" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition hover:bg-surface-muted disabled:opacity-50",
        tone === "danger" && "text-destructive hover:bg-destructive/10"
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

function Mini({ label, value, icon: Icon, tone }: { label: string; value: number; icon: any; tone: "info" | "success" | "warning" | "destructive" }) {
  const cls = {
    info: "text-info bg-info/10 dark:bg-info/15",
    success: "text-success bg-success/10 dark:bg-success/15",
    warning: "text-amber-600 bg-amber-500/15 dark:text-amber-300 dark:bg-amber-500/15",
    destructive: "text-destructive bg-destructive/10 dark:bg-destructive/15",
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

function NewTicketSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
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
      const { data, error } = await supabase
        .from("tickets")
        .insert({
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
        })
        .select(TICKET_SELECT)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) throw new Error("Chamado criado, mas a linha não retornou do banco.");
      const [created] = await hydrateTickets([data]);
      return created;
    },
    onSuccess: (created) => {
      toast.success("Chamado criado");
      // Optimistic prepend so it appears imediatamente sem aguardar refetch
      qc.setQueryData<any[]>(["tickets-list"], (old) => [created, ...(old ?? [])]);
      qc.invalidateQueries({ queryKey: ["tickets-list"] });
      qc.invalidateQueries({ queryKey: ["dashboard-tickets"] });
      qc.invalidateQueries({ queryKey: ["unassigned-tickets"] });
      setForm({ title: "", description: "", priority: "medium", client_id: "", contact_name: "", contact_phone: "", equipment: "", address: "", assigned_to: "" });
      onOpenChange(false);
    },
    onError: (e: any) => toast.error("Falha ao criar chamado", { description: e?.message }),
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>Novo chamado</SheetTitle>
          <SheetDescription>Registre um atendimento técnico e atribua a um responsável.</SheetDescription>
        </SheetHeader>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2 space-y-1.5">
            <Label>Título *</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Resumo do problema" />
          </div>
          <div className="sm:col-span-2 space-y-1.5">
            <Label>Descrição</Label>
            <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Detalhes técnicos…" />
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

        <SheetFooter className="mt-6 flex-row gap-2 sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => mut.mutate()} disabled={!form.title || mut.isPending}>
            {mut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar chamado"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
