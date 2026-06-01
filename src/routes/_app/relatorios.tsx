import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { BarChart3, Download, FileText, Calendar, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_app/relatorios")({ component: ReportsPage });

const REPORTS = [
  { id: "tickets",  title: "Chamados por período",      desc: "Lista completa de chamados em um intervalo de datas.", icon: FileText },
  { id: "tech",     title: "Produtividade por técnico", desc: "Atendimentos, tempo médio e taxa de resolução.",       icon: BarChart3 },
  { id: "clients",  title: "Atendimentos por cliente",  desc: "Histórico consolidado por empresa cliente.",            icon: FileText },
  { id: "sla",      title: "Cumprimento de SLA",        desc: "Chamados dentro/fora do prazo contratual.",             icon: Calendar },
];

function ReportsPage() {
  const [type, setType] = useState("tickets");
  const [from, setFrom] = useState(() => new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [generating, setGenerating] = useState(false);

  const { data: summary } = useQuery({
    queryKey: ["report-summary", from, to],
    queryFn: async () => {
      const { count: total } = await supabase.from("tickets").select("*", { count: "exact", head: true })
        .gte("created_at", from).lte("created_at", to + "T23:59:59");
      const { count: resolved } = await supabase.from("tickets").select("*", { count: "exact", head: true })
        .gte("created_at", from).lte("created_at", to + "T23:59:59").eq("status", "resolved");
      const { count: critical } = await supabase.from("tickets").select("*", { count: "exact", head: true })
        .gte("created_at", from).lte("created_at", to + "T23:59:59").eq("priority", "critical");
      return { total: total ?? 0, resolved: resolved ?? 0, critical: critical ?? 0 };
    },
  });

  async function generate() {
    setGenerating(true);
    try {
      const { data } = await supabase.from("tickets")
        .select("ticket_number, title, status, priority, created_at, contact_name")
        .gte("created_at", from).lte("created_at", to + "T23:59:59")
        .order("created_at", { ascending: false });
      const rows = data ?? [];
      const csv = [
        ["Número", "Título", "Status", "Prioridade", "Criado em", "Contato"].join(";"),
        ...rows.map((r: any) => [r.ticket_number, JSON.stringify(r.title ?? ""), r.status, r.priority, r.created_at, r.contact_name ?? ""].join(";")),
      ].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `relatorio-${type}-${from}-a-${to}.csv`; a.click();
      URL.revokeObjectURL(url);
      toast.success("Relatório gerado");
    } catch (e: any) {
      toast.error("Falha ao gerar", { description: e?.message });
    } finally { setGenerating(false); }
  }

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-6">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Análise</p>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Relatórios</h1>
        <p className="text-sm text-muted-foreground">Gere relatórios operacionais e exporte em CSV.</p>
      </header>

      <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-3">
        <Kpi label="Chamados no período" value={summary?.total ?? "—"} />
        <Kpi label="Resolvidos" value={summary?.resolved ?? "—"} />
        <Kpi label="Críticos" value={summary?.critical ?? "—"} />
      </div>

      <div className="rounded-xl border border-border bg-surface p-5 shadow-soft">
        <h2 className="font-display text-sm font-semibold">Gerar novo relatório</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          <div className="sm:col-span-2">
            <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Tipo</label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="mt-1 h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                {REPORTS.map((r) => <SelectItem key={r.id} value={r.id}>{r.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">De</label>
            <Input type="date" className="mt-1 h-10" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Até</label>
            <Input type="date" className="mt-1 h-10" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
        <div className="mt-5 flex justify-end">
          <Button onClick={generate} disabled={generating}>
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Exportar CSV
          </Button>
        </div>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {REPORTS.map((r) => (
          <div key={r.id} className="flex items-start gap-3 rounded-xl border border-border bg-surface p-4 shadow-soft">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
              <r.icon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <div className="text-sm font-semibold">{r.title}</div>
              <div className="text-xs text-muted-foreground">{r.desc}</div>
            </div>
            <Button size="sm" variant="ghost" className="ml-auto" onClick={() => { setType(r.id); generate(); }}>
              <Download className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4 shadow-soft">
      <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 font-display text-2xl font-semibold">{value}</div>
    </div>
  );
}
