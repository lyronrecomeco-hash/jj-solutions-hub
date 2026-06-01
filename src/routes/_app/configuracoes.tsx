import { createFileRoute } from "@tanstack/react-router";
import { Settings, Building, Bell, Shield, Database, Palette, Plug } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/configuracoes")({ component: SettingsPage });

function SettingsPage() {
  const [company, setCompany] = useState("JJ Informática");
  const [contact, setContact] = useState("contato@jjinformatica.com.br");
  const [slaHours, setSlaHours] = useState("24");
  const [notifNew, setNotifNew] = useState(true);
  const [notifSla, setNotifSla] = useState(true);
  const [twofa, setTwofa] = useState(false);

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-6">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Sistema</p>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Configurações</h1>
        <p className="text-sm text-muted-foreground">Preferências da plataforma, equipe e integrações.</p>
      </header>

      <div className="grid gap-5 lg:grid-cols-3">
        <nav className="lg:col-span-1">
          <ul className="space-y-1">
            {[
              { icon: Building, label: "Organização", id: "org" },
              { icon: Bell, label: "Notificações", id: "notif" },
              { icon: Shield, label: "Segurança", id: "sec" },
              { icon: Database, label: "Operação & SLA", id: "ops" },
              { icon: Palette, label: "Aparência", id: "look" },
              { icon: Plug, label: "Integrações", id: "int" },
            ].map((s) => (
              <li key={s.id}><a href={`#${s.id}`} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-surface-muted hover:text-foreground"><s.icon className="h-4 w-4" />{s.label}</a></li>
            ))}
          </ul>
        </nav>

        <div className="space-y-5 lg:col-span-2">
          <Card id="org" title="Organização" icon={Building}>
            <Field label="Nome da empresa" v={company} on={setCompany} />
            <Field label="E-mail de contato" v={contact} on={setContact} />
          </Card>

          <Card id="notif" title="Notificações" icon={Bell}>
            <Toggle label="Notificar novos chamados" v={notifNew} on={setNotifNew} />
            <Toggle label="Alertar quando SLA estourar" v={notifSla} on={setNotifSla} />
          </Card>

          <Card id="sec" title="Segurança" icon={Shield}>
            <Toggle label="Autenticação em 2 fatores (2FA)" v={twofa} on={setTwofa} />
            <p className="text-xs text-muted-foreground">Recomendado para todos os administradores.</p>
          </Card>

          <Card id="ops" title="Operação & SLA" icon={Database}>
            <Field label="SLA padrão (horas)" v={slaHours} on={setSlaHours} type="number" />
          </Card>

          <Card id="look" title="Aparência" icon={Palette}>
            <p className="text-sm text-muted-foreground">Use o seletor de tema no topo para alternar entre claro e escuro.</p>
          </Card>

          <Card id="int" title="Integrações" icon={Plug}>
            <p className="text-sm text-muted-foreground">Conecte ferramentas externas (WhatsApp Business, e-mail, calendário). Em breve.</p>
          </Card>

          <div className="flex justify-end">
            <Button onClick={() => toast.success("Configurações salvas")}>Salvar alterações</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Card({ id, title, icon: Icon, children }: { id: string; title: string; icon: any; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20 rounded-xl border border-border bg-surface p-5 shadow-soft">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary"><Icon className="h-4 w-4" /></span>
        <h2 className="font-display text-sm font-semibold">{title}</h2>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
function Field({ label, v, on, type = "text" }: { label: string; v: string; on: (v: string) => void; type?: string }) {
  return (<div className="space-y-1.5"><Label className="text-xs">{label}</Label><Input value={v} type={type} onChange={(e) => on(e.target.value)} className="h-10 max-w-md" /></div>);
}
function Toggle({ label, v, on }: { label: string; v: boolean; on: (v: boolean) => void }) {
  return (<div className="flex items-center justify-between rounded-lg border border-border bg-surface-muted/40 px-3 py-2.5"><Label className="text-sm font-medium">{label}</Label><Switch checked={v} onCheckedChange={on} /></div>);
}
