import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Ticket, Clock, CheckCircle2, CalendarCheck, Users, AlertTriangle,
  MoreHorizontal, Circle,
} from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/dashboard")({
  component: DashboardPage,
});

const STATUS_LABEL: Record<string, string> = {
  open: "Aberto", in_progress: "Em andamento", waiting_part: "Aguardando peça",
  waiting_client: "Aguardando cliente", resolved: "Resolvido",
  partially_resolved: "Parcial", not_resolved: "Não resolvido", cancelled: "Cancelado",
};

const PRIORITY_STYLE: Record<string, string> = {
  critical: "bg-destructive/15 text-destructive border-destructive/30",
  high: "bg-warning/20 text-warning-foreground border-warning/40 dark:bg-warning/15 dark:text-warning",
  medium: "bg-info/15 text-info border-info/30",
  low: "bg-muted text-muted-foreground border-border",
};

function DashboardPage() {
  const { data: tickets } = useQuery({
    queryKey: ["dashboard-tickets"],
    queryFn: async () => {
      const { data } = await supabase
        .from("tickets")
        .select("id, ticket_number, title, status, priority, created_at, deadline, contact_name, client_id, clients(company)")
        .order("created_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });

  const { data: technicians } = useQuery({
    queryKey: ["dashboard-techs"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, job_title, status, specialty")
        .limit(8);
      return data ?? [];
    },
  });

  const counts = aggregateCounts(tickets ?? []);
  const statusData = buildStatusData(tickets ?? []);
  const productivityData = buildProductivityData(tickets ?? [], technicians ?? []);
  const trendData = buildTrendData(tickets ?? []);

  return (
    <div className="w-full space-y-6 px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Visão geral</p>
          <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">Dashboard operacional</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Acompanhe o desempenho do service desk em tempo real.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">Hoje</Button>
          <Button variant="outline" size="sm">7 dias</Button>
          <Button variant="default" size="sm">30 dias</Button>
        </div>
      </header>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="Chamados abertos" value={counts.open} icon={Ticket} tone="info" />
        <KpiCard label="Em andamento" value={counts.inProgress} icon={Clock} tone="warning" />
        <KpiCard label="Resolvidos hoje" value={counts.resolvedToday} icon={CheckCircle2} tone="success" />
        <KpiCard label="Resolvidos no mês" value={counts.resolvedMonth} icon={CalendarCheck} tone="success" />
        <KpiCard label="Técnicos ativos" value={technicians?.length ?? 0} icon={Users} tone="neutral" />
        <KpiCard label="Críticos" value={counts.critical} icon={AlertTriangle} tone="destructive" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-border shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base">Abertos vs Resolvidos</CardTitle>
              <p className="text-xs text-muted-foreground">Últimos 14 dias</p>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="day" stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  cursor={{ stroke: "var(--color-border)" }}
                  contentStyle={{ background: "var(--color-popover)", color: "var(--color-popover-foreground)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12, boxShadow: "var(--shadow-floating)" }}
                  labelStyle={{ color: "var(--color-foreground)", fontWeight: 600 }}
                  itemStyle={{ color: "var(--color-popover-foreground)" }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="abertos" stroke="var(--color-chart-1)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="resolvidos" stroke="var(--color-chart-3)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border shadow-soft">
          <CardHeader>
            <CardTitle className="text-base">Distribuição por status</CardTitle>
            <p className="text-xs text-muted-foreground">Snapshot atual</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3}>
                  {statusData.map((_, i) => (
                    <Cell key={i} fill={`var(--color-chart-${(i % 5) + 1})`} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "var(--color-popover)", color: "var(--color-popover-foreground)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12, boxShadow: "var(--shadow-floating)" }}
                  itemStyle={{ color: "var(--color-popover-foreground)" }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-border shadow-soft">
          <CardHeader>
            <CardTitle className="text-base">Produtividade por técnico</CardTitle>
            <p className="text-xs text-muted-foreground">Chamados concluídos nesta semana</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={productivityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  cursor={{ fill: "var(--color-accent)", opacity: 0.35, radius: 6 }}
                  contentStyle={{ background: "var(--color-popover)", color: "var(--color-popover-foreground)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12, boxShadow: "var(--shadow-floating)" }}
                  labelStyle={{ color: "var(--color-foreground)", fontWeight: 600 }}
                  itemStyle={{ color: "var(--color-popover-foreground)" }}
                />
                <Bar dataKey="resolvidos" fill="var(--color-chart-1)" radius={[6, 6, 0, 0]} maxBarSize={42} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border shadow-soft">
          <CardHeader>
            <CardTitle className="text-base">Técnicos online</CardTitle>
            <p className="text-xs text-muted-foreground">Equipe em campo</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {(technicians ?? []).slice(0, 6).map((t: any) => (
              <div key={t.id} className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
                    {initials(t.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{t.full_name || "—"}</div>
                  <div className="truncate text-xs text-muted-foreground">{t.specialty || t.job_title}</div>
                </div>
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Circle className={cn("h-2 w-2 fill-current", t.status === "online" ? "text-success" : "text-muted-foreground/40")} />
                  {t.status === "online" ? "Ativo" : "Offline"}
                </span>
              </div>
            ))}
            {(!technicians || technicians.length === 0) && (
              <p className="text-sm text-muted-foreground">Nenhum técnico cadastrado ainda.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent tickets */}
      <Card className="border-border shadow-soft">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base">Últimos chamados</CardTitle>
            <p className="text-xs text-muted-foreground">Atividade recente da operação</p>
          </div>
          <Button variant="outline" size="sm">Ver todos</Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-border bg-surface-muted/60 text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-2.5 text-left font-medium">Nº</th>
                  <th className="px-3 py-2.5 text-left font-medium">Título</th>
                  <th className="px-3 py-2.5 text-left font-medium">Cliente</th>
                  <th className="px-3 py-2.5 text-left font-medium">Prioridade</th>
                  <th className="px-3 py-2.5 text-left font-medium">Status</th>
                  <th className="px-5 py-2.5 text-right font-medium">Aberto</th>
                </tr>
              </thead>
              <tbody>
                {(tickets ?? []).slice(0, 8).map((t: any) => (
                  <tr key={t.id} className="border-b border-border last:border-0 hover:bg-surface-muted/40">
                    <td className="px-5 py-3 font-mono text-xs font-medium">{t.ticket_number}</td>
                    <td className="px-3 py-3 font-medium">{t.title}</td>
                    <td className="px-3 py-3 text-muted-foreground">{t.clients?.company ?? "—"}</td>
                    <td className="px-3 py-3">
                      <Badge variant="outline" className={cn("font-medium capitalize", PRIORITY_STYLE[t.priority])}>
                        {t.priority === "critical" ? "Crítico" : t.priority === "high" ? "Alta" : t.priority === "medium" ? "Média" : "Baixa"}
                      </Badge>
                    </td>
                    <td className="px-3 py-3">
                      <span className="inline-flex items-center gap-1.5 text-xs">
                        <Circle className="h-2 w-2 fill-current text-primary" />
                        {STATUS_LABEL[t.status] ?? t.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right text-xs text-muted-foreground">{formatRelative(t.created_at)}</td>
                  </tr>
                ))}
                {(!tickets || tickets.length === 0) && (
                  <tr><td colSpan={6} className="px-5 py-10 text-center text-sm text-muted-foreground">Nenhum chamado registrado.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({ label, value, icon: Icon, tone }: {
  label: string; value: number | string; icon: any;
  tone: "info" | "success" | "warning" | "destructive" | "neutral";
}) {
  const toneClass = {
    info: "text-info bg-info/10 dark:bg-info/15",
    success: "text-success bg-success/10 dark:bg-success/15",
    warning: "text-amber-600 bg-amber-500/15 dark:text-amber-300 dark:bg-amber-500/15",
    destructive: "text-destructive bg-destructive/10 dark:bg-destructive/15",
    neutral: "text-muted-foreground bg-muted",
  }[tone];

  return (
    <Card className="border-border shadow-soft">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <span className={cn("grid h-9 w-9 place-items-center rounded-lg", toneClass)}>
            <Icon className="h-4 w-4" />
          </span>
        </div>
        <div className="mt-3">
          <div className="font-display text-2xl font-semibold tracking-tight">{value}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function aggregateCounts(tickets: any[]) {
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  return {
    open: tickets.filter((t) => t.status === "open").length,
    inProgress: tickets.filter((t) => t.status === "in_progress").length,
    resolvedToday: tickets.filter((t) => t.status === "resolved" && new Date(t.created_at) >= todayStart).length,
    resolvedMonth: tickets.filter((t) => t.status === "resolved" && new Date(t.created_at) >= monthStart).length,
    critical: tickets.filter((t) => t.priority === "critical").length,
  };
}

function buildStatusData(tickets: any[]) {
  const map = new Map<string, number>();
  tickets.forEach((t) => map.set(t.status, (map.get(t.status) ?? 0) + 1));
  return Array.from(map.entries()).map(([k, v]) => ({ name: STATUS_LABEL[k] ?? k, value: v }));
}

function buildProductivityData(tickets: any[], techs: any[]) {
  const byTech = new Map<string, number>();
  tickets.filter((t) => t.status === "resolved" && t.assigned_to).forEach((t) => {
    byTech.set(t.assigned_to, (byTech.get(t.assigned_to) ?? 0) + 1);
  });
  return techs.slice(0, 8).map((t) => ({
    name: (t.full_name ?? "—").split(" ")[0],
    resolvidos: byTech.get(t.id) ?? 0,
  }));
}

function buildTrendData(tickets: any[]) {
  const out: { day: string; abertos: number; resolvidos: number }[] = [];
  const today = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today); d.setDate(today.getDate() - i); d.setHours(0, 0, 0, 0);
    const next = new Date(d); next.setDate(d.getDate() + 1);
    const inDay = tickets.filter((t) => {
      const c = new Date(t.created_at); return c >= d && c < next;
    });
    out.push({
      day: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      abertos: inDay.length,
      resolvidos: inDay.filter((t) => t.status === "resolved").length,
    });
  }
  return out;
}

function initials(name?: string) {
  if (!name) return "JJ";
  return name.split(" ").map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

function formatRelative(date: string) {
  const d = new Date(date); const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} min atrás`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h atrás`;
  return d.toLocaleDateString("pt-BR");
}
