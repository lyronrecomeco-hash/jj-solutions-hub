import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Loader2, User, Ticket as TicketIcon, CheckCircle2, IdCard, Mail, Phone, MapPin, Calendar } from "lucide-react";

import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CrachaModal } from "@/components/cracha-modal";

export const Route = createFileRoute("/_app/meus-dados")({ component: MyDataPage });

const STATUS_LABEL: Record<string, string> = {
  open: "Aberto", in_progress: "Em andamento", waiting_part: "Aguardando peça",
  waiting_client: "Aguardando cliente", scheduled: "Agendado",
  resolved: "Resolvido", partially_resolved: "Parcial", not_resolved: "Não resolvido", cancelled: "Cancelado",
};

const OPEN_STATUSES = ["open", "in_progress", "waiting_part", "waiting_client", "scheduled"];
const CLOSED_STATUSES = ["resolved", "partially_resolved", "not_resolved", "cancelled"];

function MyDataPage() {
  const { user, profile } = useAuth();
  const [crachaOpen, setCrachaOpen] = useState(false);

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["my-tickets", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("tickets")
        .select("id, ticket_number, title, status, priority, created_at, closed_at, contact_name, clients(company)")
        .eq("assigned_to", user!.id)
        .order("created_at", { ascending: false });
      return (data ?? []) as any[];
    },
  });

  // realtime per-user
  useEffect(() => {
    if (!user?.id) return;
    const ch = supabase
      .channel(`my-tickets-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tickets", filter: `assigned_to=eq.${user.id}` }, () => {
        // simple manual refetch via window event — react-query will refetch on focus too
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id]);

  if (!user || !profile) {
    return <div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  const openTickets = tickets.filter((t) => OPEN_STATUSES.includes(t.status));
  const closedTickets = tickets.filter((t) => CLOSED_STATUSES.includes(t.status));

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Meu painel</p>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Meus dados</h1>
          <p className="text-sm text-muted-foreground">Suas informações, chamados e crachá digital.</p>
        </div>
        <Button variant="outline" onClick={() => setCrachaOpen(true)}>
          <IdCard className="h-4 w-4" /> Ver crachá
        </Button>
      </header>

      <div className="mb-5 flex items-center gap-4 rounded-xl border border-border bg-surface p-4 shadow-soft">
        <div className="grid h-14 w-14 place-items-center overflow-hidden rounded-full bg-primary/10 text-primary">
          {profile.avatar_url
            ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
            : <span className="text-lg font-bold">{(profile.full_name || "?").slice(0, 2).toUpperCase()}</span>}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate font-display text-lg font-semibold">{profile.full_name}</div>
          <div className="truncate text-xs text-muted-foreground">{profile.job_title || "Técnico"} · {profile.specialty || "—"}</div>
          {profile.registration_code && <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">#{profile.registration_code}</div>}
        </div>
        <Badge variant="outline" className="border-success/30 bg-success/10 text-success">{profile.status === "online" ? "Online" : "Disponível"}</Badge>
      </div>

      <Tabs defaultValue="cadastro">
        <TabsList>
          <TabsTrigger value="cadastro"><User className="mr-1 h-3.5 w-3.5" /> Cadastro</TabsTrigger>
          <TabsTrigger value="chamados"><TicketIcon className="mr-1 h-3.5 w-3.5" /> Chamados <Badge variant="secondary" className="ml-1.5 h-4 px-1.5 text-[10px]">{openTickets.length}</Badge></TabsTrigger>
          <TabsTrigger value="resolvidos"><CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Resolvidos <Badge variant="secondary" className="ml-1.5 h-4 px-1.5 text-[10px]">{closedTickets.length}</Badge></TabsTrigger>
        </TabsList>

        <TabsContent value="cadastro">
          <div className="grid gap-3 rounded-xl border border-border bg-surface p-5 shadow-soft sm:grid-cols-2">
            <Info icon={User} label="Nome completo" v={profile.full_name} />
            <Info icon={Mail} label="E-mail" v={profile.email} />
            <Info icon={Phone} label="Telefone" v={profile.phone} />
            <Info icon={IdCard} label="CPF" v={(profile as any).cpf} />
            <Info icon={IdCard} label="RG" v={(profile as any).rg} />
            <Info icon={Calendar} label="Data de nascimento" v={(profile as any).birth_date ? new Date((profile as any).birth_date).toLocaleDateString("pt-BR") : null} />
            <Info icon={MapPin} label="Endereço" v={[(profile as any).address, (profile as any).address_number, (profile as any).neighborhood, (profile as any).city, (profile as any).state].filter(Boolean).join(", ")} full />
          </div>
        </TabsContent>

        <TabsContent value="chamados">
          <TicketList items={openTickets} loading={isLoading} empty="Nenhum chamado em aberto no momento." />
        </TabsContent>

        <TabsContent value="resolvidos">
          <TicketList items={closedTickets} loading={isLoading} empty="Você ainda não encerrou chamados." />
        </TabsContent>
      </Tabs>

      <CrachaModal
        tech={{
          id: user.id,
          full_name: profile.full_name,
          job_title: profile.job_title ?? "Técnico",
          specialty: profile.specialty ?? "",
          registration_code: profile.registration_code ?? "",
          company: profile.company ?? "JJ Informática",
          email: profile.email,
          photo_url: (profile as any).photo_url ?? profile.avatar_url,
        } as any}
        open={crachaOpen}
        onOpenChange={setCrachaOpen}
      />
    </div>
  );
}

function TicketList({ items, loading, empty }: { items: any[]; loading: boolean; empty: string }) {
  if (loading) return <div className="py-10 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></div>;
  if (items.length === 0) return <div className="rounded-xl border border-dashed border-border bg-surface-muted/30 py-10 text-center text-sm text-muted-foreground">{empty}</div>;
  return (
    <ul className="divide-y divide-border rounded-xl border border-border bg-surface shadow-soft">
      {items.map((t) => (
        <li key={t.id}>
          <Link to="/chamados/$id" params={{ id: t.id }} className="flex items-center gap-4 px-4 py-3 hover:bg-surface-muted/50">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-xs">
                <span className="font-mono font-medium text-muted-foreground">{t.ticket_number}</span>
                <Badge variant="outline" className="h-5 px-1.5 text-[10px]">{STATUS_LABEL[t.status] ?? t.status}</Badge>
              </div>
              <div className="mt-0.5 truncate text-sm font-medium">{t.title}</div>
              <div className="mt-0.5 truncate text-xs text-muted-foreground">{t.clients?.company ?? t.contact_name ?? "—"}</div>
            </div>
            <div className="text-right text-[11px] text-muted-foreground">
              {new Date(t.created_at).toLocaleDateString("pt-BR")}
              {t.closed_at && <div className="text-success">Encerrado {new Date(t.closed_at).toLocaleDateString("pt-BR")}</div>}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Info({ icon: Icon, label, v, full }: { icon: any; label: string; v: any; full?: boolean }) {
  return (
    <div className={`rounded-lg border border-border bg-surface-muted/30 px-3 py-2 ${full ? "sm:col-span-2" : ""}`}>
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"><Icon className="h-3 w-3" />{label}</div>
      <div className="mt-0.5 text-sm">{v || "—"}</div>
    </div>
  );
}
