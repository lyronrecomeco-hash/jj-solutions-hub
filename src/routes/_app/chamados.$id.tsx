import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import {
  ArrowLeft, Clock, MapPin, User, Phone, Wrench, Calendar, Upload,
  Play, Pause, CheckCircle2, Loader2, Image as ImageIcon, FileText, X,
  Star, Plus, Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_app/chamados/$id")({ component: TicketDetailPage });

const STATUS_LABEL: Record<string, string> = {
  open: "Aberto", in_progress: "Em andamento", waiting_part: "Aguardando peça",
  waiting_client: "Aguardando cliente", resolved: "Resolvido",
  partially_resolved: "Parcial", not_resolved: "Não resolvido", cancelled: "Cancelado",
};
const PRIORITY_LABEL: Record<string, string> = {
  critical: "Crítico", high: "Alta", medium: "Média", low: "Baixa",
};
const PRIORITY_CLS: Record<string, string> = {
  critical: "border-destructive/30 bg-destructive/10 text-destructive",
  high: "border-warning/30 bg-warning/15 text-warning-foreground",
  medium: "border-info/30 bg-info/10 text-info",
  low: "border-border bg-muted text-muted-foreground",
};

function TicketDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();

  const { data: ticket, isLoading } = useQuery({
    queryKey: ["ticket", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("tickets")
        .select("*, clients(company, contact_name, phone, address)")
        .eq("id", id).maybeSingle();
      return data;
    },
  });

  const { data: assignedProfile } = useQuery({
    queryKey: ["ticket-assignee", ticket?.assigned_to],
    enabled: !!ticket?.assigned_to,
    queryFn: async () => {
      const { data } = await supabase.from("profiles")
        .select("full_name, email, specialty").eq("id", ticket!.assigned_to!).maybeSingle();
      return data;
    },
  });

  const { data: attachments = [] } = useQuery({
    queryKey: ["ticket-attachments", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("ticket_attachments").select("*").eq("ticket_id", id).order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: history = [] } = useQuery({
    queryKey: ["ticket-history", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("ticket_history").select("*").eq("ticket_id", id).order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const setStatus = useMutation({
    mutationFn: async (status: string) => {
      const patch: any = { status };
      if (status === "in_progress" && !ticket?.started_at) patch.started_at = new Date().toISOString();
      if (status === "resolved") patch.closed_at = new Date().toISOString();
      const { error } = await supabase.from("tickets").update(patch).eq("id", id);
      if (error) throw new Error(error.message);
      if (user?.id) {
        await supabase.from("ticket_history").insert({
          ticket_id: id, user_id: user.id, action: `status:${status}`,
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ticket", id] });
      qc.invalidateQueries({ queryKey: ["ticket-history", id] });
      toast.success("Status atualizado");
    },
    onError: (e: any) => toast.error("Falha", { description: e?.message }),
  });

  if (isLoading) return <div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  if (!ticket) return <div className="px-6 py-10 text-sm text-muted-foreground">Chamado não encontrado.</div>;

  return (
    <div className="w-full space-y-5 px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
      <button onClick={() => navigate({ to: "/chamados" })} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Voltar para chamados
      </button>

      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-medium text-muted-foreground">{ticket.ticket_number}</span>
            <Badge variant="outline" className={PRIORITY_CLS[ticket.priority]}>{PRIORITY_LABEL[ticket.priority]}</Badge>
            <Badge variant="outline">{STATUS_LABEL[ticket.status] ?? ticket.status}</Badge>
          </div>
          <h1 className="mt-1.5 font-display text-2xl font-semibold tracking-tight">{ticket.title}</h1>
          {ticket.description && <p className="mt-1.5 max-w-3xl text-sm text-muted-foreground">{ticket.description}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          {ticket.status === "open" && (
            <Button onClick={() => setStatus.mutate("in_progress")} disabled={setStatus.isPending}>
              <Play className="h-4 w-4" /> Iniciar atendimento
            </Button>
          )}
          {ticket.status === "in_progress" && (
            <>
              <Button variant="outline" onClick={() => setStatus.mutate("waiting_part")}>
                <Pause className="h-4 w-4" /> Pausar
              </Button>
              <Button onClick={() => setStatus.mutate("resolved")} disabled={setStatus.isPending}>
                <CheckCircle2 className="h-4 w-4" /> Concluir
              </Button>
            </>
          )}
          {ticket.status === "waiting_part" && (
            <Button onClick={() => setStatus.mutate("in_progress")}>
              <Play className="h-4 w-4" /> Retomar
            </Button>
          )}
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <Tabs defaultValue="details">
          <TabsList className="bg-surface-muted">
            <TabsTrigger value="details">Detalhes</TabsTrigger>
            <TabsTrigger value="evidence">Evidências</TabsTrigger>
            <TabsTrigger value="report">Relatório técnico</TabsTrigger>
            <TabsTrigger value="history">Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="mt-4 space-y-4">
            <Card title="Cliente & contato">
              <Row icon={User} label="Cliente" v={ticket.clients?.company ?? "—"} />
              <Row icon={User} label="Contato" v={ticket.contact_name ?? ticket.clients?.contact_name ?? "—"} />
              <Row icon={Phone} label="Telefone" v={ticket.contact_phone ?? ticket.clients?.phone ?? "—"} />
              <Row icon={MapPin} label="Endereço" v={ticket.address ?? ticket.clients?.address ?? "—"} />
            </Card>
            <Card title="Equipamento">
              <Row icon={Wrench} label="Equipamento" v={ticket.equipment ?? "—"} />
              <Row icon={FileText} label="N° de série" v={ticket.serial_number ?? "—"} />
            </Card>
          </TabsContent>

          <TabsContent value="evidence" className="mt-4">
            <EvidenceArea ticketId={id} attachments={attachments} />
          </TabsContent>

          <TabsContent value="report" className="mt-4">
            <TechnicalReport ticketId={id} />
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <div className="rounded-xl border border-border bg-surface p-4">
              {history.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem registros.</p>
              ) : (
                <ol className="space-y-3">
                  {history.map((h: any) => (
                    <li key={h.id} className="flex items-start gap-3 text-sm">
                      <span className="mt-1 h-2 w-2 rounded-full bg-primary" />
                      <div>
                        <div className="font-medium">{h.action}</div>
                        <div className="text-xs text-muted-foreground">{new Date(h.created_at).toLocaleString("pt-BR")}</div>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Aside */}
        <aside className="space-y-4">
          <div className="rounded-xl border border-border bg-surface p-4 shadow-soft">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Responsável</h3>
            <div className="mt-2 text-sm font-medium">{assignedProfile?.full_name ?? "Não atribuído"}</div>
            <div className="text-xs text-muted-foreground">{assignedProfile?.specialty ?? assignedProfile?.email}</div>
          </div>

          <div className="rounded-xl border border-border bg-surface p-4 shadow-soft">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tempos</h3>
            <div className="mt-2 space-y-2 text-sm">
              <Row icon={Calendar} label="Aberto" v={new Date(ticket.created_at).toLocaleString("pt-BR")} dense />
              {ticket.started_at && <Row icon={Play} label="Início" v={new Date(ticket.started_at).toLocaleString("pt-BR")} dense />}
              {ticket.closed_at && <Row icon={CheckCircle2} label="Fechado" v={new Date(ticket.closed_at).toLocaleString("pt-BR")} dense />}
              {ticket.deadline && <Row icon={Clock} label="SLA" v={new Date(ticket.deadline).toLocaleString("pt-BR")} dense />}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4 shadow-soft">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
      <div className="space-y-2.5">{children}</div>
    </div>
  );
}

function Row({ icon: Icon, label, v, dense }: { icon: any; label: string; v: string; dense?: boolean }) {
  return (
    <div className={cn("flex items-start gap-2.5", dense ? "text-xs" : "text-sm")}>
      <Icon className={cn("text-muted-foreground", dense ? "h-3.5 w-3.5 mt-0.5" : "h-4 w-4 mt-0.5")} />
      <div className="min-w-0 flex-1">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="font-medium">{v}</div>
      </div>
    </div>
  );
}

function EvidenceArea({ ticketId, attachments }: { ticketId: string; attachments: any[] }) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [category, setCategory] = useState("during");
  const [uploading, setUploading] = useState(false);
  const [drag, setDrag] = useState(false);

  async function handleFiles(files: FileList | null) {
    if (!files || !files.length || !user?.id) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const path = `${ticketId}/${Date.now()}-${file.name.replace(/\s+/g, "_")}`;
        const { error: upErr } = await supabase.storage.from("ticket-evidence").upload(path, file, { upsert: false });
        if (upErr) throw new Error(upErr.message);
        const { data: pub } = supabase.storage.from("ticket-evidence").getPublicUrl(path);
        const { error } = await supabase.from("ticket_attachments").insert({
          ticket_id: ticketId, uploaded_by: user.id, file_name: file.name, file_url: pub.publicUrl,
          mime_type: file.type, category,
        });
        if (error) throw new Error(error.message);
      }
      toast.success("Evidência enviada");
      qc.invalidateQueries({ queryKey: ["ticket-attachments", ticketId] });
    } catch (e: any) {
      toast.error("Falha no upload", { description: e?.message });
    } finally {
      setUploading(false);
    }
  }

  const groups: Record<string, string> = {
    before: "Antes do serviço", during: "Durante o serviço", after: "Após o serviço",
    defect: "Peça defeituosa", invoice: "Nota fiscal",
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-surface p-4 shadow-soft">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <div className="space-y-1.5">
            <Label>Categoria</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-9 w-56"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(groups).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <label
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); handleFiles(e.dataTransfer.files); }}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed py-10 text-sm transition",
            drag ? "border-primary bg-primary/5" : "border-border bg-surface-muted/50 hover:bg-surface-muted",
          )}
        >
          {uploading ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /> : <Upload className="h-6 w-6 text-muted-foreground" />}
          <div className="font-medium">Arraste arquivos aqui ou clique para enviar</div>
          <div className="text-xs text-muted-foreground">PNG, JPG, WEBP, GIF, PDF · até 10MB cada</div>
          <input type="file" multiple accept="image/*,application/pdf" className="hidden"
            onChange={(e) => handleFiles(e.target.files)} />
        </label>
      </div>

      {Object.entries(groups).map(([key, label]) => {
        const items = attachments.filter((a) => a.category === key);
        if (items.length === 0) return null;
        return (
          <div key={key} className="rounded-xl border border-border bg-surface p-4 shadow-soft">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {items.map((a: any) => (
                <a key={a.id} href={a.file_url} target="_blank" rel="noreferrer" className="group relative overflow-hidden rounded-lg border border-border bg-surface-muted">
                  {a.mime_type?.startsWith("image/") ? (
                    <img src={a.file_url} alt={a.file_name} className="aspect-square w-full object-cover transition group-hover:scale-105" />
                  ) : (
                    <div className="flex aspect-square items-center justify-center"><FileText className="h-8 w-8 text-muted-foreground" /></div>
                  )}
                  <div className="truncate p-1.5 text-[10px]">{a.file_name}</div>
                </a>
              ))}
            </div>
          </div>
        );
      })}
      {attachments.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-surface-muted/30 py-10 text-center text-sm text-muted-foreground">
          <ImageIcon className="mx-auto mb-2 h-6 w-6" /> Nenhuma evidência adicionada ainda.
        </div>
      )}
    </div>
  );
}

function TechnicalReport({ ticketId }: { ticketId: string }) {
  const qc = useQueryClient();
  const { user } = useAuth();

  const { data: report } = useQuery({
    queryKey: ["ticket-report", ticketId],
    queryFn: async () => {
      const { data } = await supabase.from("ticket_reports").select("*").eq("ticket_id", ticketId).maybeSingle();
      return data;
    },
  });

  const [form, setForm] = useState({
    diagnosis: "", root_cause: "", procedures: "", solution: "",
    result: "", recommendations: "", internal_notes: "", needs_return: false,
  });

  // Hydrate once report arrives
  if (report && !form.diagnosis && (report.diagnosis || report.solution)) {
    setForm({
      diagnosis: report.diagnosis ?? "", root_cause: report.root_cause ?? "",
      procedures: report.procedures ?? "", solution: report.solution ?? "",
      result: report.result ?? "", recommendations: report.recommendations ?? "",
      internal_notes: report.internal_notes ?? "", needs_return: !!report.needs_return,
    });
  }

  const save = useMutation({
    mutationFn: async () => {
      const payload = { ...form, ticket_id: ticketId, created_by: user?.id ?? null };
      const { error } = report
        ? await supabase.from("ticket_reports").update(payload).eq("id", report.id)
        : await supabase.from("ticket_reports").insert(payload);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Relatório salvo");
      qc.invalidateQueries({ queryKey: ["ticket-report", ticketId] });
    },
    onError: (e: any) => toast.error("Falha", { description: e?.message }),
  });

  const FA = ({ k, label, rows = 3 }: { k: keyof typeof form; label: string; rows?: number }) => (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Textarea rows={rows} value={form[k] as string} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
    </div>
  );

  return (
    <div className="space-y-4 rounded-xl border border-border bg-surface p-5 shadow-soft">
      <div className="grid gap-4 sm:grid-cols-2">
        <FA k="diagnosis" label="Diagnóstico" />
        <FA k="root_cause" label="Causa raiz" />
      </div>
      <FA k="procedures" label="Procedimentos executados" rows={4} />
      <div className="grid gap-4 sm:grid-cols-2">
        <FA k="solution" label="Solução aplicada" />
        <FA k="result" label="Resultado obtido" />
      </div>
      <FA k="recommendations" label="Recomendações" />
      <FA k="internal_notes" label="Observações internas" />

      <label className="flex items-center justify-between rounded-lg border border-border bg-surface-muted px-4 py-3">
        <div>
          <div className="text-sm font-medium">Necessidade de retorno</div>
          <div className="text-xs text-muted-foreground">Marque se o atendimento exige nova visita.</div>
        </div>
        <Switch checked={form.needs_return} onCheckedChange={(v) => setForm({ ...form, needs_return: v })} />
      </label>

      <div className="flex justify-end pt-2">
        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar relatório"}
        </Button>
      </div>
    </div>
  );
}

// Quiet unused imports under bundler
void Link; void Input; void X;
