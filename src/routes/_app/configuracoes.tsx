import { createFileRoute } from "@tanstack/react-router";
import { Building, Bell, Shield, Database, Palette, Plug } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/configuracoes")({ component: SettingsPage });

function SettingsPage() {
  const [company, setCompany] = useState("JJ Informática");
  const [contact, setContact] = useState("contato@jjinformatica.com.br");
  const [slaHours, setSlaHours] = useState("24");
  const [notifNew, setNotifNew] = useState(true);
  const [notifSla, setNotifSla] = useState(true);
  const [notifSound, setNotifSound] = useState(true);
  const [twofa, setTwofa] = useState(false);

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
          <Tab v="sec" icon={Shield}>Segurança</Tab>
          <Tab v="ops" icon={Database}>Operação & SLA</Tab>
          <Tab v="look" icon={Palette}>Aparência</Tab>
          <Tab v="int" icon={Plug}>Integrações</Tab>
        </TabsList>

        <TabsContent value="org">
          <Card title="Organização">
            <Row label="Nome da empresa" hint="Aparece nos relatórios e e-mails.">
              <Input value={company} onChange={(e) => setCompany(e.target.value)} className="max-w-md" />
            </Row>
            <Row label="E-mail de contato" hint="Resposta padrão para comunicações externas.">
              <Input value={contact} onChange={(e) => setContact(e.target.value)} className="max-w-md" />
            </Row>
          </Card>
        </TabsContent>

        <TabsContent value="notif">
          <Card title="Notificações">
            <Row label="Novos chamados" hint="Notificar quando um chamado for criado.">
              <Switch checked={notifNew} onCheckedChange={setNotifNew} />
            </Row>
            <Row label="SLA estourado" hint="Alertar gestores quando o SLA passar do prazo.">
              <Switch checked={notifSla} onCheckedChange={setNotifSla} />
            </Row>
            <Row label="Som de notificação" hint="Tocar um som curto quando chegar uma notificação.">
              <Switch checked={notifSound} onCheckedChange={setNotifSound} />
            </Row>
          </Card>
        </TabsContent>

        <TabsContent value="sec">
          <Card title="Segurança">
            <Row label="Autenticação em 2 fatores (2FA)" hint="Recomendado para todos os administradores.">
              <Switch checked={twofa} onCheckedChange={setTwofa} />
            </Row>
          </Card>
        </TabsContent>

        <TabsContent value="ops">
          <Card title="Operação & SLA">
            <Row label="SLA padrão (horas)" hint="Prazo padrão para novos chamados.">
              <Input value={slaHours} type="number" onChange={(e) => setSlaHours(e.target.value)} className="max-w-[160px]" />
            </Row>
          </Card>
        </TabsContent>

        <TabsContent value="look">
          <Card title="Aparência">
            <Row label="Tema" hint="Use o seletor no topo para alternar entre claro e escuro.">
              <span className="text-sm text-muted-foreground">Disponível no header</span>
            </Row>
          </Card>
        </TabsContent>

        <TabsContent value="int">
          <Card title="Integrações">
            <Row label="WhatsApp Business" hint="Receba mensagens de clientes direto na plataforma.">
              <Button variant="outline" size="sm" disabled>Em breve</Button>
            </Row>
            <Row label="Calendário Google" hint="Sincronize visitas técnicas.">
              <Button variant="outline" size="sm" disabled>Em breve</Button>
            </Row>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="mt-6 flex justify-end">
        <Button onClick={() => toast.success("Configurações salvas")}>Salvar alterações</Button>
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
