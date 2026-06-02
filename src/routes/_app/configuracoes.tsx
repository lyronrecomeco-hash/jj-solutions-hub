import { createFileRoute } from "@tanstack/react-router";
import { Building, Bell, Database, Plug, Sparkles, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_app/configuracoes")({ component: SettingsPage });

const NOTIF_TYPES = [
  { type: "ticket", label: "Chamados", hint: "Novos chamados e atribuições." },
  { type: "message", label: "Mensagens", hint: "Mensagens no mural do técnico." },
  { type: "signup", label: "Novos cadastros", hint: "Solicitações de novos técnicos." },
  { type: "sla", label: "SLA estourado", hint: "Alertas de prazo excedido." },
  { type: "sound", label: "Som de notificação", hint: "Toca um som curto ao receber." },
] as const;

function SettingsPage() {
  const { user, isAdmin } = useAuth();
  const [company, setCompany] = useState("JJ Informática");
  const [contact, setContact] = useState("contato@jjinformatica.com.br");
  const [slaHours, setSlaHours] = useState("24");
  const [prefs, setPrefs] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data: settings } = await supabase
          .from("app_settings").select("key, value").in("key", ["organization", "sla"]);
        const org = settings?.find((s) => s.key === "organization")?.value as any;
        const sla = settings?.find((s) => s.key === "sla")?.value as any;
        if (org?.name) setCompany(org.name);
        if (org?.contact_email) setContact(org.contact_email);
        if (sla?.default_hours) setSlaHours(String(sla.default_hours));

        if (user?.id) {
          const { data: np } = await supabase
            .from("notification_preferences").select("type, enabled").eq("user_id", user.id);
          const map: Record<string, boolean> = {};
          NOTIF_TYPES.forEach((t) => (map[t.type] = true));
          (np ?? []).forEach((row: any) => (map[row.type] = row.enabled));
          setPrefs(map);
        }
      } finally { setLoading(false); }
    })();
  }, [user?.id]);

  async function save() {
    if (!user?.id) return;
    setSaving(true);
    try {
      if (isAdmin) {
        await supabase.from("app_settings").upsert([
          { key: "organization", value: { name: company, contact_email: contact }, updated_by: user.id },
          { key: "sla", value: { default_hours: Number(slaHours) || 24 }, updated_by: user.id },
        ], { onConflict: "key" });
      }
      const rows = NOTIF_TYPES.map((t) => ({
        user_id: user.id, type: t.type, enabled: prefs[t.type] ?? true,
      }));
      await supabase.from("notification_preferences").upsert(rows, { onConflict: "user_id,type" });
      toast.success("Configurações salvas");
    } catch (e: any) {
      toast.error("Falha ao salvar", { description: e?.message });
    } finally { setSaving(false); }
  }

  if (loading) {
    return <div className="grid place-items-center py-20"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-6">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Sistema</p>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Configurações</h1>
        <p className="text-sm text-muted-foreground">Preferências da plataforma, equipe e integrações.</p>
      </header>

      <Tabs defaultValue="org" className="w-full">
        <TabsList className="mb-5 inline-flex h-auto w-full flex-wrap justify-start gap-1 rounded-xl border border-border bg-surface p-1">
          <Tab v="org" icon={Building}>Organização</Tab>
          <Tab v="notif" icon={Bell}>Notificações</Tab>
          <Tab v="ops" icon={Database}>Operação & SLA</Tab>
          <Tab v="int" icon={Plug}>Integrações</Tab>
        </TabsList>

        <TabsContent value="org">
          <Card title="Organização">
            <Row label="Nome da empresa" hint="Aparece nos relatórios e e-mails.">
              <Input value={company} onChange={(e) => setCompany(e.target.value)} disabled={!isAdmin} className="max-w-md" />
            </Row>
            <Row label="E-mail de contato" hint="Resposta padrão para comunicações externas.">
              <Input value={contact} onChange={(e) => setContact(e.target.value)} disabled={!isAdmin} className="max-w-md" />
            </Row>
          </Card>
        </TabsContent>

        <TabsContent value="notif">
          <Card title="Notificações">
            {NOTIF_TYPES.map((t) => (
              <Row key={t.type} label={t.label} hint={t.hint}>
                <Switch
                  checked={prefs[t.type] ?? true}
                  onCheckedChange={(v) => setPrefs((p) => ({ ...p, [t.type]: v }))}
                />
              </Row>
            ))}
          </Card>
        </TabsContent>

        <TabsContent value="ops">
          <Card title="Operação & SLA">
            <Row label="SLA padrão (horas)" hint="Prazo padrão para novos chamados.">
              <Input value={slaHours} type="number" disabled={!isAdmin}
                onChange={(e) => setSlaHours(e.target.value)} className="max-w-[160px]" />
            </Row>
          </Card>
        </TabsContent>

        <TabsContent value="int">
          <section className="rounded-xl border border-border bg-surface p-10 shadow-soft">
            <div className="mx-auto flex max-w-md flex-col items-center text-center">
              <span className="grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-primary">
                <Sparkles className="h-6 w-6" />
              </span>
              <h2 className="mt-4 font-display text-lg font-semibold">EM BREVE</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Novas integrações estão a caminho. Em breve você poderá conectar serviços externos diretamente por aqui.
              </p>
            </div>
          </section>
        </TabsContent>
      </Tabs>

      <div className="mt-6 flex justify-end">
        <Button onClick={save} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Salvar alterações
        </Button>
      </div>
    </div>
  );
}

function Tab({ v, icon: Icon, children }: { v: string; icon: any; children: React.ReactNode }) {
  return (
    <TabsTrigger value={v} className="gap-2 rounded-lg px-3 py-2 text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm">
      <Icon className="h-4 w-4" />
      {children}
    </TabsTrigger>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-surface p-5 shadow-soft">
      <h2 className="mb-4 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
      <div className="divide-y divide-border">{children}</div>
    </section>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-3 py-3.5 sm:grid-cols-2 sm:items-center sm:gap-6">
      <div>
        <Label className="text-sm font-medium">{label}</Label>
        {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      </div>
      <div className="sm:justify-self-end">{children}</div>
    </div>
  );
}
