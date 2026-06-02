import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import {
  Search, Paperclip, Send, Image as ImageIcon, Video, Loader2,
  MessageSquare, Check, CheckCheck, Eye, ArrowLeft, Plus, Ticket as TicketIcon,
  ExternalLink, Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-mobile";

export const Route = createFileRoute("/_app/mensagens")({ component: MessagesPage });

type Tech = { id: string; full_name: string; photo_url: string | null; specialty: string | null };
type Msg = {
  id: string; technician_id: string; author_id: string;
  ticket_id: string | null;
  body: string | null; media_url: string | null; media_type: string | null;
  created_at: string; read_at: string | null;
};
type Summary = { last: Msg | null; unread: number };

function MessagesPage() {
  const { user, isStaff } = useAuth();
  const isMobile = useIsMobile();
  const [q, setQ] = useState("");
  const [chatFor, setChatFor] = useState<Tech | null>(null);
  const [chatTicketId, setChatTicketId] = useState<string | null>(null);
  const [removeFor, setRemoveFor] = useState<Tech | null>(null);
  const qcDel = useQueryClient();
  const delThread = useMutation({
    mutationFn: async (techId: string) => {
      const { error } = await (supabase.from("technician_messages") as any).delete().eq("technician_id", techId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Conversa excluída");
      qcDel.invalidateQueries({ queryKey: ["msg-summaries"] });
      qcDel.invalidateQueries({ queryKey: ["tech-atend-list"] });
      setRemoveFor(null);
    },
    onError: (e: any) => toast.error("Falha ao excluir", { description: e?.message }),
  });

  const { data: techs = [], isLoading } = useQuery({
    queryKey: ["msg-techs"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles")
        .select("id, full_name, photo_url, specialty").order("full_name");
      return (data ?? []) as Tech[];
    },
  });

  const { data: summaries = {} } = useQuery({
    queryKey: ["msg-summaries", techs.map((t) => t.id).join(","), user?.id],
    enabled: techs.length > 0 && !!user && isStaff,
    queryFn: async () => {
      const { data } = await (supabase.from("technician_messages") as any)
        .select("id, technician_id, author_id, ticket_id, body, media_url, media_type, created_at, read_at")
        .order("created_at", { ascending: false })
        .limit(500);
      const all = (data ?? []) as Msg[];
      const out: Record<string, Summary> = {};
      for (const t of techs) {
        const mine = all.filter((m) => m.technician_id === t.id);
        out[t.id] = {
          last: mine[0] ?? null,
          unread: mine.filter((m) => !m.read_at && m.author_id !== user!.id).length,
        };
      }
      return out;
    },
  });

  const qc = useQueryClient();
  useEffect(() => {
    const ch = supabase
      .channel("msg-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "technician_messages" },
        () => {
          qc.invalidateQueries({ queryKey: ["msg-summaries"] });
          qc.invalidateQueries({ queryKey: ["tech-atend-list"] });
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  const filtered = techs.filter((t) =>
    !q || [t.full_name, t.specialty].filter(Boolean).join(" ").toLowerCase().includes(q.toLowerCase()),
  );

  // ===== TECHNICIAN view: list of atendimentos, no auto-open chat =====
  if (!isStaff && user) {
    const me = techs.find((t) => t.id === user.id) ?? null;

    if (chatFor && isMobile) {
      return (
        <div className="flex h-[calc(100svh-3.5rem)] flex-col bg-background">
          <div className="flex items-center gap-3 border-b border-border px-3 py-3">
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => { setChatFor(null); setChatTicketId(null); }}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary"><MessageSquare className="h-4 w-4" /></div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{chatTicketId ? "Atendimento" : "Conversa geral"}</div>
              <div className="truncate text-[11px] text-muted-foreground">Supervisão</div>
            </div>
          </div>
          <ChatPanel tech={chatFor} ticketId={chatTicketId} mobile />
        </div>
      );
    }

    return (
      <TechMyMessages
        me={me}
        onOpen={(ticketId) => { setChatFor(me); setChatTicketId(ticketId); }}
        chatFor={chatFor}
        chatTicketId={chatTicketId}
        onClose={() => { setChatFor(null); setChatTicketId(null); }}
      />
    );
  }

  // ===== STAFF view (unchanged base) =====
  if (isMobile && chatFor) {
    return (
      <div className="flex h-[calc(100svh-3.5rem)] flex-col bg-background">
        <div className="flex items-center gap-3 border-b border-border px-3 py-3">
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setChatFor(null)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Avatar className="h-9 w-9">
            {chatFor.photo_url && <img src={chatFor.photo_url} alt="" className="h-full w-full object-cover" />}
            <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">{chatFor.full_name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">{chatFor.full_name}</div>
            <div className="truncate text-xs text-muted-foreground">{chatFor.specialty ?? "Técnico"}</div>
          </div>
        </div>
        <ChatPanel tech={chatFor} ticketId={null} mobile />
      </div>
    );
  }

  return (
    <div className="w-full px-3 py-4 sm:px-6 lg:px-8 lg:py-6">
      <div className="mb-6 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary"><MessageSquare className="h-5 w-5" /></div>
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Mensagens</h1>
          <p className="text-sm text-muted-foreground">Murais privados de cada técnico — clique no olho para abrir o chat.</p>
        </div>
      </div>

      <div className="mb-4 max-w-sm">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar técnico…" className="h-10 pl-9 bg-surface-muted" />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-soft">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-muted/60 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Técnico</th>
                <th className="px-4 py-3">Última mensagem</th>
                <th className="px-4 py-3 hidden md:table-cell">Atualizado</th>
                <th className="px-4 py-3">Não lidas</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">Nenhum técnico encontrado.</td></tr>
              ) : filtered.map((t) => {
                const s = (summaries as Record<string, Summary>)[t.id];
                const initials = t.full_name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
                const lastText = s?.last
                  ? (s.last.body ?? (s.last.media_type === "video" ? "📹 Vídeo" : "🖼️ Imagem"))
                  : "Sem mensagens ainda";
                return (
                  <tr key={t.id} className="hover:bg-surface-muted/40">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          {t.photo_url && <img src={t.photo_url} alt="" className="h-full w-full object-cover" />}
                          <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">{initials}</AvatarFallback>
                        </Avatar>
                        <div className="leading-tight">
                          <div className="text-sm font-semibold">{t.full_name}</div>
                          <div className="text-xs text-muted-foreground">{t.specialty ?? "Técnico"}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 max-w-[340px] truncate text-sm text-muted-foreground">{lastText}</td>
                    <td className="px-4 py-3 hidden md:table-cell text-xs text-muted-foreground">
                      {s?.last ? new Date(s.last.created_at).toLocaleString("pt-BR") : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {s && s.unread > 0
                        ? <Badge className="bg-primary text-primary-foreground">{s.unread}</Badge>
                        : <span className="text-xs text-muted-foreground">0</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button size="icon" variant="ghost" className="h-8 w-8" title="Abrir chat" onClick={() => setChatFor(t)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={!!chatFor && !isMobile} onOpenChange={(o) => !o && setChatFor(null)}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden">
          <DialogHeader className="border-b border-border px-5 py-3">
            <DialogTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="h-4 w-4 text-primary" /> {chatFor?.full_name}
            </DialogTitle>
            <DialogDescription className="text-xs">{chatFor?.specialty ?? "Técnico"}</DialogDescription>
          </DialogHeader>
          <ChatPanel tech={chatFor} ticketId={null} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// =========================================================
// Technician — list of atendimentos (grouped by ticket_id) +
// "Abrir atendimento" button. Clicking opens the chat.
// =========================================================
function TechMyMessages({
  me, onOpen, chatFor, chatTicketId, onClose,
}: {
  me: Tech | null;
  onOpen: (ticketId: string | null) => void;
  chatFor: Tech | null;
  chatTicketId: string | null;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [openNew, setOpenNew] = useState(false);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["tech-atend-list", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await (supabase.from("technician_messages") as any)
        .select("id, technician_id, author_id, ticket_id, body, media_url, media_type, created_at, read_at")
        .eq("technician_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(500);
      return (data ?? []) as Msg[];
    },
  });

  // Group by ticket_id (null = "Conversa geral")
  const groups = useMemo(() => {
    const map = new Map<string, { ticketId: string | null; last: Msg; unread: number }>();
    for (const m of rows) {
      const key = m.ticket_id ?? "__general__";
      const cur = map.get(key);
      const isUnread = !m.read_at && m.author_id !== user?.id;
      if (!cur) {
        map.set(key, { ticketId: m.ticket_id, last: m, unread: isUnread ? 1 : 0 });
      } else {
        if (isUnread) cur.unread += 1;
      }
    }
    return Array.from(map.values()).sort((a, b) =>
      new Date(b.last.created_at).getTime() - new Date(a.last.created_at).getTime(),
    );
  }, [rows, user?.id]);

  const ticketIds = useMemo(
    () => [...new Set(groups.map((g) => g.ticketId).filter(Boolean) as string[])],
    [groups],
  );
  const { data: ticketsMap = {} } = useQuery({
    queryKey: ["tech-atend-tickets", ticketIds.join(",")],
    enabled: ticketIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase.from("tickets")
        .select("id, ticket_number, title").in("id", ticketIds);
      const out: Record<string, { ticket_number: string; title: string }> = {};
      for (const t of (data ?? []) as any[]) out[t.id] = { ticket_number: t.ticket_number, title: t.title };
      return out;
    },
  });

  const chatHeader = chatTicketId ? (ticketsMap as any)[chatTicketId] : null;

  return (
    <div className="w-full px-3 py-4 sm:px-6 lg:px-8 lg:py-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary"><MessageSquare className="h-5 w-5" /></div>
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight">Mensagens</h1>
            <p className="text-sm text-muted-foreground">Seus atendimentos com a supervisão. Toque em um para abrir o chat.</p>
          </div>
        </div>
        <Button onClick={() => setOpenNew(true)}>
          <Plus className="h-4 w-4" /> Abrir atendimento
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-soft">
        {isLoading ? (
          <div className="py-12 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : groups.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-muted-foreground">
            Você ainda não tem atendimentos. Toque em <span className="font-semibold text-foreground">Abrir atendimento</span> para começar.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {groups.map((g) => {
              const tk = g.ticketId ? (ticketsMap as any)[g.ticketId] : null;
              const lastText = g.last.body ?? (g.last.media_type === "video" ? "📹 Vídeo" : "🖼️ Imagem");
              return (
                <li key={g.ticketId ?? "general"}>
                  <button
                    onClick={() => onOpen(g.ticketId)}
                    className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-surface-muted/50"
                  >
                    <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
                      {g.ticketId ? <TicketIcon className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold truncate">
                          {tk ? `${tk.ticket_number} · ${tk.title}` : "Conversa geral"}
                        </span>
                      </div>
                      <div className="mt-0.5 truncate text-xs text-muted-foreground">{lastText}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[11px] text-muted-foreground">{new Date(g.last.created_at).toLocaleString("pt-BR")}</div>
                      {g.unread > 0 && <Badge className="mt-1 bg-primary text-primary-foreground">{g.unread}</Badge>}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <NewAtendDialog
        open={openNew}
        onOpenChange={setOpenNew}
        onPicked={(ticketId) => { setOpenNew(false); onOpen(ticketId); }}
      />

      {/* Desktop chat opens as dialog; mobile uses full-screen route above */}
      <Dialog open={!!chatFor && !isMobile} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden">
          <DialogHeader className="border-b border-border px-5 py-3">
            <DialogTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="h-4 w-4 text-primary" />
              {chatHeader ? `${chatHeader.ticket_number} · ${chatHeader.title}` : "Conversa geral"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {chatHeader ? (
                <Link to="/chamados/$id" params={{ id: chatTicketId! }} className="inline-flex items-center gap-1 text-primary hover:underline">
                  Abrir chamado <ExternalLink className="h-3 w-3" />
                </Link>
              ) : "Mensagens não vinculadas a um chamado"}
            </DialogDescription>
          </DialogHeader>
          <ChatPanel tech={me} ticketId={chatTicketId} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function NewAtendDialog({
  open, onOpenChange, onPicked,
}: { open: boolean; onOpenChange: (b: boolean) => void; onPicked: (ticketId: string | null) => void; }) {
  const { user } = useAuth();
  const [picked, setPicked] = useState<string>("general");

  const { data: myTickets = [] } = useQuery({
    queryKey: ["my-open-tickets", user?.id],
    enabled: !!user && open,
    queryFn: async () => {
      const { data } = await supabase.from("tickets")
        .select("id, ticket_number, title, status")
        .eq("assigned_to", user!.id)
        .not("status", "in", "(closed,cancelled)")
        .order("created_at", { ascending: false })
        .limit(50);
      return (data ?? []) as { id: string; ticket_number: string; title: string; status: string }[];
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Abrir atendimento</DialogTitle>
          <DialogDescription>Escolha o chamado para iniciar a conversa, ou siga com uma conversa geral.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Select value={picked} onValueChange={setPicked}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="general">Conversa geral (sem chamado)</SelectItem>
              {myTickets.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.ticket_number} · {t.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {myTickets.length === 0 && (
            <p className="text-xs text-muted-foreground">Você não tem chamados ativos. Escolha conversa geral para falar com a supervisão.</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => onPicked(picked === "general" ? null : picked)}>Abrir</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ChatPanel({ tech, ticketId, embedded, mobile }: { tech: Tech | null; ticketId: string | null; embedded?: boolean; mobile?: boolean }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["tech-messages", tech?.id, ticketId ?? "__general__"],
    enabled: !!tech,
    queryFn: async () => {
      let qb = (supabase.from("technician_messages") as any)
        .select("id, technician_id, author_id, ticket_id, body, media_url, media_type, created_at, read_at")
        .eq("technician_id", tech!.id);
      qb = ticketId ? qb.eq("ticket_id", ticketId) : qb.is("ticket_id", null);
      const { data } = await qb.order("created_at", { ascending: true });
      return (data ?? []) as Msg[];
    },
  });

  useEffect(() => {
    if (!tech) return;
    const ch = supabase
      .channel(`tech-msgs-${tech.id}-${ticketId ?? "g"}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "technician_messages", filter: `technician_id=eq.${tech.id}` },
        () => qc.invalidateQueries({ queryKey: ["tech-messages", tech.id, ticketId ?? "__general__"] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [tech, ticketId, qc]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!user || !tech) return;
    const unread = messages.filter((m) => !m.read_at && m.author_id !== user.id);
    if (unread.length === 0) return;
    (async () => {
      const ids = unread.map((m) => m.id);
      await (supabase.from("technician_messages") as any).update({ read_at: new Date().toISOString() }).in("id", ids);
      qc.invalidateQueries({ queryKey: ["msg-summaries"] });
      qc.invalidateQueries({ queryKey: ["tech-atend-list"] });
    })();
  }, [messages, user, tech, qc]);

  const send = useMutation({
    mutationFn: async () => {
      if (!tech || !user) return;
      let media_url: string | null = null;
      let media_type: string | null = null;
      if (file) {
        const path = `${tech.id}/${Date.now()}-${file.name}`;
        const { error: upErr } = await supabase.storage.from("technician-messages").upload(path, file);
        if (upErr) throw new Error(upErr.message);
        const { data: pub } = supabase.storage.from("technician-messages").getPublicUrl(path);
        media_url = pub.publicUrl;
        media_type = file.type.startsWith("video") ? "video" : "image";
      }
      const { error } = await (supabase.from("technician_messages") as any).insert({
        technician_id: tech.id, author_id: user.id,
        ticket_id: ticketId, body: text || null, media_url, media_type,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { setText(""); setFile(null); qc.invalidateQueries({ queryKey: ["tech-messages", tech?.id, ticketId ?? "__general__"] }); },
    onError: (e: any) => toast.error("Falha ao enviar", { description: e?.message }),
  });

  const heightClass = mobile ? "h-full min-h-0" : embedded ? "h-[calc(100svh-14rem)] min-h-[420px]" : "h-[60vh]";

  return (
    <div className={`flex flex-col ${heightClass}`}>
      <div ref={scrollRef} className="flex-1 overflow-y-auto bg-surface-muted/40 p-3 sm:p-5">
        {!tech ? (
          <div className="grid h-full place-items-center text-sm text-muted-foreground">Selecione um técnico.</div>
        ) : isLoading ? (
          <div className="grid h-full place-items-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : messages.length === 0 ? (
          <div className="grid h-full place-items-center text-sm text-muted-foreground">Nenhuma mensagem ainda.</div>
        ) : (
          <ul className="mx-auto max-w-3xl space-y-3">
            {messages.map((m) => {
              const mine = m.author_id === user?.id;
              return (
                <li key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[86%] rounded-2xl border px-3 py-2.5 shadow-soft sm:max-w-[78%] sm:px-4 ${mine ? "border-primary/20 bg-primary text-primary-foreground" : "border-border bg-surface"}`}>
                    {m.media_url && m.media_type === "image" && <img src={m.media_url} alt="" className="mb-2 max-h-72 rounded-lg" />}
                    {m.media_url && m.media_type === "video" && <video src={m.media_url} controls className="mb-2 max-h-72 rounded-lg" />}
                    {m.body && <div className="whitespace-pre-wrap text-sm">{m.body}</div>}
                    <div className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                      <span>{new Date(m.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
                      {mine && (m.read_at
                        ? <CheckCheck className="h-3.5 w-3.5 text-sky-300" />
                        : <Check className="h-3.5 w-3.5" />)}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="border-t border-border bg-surface p-3">
        <div className="mx-auto flex max-w-3xl items-end gap-2">
          <label className="cursor-pointer rounded-md border border-border bg-surface-muted p-2 hover:bg-accent">
            <Paperclip className="h-4 w-4" />
            <input type="file" accept="image/*,video/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
          <div className="flex-1">
            {file && (
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-border bg-surface-muted px-3 py-1 text-xs">
                {file.type.startsWith("video") ? <Video className="h-3.5 w-3.5" /> : <ImageIcon className="h-3.5 w-3.5" />}
                {file.name}
                <button onClick={() => setFile(null)} className="text-muted-foreground hover:text-foreground">×</button>
              </div>
            )}
            <Textarea
              value={text} onChange={(e) => setText(e.target.value)}
              placeholder="Escreva algo."
              rows={1} className="min-h-[44px] resize-none bg-surface-muted"
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if ((text || file) && !send.isPending) send.mutate(); }}}
            />
          </div>
          <Button onClick={() => send.mutate()} disabled={(!text && !file) || send.isPending || !tech}>
            {send.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
