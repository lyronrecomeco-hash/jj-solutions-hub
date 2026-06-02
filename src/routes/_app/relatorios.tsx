import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { BarChart3, Download, FileText, Calendar, Loader2, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_app/relatorios")({ component: ReportsPage });

const STATUS_LABEL: Record<string, string> = {
  open: "Aberto", in_progress: "Em andamento", waiting_part: "Aguardando peça",
  waiting_client: "Aguardando cliente", resolved: "Resolvido",
  partially_resolved: "Parcial", not_resolved: "Não resolvido", cancelled: "Cancelado",
  closed: "Finalizado",
};

const PRIORITY_LABEL: Record<string, string> = {
  critical: "Crítica", high: "Alta", medium: "Média", low: "Baixa",
};

function ReportsPage() {
  const [from, setFrom] = useState(() => new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [techId, setTechId] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [clientId, setClientId] = useState<string>("all");
  const [generating, setGenerating] = useState<"pdf" | "xlsx" | null>(null);

  const { data: techs = [] } = useQuery({
    queryKey: ["report-techs"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, full_name").order("full_name");
      return data ?? [];
    },
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["report-clients"],
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("id, company").order("company");
      return data ?? [];
    },
  });

  const { data: rows = [] } = useQuery({
    queryKey: ["report-data", from, to, techId, status, clientId],
    queryFn: async () => {
      let q = supabase.from("tickets")
        .select("ticket_number, title, status, priority, created_at, closed_at, contact_name, assigned_to, clients(company)")
        .gte("created_at", from).lte("created_at", to + "T23:59:59")
        .order("created_at", { ascending: false });
      if (techId !== "all") q = q.eq("assigned_to", techId);
      if (status !== "all") q = q.eq("status", status as any);
      if (clientId !== "all") q = q.eq("client_id", clientId);
      const { data } = await q;
      const rows = (data ?? []) as any[];
      const ids = [...new Set(rows.map((r) => r.assigned_to).filter(Boolean))];
      if (ids.length === 0) return rows;
      const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", ids);
      const byId = new Map((profiles ?? []).map((p: any) => [p.id, { full_name: p.full_name }]));
      return rows.map((r) => ({ ...r, profiles: r.assigned_to ? byId.get(r.assigned_to) ?? null : null }));
    },
  });

  const summary = useMemo(() => {
    const total = rows.length;
    const resolved = rows.filter((r) => r.status === "resolved" || r.status === "closed").length;
    const inProgress = rows.filter((r) => r.status === "in_progress").length;
    const critical = rows.filter((r) => r.priority === "critical").length;
    const closed = rows.filter((r) => r.closed_at);
    const avgHours = closed.length
      ? Math.round(closed.reduce((acc, r) => acc + (new Date(r.closed_at).getTime() - new Date(r.created_at).getTime()) / 3600000, 0) / closed.length)
      : 0;
    return { total, resolved, inProgress, critical, avgHours };
  }, [rows]);

  function buildTableRows() {
    return rows.map((r) => [
      r.ticket_number,
      r.title,
      r.clients?.company ?? r.contact_name ?? "—",
      r.profiles?.full_name ?? "—",
      PRIORITY_LABEL[r.priority] ?? r.priority,
      STATUS_LABEL[r.status] ?? r.status,
      new Date(r.created_at).toLocaleDateString("pt-BR"),
      r.closed_at ? new Date(r.closed_at).toLocaleDateString("pt-BR") : "—",
    ]);
  }

  async function exportPdf() {
    setGenerating("pdf");
    try {
      const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
      doc.setFontSize(16); doc.setFont("helvetica", "bold");
      doc.text("JJ Informática — Relatório de Chamados", 40, 40);
      doc.setFontSize(9); doc.setFont("helvetica", "normal");
      doc.text(`Período: ${formatBR(from)} a ${formatBR(to)}`, 40, 58);
      doc.text(`Gerado em ${new Date().toLocaleString("pt-BR")}`, 40, 72);

      // Summary
      doc.setFontSize(10); doc.setFont("helvetica", "bold");
      doc.text(`Total: ${summary.total}  ·  Resolvidos: ${summary.resolved}  ·  Em andamento: ${summary.inProgress}  ·  Críticos: ${summary.critical}  ·  Tempo médio: ${summary.avgHours}h`, 40, 92);

      autoTable(doc, {
        startY: 110,
        head: [["Nº", "Título", "Cliente", "Técnico", "Prioridade", "Status", "Aberto", "Fechado"]],
        body: buildTableRows(),
        styles: { fontSize: 8, cellPadding: 4 },
        headStyles: { fillColor: [33, 33, 33], textColor: 255 },
        alternateRowStyles: { fillColor: [245, 245, 245] },
      });

      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8); doc.setTextColor(120);
        doc.text(`Página ${i}/${pageCount}`, doc.internal.pageSize.getWidth() - 60, doc.internal.pageSize.getHeight() - 20);
      }
      doc.save(`relatorio-chamados-${from}-a-${to}.pdf`);
      toast.success("PDF gerado");
    } catch (e: any) {
      toast.error("Falha no PDF", { description: e?.message });
    } finally { setGenerating(null); }
  }

  async function exportXlsx() {
    setGenerating("xlsx");
    try {
      const wb = XLSX.utils.book_new();
      const resumo = XLSX.utils.aoa_to_sheet([
        ["JJ Informática — Relatório de Chamados"],
        [`Período: ${formatBR(from)} a ${formatBR(to)}`],
        [],
        ["Total de chamados", summary.total],
        ["Resolvidos", summary.resolved],
        ["Em andamento", summary.inProgress],
        ["Críticos", summary.critical],
        ["Tempo médio (h)", summary.avgHours],
      ]);
      XLSX.utils.book_append_sheet(wb, resumo, "Resumo");

      const tabular = XLSX.utils.aoa_to_sheet([
        ["Nº", "Título", "Cliente", "Técnico", "Prioridade", "Status", "Aberto", "Fechado"],
        ...buildTableRows(),
      ]);
      XLSX.utils.book_append_sheet(wb, tabular, "Chamados");
      XLSX.writeFile(wb, `relatorio-chamados-${from}-a-${to}.xlsx`);
      toast.success("Excel gerado");
    } catch (e: any) {
      toast.error("Falha no Excel", { description: e?.message });
    } finally { setGenerating(null); }
  }

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-6">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Análise</p>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Relatórios</h1>
        <p className="text-sm text-muted-foreground">Gere relatórios operacionais em PDF ou Excel.</p>
      </header>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
        <Kpi label="Chamados" value={summary.total} />
        <Kpi label="Resolvidos" value={summary.resolved} />
        <Kpi label="Em andamento" value={summary.inProgress} />
        <Kpi label="Críticos" value={summary.critical} />
        <Kpi label="Tempo médio (h)" value={summary.avgHours} />
      </div>

      <div className="rounded-xl border border-border bg-surface p-5 shadow-soft">
        <h2 className="font-display text-sm font-semibold">Filtros</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Field label="De"><Input type="date" className="h-10" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
          <Field label="Até"><Input type="date" className="h-10" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
          <Field label="Técnico">
            <Select value={techId} onValueChange={setTechId}>
              <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {techs.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Cliente">
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {clients.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.company}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Status">
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {Object.entries(STATUS_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={exportXlsx} disabled={!!generating}>
            {generating === "xlsx" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
            Exportar Excel
          </Button>
          <Button onClick={exportPdf} disabled={!!generating}>
            {generating === "pdf" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Exportar PDF
          </Button>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-border bg-surface shadow-soft">
        <div className="border-b border-border px-5 py-3 text-sm font-semibold">Pré-visualização ({rows.length})</div>
        <div className="max-h-[420px] overflow-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-surface-muted/80 text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <Th>Nº</Th><Th>Título</Th><Th>Cliente</Th><Th>Técnico</Th><Th>Prioridade</Th><Th>Status</Th><Th>Aberto</Th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={7} className="px-5 py-10 text-center text-muted-foreground">Sem dados no período.</td></tr>
              )}
              {rows.slice(0, 100).map((r: any, i: number) => (
                <tr key={i} className="border-t border-border">
                  <Td className="font-mono">{r.ticket_number}</Td>
                  <Td>{r.title}</Td>
                  <Td>{r.clients?.company ?? r.contact_name ?? "—"}</Td>
                  <Td>{r.profiles?.full_name ?? "—"}</Td>
                  <Td>{PRIORITY_LABEL[r.priority] ?? r.priority}</Td>
                  <Td>{STATUS_LABEL[r.status] ?? r.status}</Td>
                  <Td>{new Date(r.created_at).toLocaleDateString("pt-BR")}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-2">
        <Info icon={FileText} title="PDF executivo" desc="Cabeçalho JJ, resumo gerencial e tabela completa do período." />
        <Info icon={BarChart3} title="Excel analítico" desc="Duas abas: resumo + listagem detalhada para análise." />
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function Info({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-surface p-4 shadow-soft">
      <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary"><Icon className="h-5 w-5" /></span>
      <div className="min-w-0">
        <div className="text-sm font-semibold">{title}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) { return <th className="px-3 py-2 text-left font-medium">{children}</th>; }
function Td({ children, className }: { children: React.ReactNode; className?: string }) { return <td className={"px-3 py-2 " + (className ?? "")}>{children}</td>; }
function formatBR(d: string) { return new Date(d).toLocaleDateString("pt-BR"); }
