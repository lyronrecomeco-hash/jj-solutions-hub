import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, ArrowRight, Check, Loader2, UserPlus, MapPin, Shield } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { createTechnician } from "@/lib/api/technicians.functions";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_app/tecnicos/novo")({ component: NewTechnicianPage });

type Form = {
  first_name: string; last_name: string;
  email: string; password: string; phone: string;
  cpf: string; rg: string; birth_date: string;
  job_title: string; specialty: string; registration_code: string;
  cep: string; address: string; address_number: string; address_complement: string;
  neighborhood: string; city: string; state: string;
  employment_type: "field" | "clt" | "pj" | "internal";
  role: "admin" | "supervisor" | "senior_tech" | "tech";
};

const empty: Form = {
  first_name: "", last_name: "",
  email: "", password: "", phone: "",
  cpf: "", rg: "", birth_date: "",
  job_title: "", specialty: "", registration_code: "",
  cep: "", address: "", address_number: "", address_complement: "",
  neighborhood: "", city: "", state: "",
  employment_type: "field", role: "tech",
};

const steps = [
  { id: 1, title: "Dados Pessoais", icon: UserPlus },
  { id: 2, title: "Endereço", icon: MapPin },
  { id: 3, title: "Acesso & Vínculo", icon: Shield },
];

function NewTechnicianPage() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const create = useServerFn(createTechnician);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<Form>(empty);
  const [saving, setSaving] = useState(false);

  if (!isAdmin) {
    return (
      <div className="px-6 py-10">
        <p className="text-sm text-muted-foreground">Apenas administradores podem criar técnicos.</p>
      </div>
    );
  }

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));
  const full_name = `${form.first_name} ${form.last_name}`.trim();

  async function submit() {
    setSaving(true);
    try {
      await create({
        data: {
          full_name, email: form.email, password: form.password,
          phone: form.phone || null, cpf: form.cpf || null, rg: form.rg || null,
          birth_date: form.birth_date || null,
          job_title: form.job_title || null, specialty: form.specialty || null,
          registration_code: form.registration_code || null,
          cep: form.cep || null, address: form.address || null,
          address_number: form.address_number || null, address_complement: form.address_complement || null,
          neighborhood: form.neighborhood || null, city: form.city || null, state: form.state || null,
          employment_type: form.employment_type, role: form.role,
        },
      });
      toast.success("Técnico criado com sucesso");
      navigate({ to: "/tecnicos" });
    } catch (e: any) {
      toast.error("Falha ao criar", { description: e?.message ?? String(e) });
    } finally {
      setSaving(false);
    }
  }

  const canStep1 = form.first_name && form.last_name && form.email && form.password.length >= 6;

  return (
    <div className="w-full px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
      <button onClick={() => navigate({ to: "/tecnicos" })} className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Voltar para a equipe
      </button>

      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Cadastro</p>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Adicionar técnico</h1>
          <p className="text-sm text-muted-foreground">Preencha o cadastro completo + criação de acesso à plataforma.</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        {/* Sidebar Stepper */}
        <aside className="rounded-xl border border-border bg-surface p-4 shadow-soft">
          <ol className="space-y-1">
            {steps.map((s) => {
              const active = s.id === step;
              const done = s.id < step;
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => (done ? setStep(s.id) : null)}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition ${
                      active ? "bg-primary/10 text-foreground" : done ? "text-foreground hover:bg-accent" : "text-muted-foreground"
                    }`}
                  >
                    <span className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold ${
                      active ? "border-primary bg-primary text-primary-foreground"
                        : done ? "border-success bg-success text-success-foreground"
                        : "border-border bg-surface-muted"
                    }`}>
                      {done ? <Check className="h-3.5 w-3.5" /> : s.id}
                    </span>
                    <div className="flex-1">
                      <div className="text-sm font-medium">{s.title}</div>
                      <div className="text-[11px] text-muted-foreground">Etapa {s.id} de 3</div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ol>

          {full_name && (
            <div className="mt-4 rounded-lg border border-border bg-surface-muted/50 p-3">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Pré-visualização</div>
              <div className="mt-1 text-sm font-semibold">{full_name}</div>
              {form.job_title && <div className="text-xs text-muted-foreground">{form.job_title}</div>}
            </div>
          )}
        </aside>

        {/* Content */}
        <div className="rounded-xl border border-border bg-surface p-6 shadow-soft lg:p-7">
          {step === 1 && (
            <>
              <Section title="Identificação" desc="Dados pessoais e profissionais do técnico." />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Nome *" v={form.first_name} on={(v) => set("first_name", v)} />
                <Field label="Sobrenome *" v={form.last_name} on={(v) => set("last_name", v)} />
                <Field label="Email corporativo *" type="email" v={form.email} on={(v) => set("email", v)} />
                <Field label="Senha temporária *" type="password" v={form.password} on={(v) => set("password", v)} hint="Mínimo de 6 caracteres" />
                <Field label="Telefone" v={form.phone} on={(v) => set("phone", v)} />
                <Field label="Data de nascimento" type="date" v={form.birth_date} on={(v) => set("birth_date", v)} />
                <Field label="CPF" v={form.cpf} on={(v) => set("cpf", v)} />
                <Field label="RG" v={form.rg} on={(v) => set("rg", v)} />
              </div>

              <Section title="Função na equipe" desc="Como o técnico será identificado dentro da operação." className="mt-7" />
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Cargo" v={form.job_title} on={(v) => set("job_title", v)} placeholder="Ex.: Técnico Sênior" />
                <Field label="Especialidade" v={form.specialty} on={(v) => set("specialty", v)} placeholder="Ex.: Redes / Hardware" />
                <Field label="Matrícula" v={form.registration_code} on={(v) => set("registration_code", v)} placeholder="JJ-0000" />
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <Section title="Endereço" desc="Endereço residencial — usado em deslocamentos." />
              <div className="grid gap-4 sm:grid-cols-6">
                <div className="sm:col-span-2"><Field label="CEP" v={form.cep} on={(v) => set("cep", v)} /></div>
                <div className="sm:col-span-4"><Field label="Logradouro" v={form.address} on={(v) => set("address", v)} /></div>
                <div className="sm:col-span-1"><Field label="Número" v={form.address_number} on={(v) => set("address_number", v)} /></div>
                <div className="sm:col-span-2"><Field label="Complemento" v={form.address_complement} on={(v) => set("address_complement", v)} /></div>
                <div className="sm:col-span-3"><Field label="Bairro" v={form.neighborhood} on={(v) => set("neighborhood", v)} /></div>
                <div className="sm:col-span-4"><Field label="Cidade" v={form.city} on={(v) => set("city", v)} /></div>
                <div className="sm:col-span-2"><Field label="UF" v={form.state} on={(v) => set("state", v.toUpperCase().slice(0, 2))} /></div>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <Section title="Vínculo e acesso" desc="Tipo de relacionamento com a JJ e nível de permissão." />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Tipo de vínculo *</Label>
                  <Select value={form.employment_type} onValueChange={(v) => set("employment_type", v as Form["employment_type"])}>
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="field">Field (freelancer / sem vínculo)</SelectItem>
                      <SelectItem value="clt">CLT</SelectItem>
                      <SelectItem value="pj">PJ</SelectItem>
                      <SelectItem value="internal">Interno</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground">Field é o padrão para técnicos avulsos.</p>
                </div>
                <div className="space-y-1.5">
                  <Label>Permissão de acesso *</Label>
                  <Select value={form.role} onValueChange={(v) => set("role", v as Form["role"])}>
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tech">Técnico</SelectItem>
                      <SelectItem value="senior_tech">Técnico Sênior</SelectItem>
                      <SelectItem value="supervisor">Supervisor</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="mt-5 rounded-lg border border-border bg-surface-muted/60 p-4 text-xs text-muted-foreground">
                O técnico receberá acesso imediato com a senha definida e poderá alterá-la no primeiro login.
                O crachá digital é gerado automaticamente após a criação.
              </div>
            </>
          )}

          <div className="mt-7 flex items-center justify-between border-t border-border pt-5">
            <Button variant="ghost" disabled={step === 1} onClick={() => setStep((s) => s - 1)}>
              <ArrowLeft className="h-4 w-4" /> Voltar
            </Button>
            {step < 3 ? (
              <Button onClick={() => setStep((s) => s + 1)} disabled={step === 1 && !canStep1}>
                Continuar <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={submit} disabled={saving || !canStep1}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Criar técnico
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, desc, className }: { title: string; desc: string; className?: string }) {
  return (
    <div className={`mb-5 ${className ?? ""}`}>
      <h2 className="font-display text-base font-semibold tracking-tight">{title}</h2>
      <p className="text-xs text-muted-foreground">{desc}</p>
    </div>
  );
}

function Field({ label, v, on, type = "text", placeholder, hint }: {
  label: string; v: string; on: (v: string) => void; type?: string; placeholder?: string; hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input type={type} value={v} onChange={(e) => on(e.target.value)} className="h-10" placeholder={placeholder} />
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
