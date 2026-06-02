import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Search, Paperclip, Send, Image as ImageIcon, Video, Loader2, MessageSquare, Check, CheckCheck } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_app/mensagens")({ component: MessagesPage });

type Tech = { id: string; full_name: string; photo_url: string | null; specialty: string | null };
type Msg = { id: string; technician_id: string; author_id: string; body: string | null; media_url: string | null; media_type: string | null; created_at: string; read_at: string | null };

function MessagesPage() {
  const { user, isStaff } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: techs = [] } = useQuery({
    queryKey: ["msg-techs"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, full_name, photo_url, specialty").order("full_name");
      return (data ?? []) as Tech[];
    },
  });

  useEffect(() => {
    if (!activeId) {
      if (!isStaff && user) setActiveId(user.id);
      else if (techs.length) setActiveId(techs[0].id);
    }
  }, [techs, user, isStaff, activeId]);

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["tech-messages", activeId],
    enabled: !!activeId,
    queryFn: async () => {
      const { data } = await (supabase.from("technician_messages") as any)
        .select("id, technician_id, author_id, body, media_url, media_type, created_at, read_at")
        .eq("technician_id", activeId)
        .order("created_at", { ascending: true });
      return (data ?? []) as Msg[];
    },
  });

  // Realtime subscription
  useEffect(() => {
    if (!activeId) return;
    const ch = supabase
      .channel(`tech-msgs-${activeId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "technician_messages", filter: `technician_id=eq.${activeId}` },
        () => qc.invalidateQueries({ queryKey: ["tech-messages", activeId] }),
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [activeId, qc]);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages]);

  // Mark incoming messages as read
  useEffect(() => {
    if (!user || !activeId) return;
    const unread = messages.filter((m) => !m.read_at && m.author_id !== user.id);
    if (unread.length === 0) return;
    (async () => {
      const ids = unread.map((m) => m.id);
      await (supabase.from("technician_messages") as any)
        .update({ read_at: new Date().toISOString() })
        .in("id", ids);
    })();
  }, [messages, user, activeId]);

  const send = useMutation({
    mutationFn: async () => {
      if (!activeId || !user) return;
      let media_url: string | null = null;
      let media_type: string | null = null;
      if (file) {
        const path = `${activeId}/${Date.now()}-${file.name}`;
        const { error: upErr } = await supabase.storage.from("technician-messages").upload(path, file);
        if (upErr) throw new Error(upErr.message);
        const { data: pub } = supabase.storage.from("technician-messages").getPublicUrl(path);
        media_url = pub.publicUrl;
        media_type = file.type.startsWith("video") ? "video" : "image";
      }
      const { error } = await (supabase.from("technician_messages") as any).insert({
        technician_id: activeId, author_id: user.id,
        body: text || null, media_url, media_type,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { setText(""); setFile(null); qc.invalidateQueries({ queryKey: ["tech-messages", activeId] }); },
    onError: (e: any) => toast.error("Falha ao enviar", { description: e?.message }),
  });

  const activeTech = useMemo(() => techs.find((t) => t.id === activeId) ?? null, [techs, activeId]);
  const filtered = techs.filter((t) => t.full_name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      {isStaff && (
        <aside className="hidden w-72 shrink-0 border-r border-border bg-surface md:flex md:flex-col">
          <div className="border-b border-border p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar técnico…" className="h-9 pl-9 bg-surface-muted" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filtered.map((t) => {
              const initials = t.full_name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
              const active = t.id === activeId;
              return (
                <button key={t.id} onClick={() => setActiveId(t.id)} className={`flex w-full items-center gap-3 border-l-2 px-3 py-3 text-left transition ${active ? "border-primary bg-primary/5" : "border-transparent hover:bg-surface-muted/60"}`}>
                  <Avatar className="h-9 w-9">
                    {t.photo_url && <img src={t.photo_url} alt="" className="h-full w-full object-cover" />}
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{t.full_name}</div>
                    <div className="truncate text-xs text-muted-foreground">{t.specialty ?? "Técnico"}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>
      )}

      <section className="flex flex-1 flex-col">
        <header className="flex h-14 items-center gap-3 border-b border-border bg-surface px-5">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          <div>
            <div className="text-sm font-semibold">{activeTech?.full_name ?? "Mural do técnico"}</div>
            <div className="text-[11px] text-muted-foreground">Conversa em tempo real com confirmação de leitura.</div>
          </div>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto bg-surface-muted/40 p-5">
          {isLoading ? (
            <div className="py-20 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : messages.length === 0 ? (
            <div className="py-20 text-center text-sm text-muted-foreground">Nenhuma mensagem nesse mural ainda.</div>
          ) : (
            <ul className="mx-auto max-w-3xl space-y-3">
              {messages.map((m) => {
                const mine = m.author_id === user?.id;
                return (
                  <li key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[78%] rounded-2xl border px-4 py-2.5 shadow-soft ${mine ? "border-primary/20 bg-primary text-primary-foreground" : "border-border bg-surface"}`}>
                      {m.media_url && m.media_type === "image" && (
                        <img src={m.media_url} alt="" className="mb-2 max-h-72 rounded-lg" />
                      )}
                      {m.media_url && m.media_type === "video" && (
                        <video src={m.media_url} controls className="mb-2 max-h-72 rounded-lg" />
                      )}
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
                placeholder="Escreva uma mensagem ou anexe uma evidência…"
                rows={1} className="min-h-[44px] resize-none bg-surface-muted"
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if ((text || file) && !send.isPending) send.mutate(); }}}
              />
            </div>
            <Button onClick={() => send.mutate()} disabled={(!text && !file) || send.isPending}>
              {send.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
