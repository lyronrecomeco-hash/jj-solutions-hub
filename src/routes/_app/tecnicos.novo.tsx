import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { createTechnician } from "@/lib/api/technicians.functions";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_app/tecnicos/novo")({ component: NewTechnicianPage });

type Form = {
  full_name: string; email: string; password: string; phone: string;
  cpf: string; rg: string; birth_date: string;
  job_title: string; specialty: string; registration_code: string;
  cep: string; address: string; address_number: string; address_complement: string;
  neighborhood: string; city: string; state: string;
  employment_type: "field" | "clt" | "pj" | "internal";
  role: "admin" | "supervisor" | "senior_tech" | "tech";
};

const empty: Form = {
  full_name: "", email: "", password: "", phone: "",
  cpf: "", rg: "", birth_date: "",
  job_title: "", specialty: "", registration_code: "",
  cep: "", address: "", address_number: "", address_complement: "",
  neighborhood: "", city: "", state: "",
  employment_type: "field", role: "tech",
};

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

  async function submit() {
    setSaving(true);
    try {
      await create({
        data: {
          ...form,
          phone: form.phone || null, cpf: form.cpf || null, rg: form.rg || null,
          birth_date: form.birth_date || null,
          job_title: form.job_title || null, specialty: form.specialty || null,
          registration_code: form.registration_code || null,
          cep: form.cep || null, address: form.address || null,
          address_number: form.address_number || null, address_complement: form.address_complement || null,
          neighborhood: form.neighborhood || null, city: form.city || null, state: form.state || null,
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

  const steps = ["Dados Pessoais", "Endereço", "Acesso & Vínculo"];

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
      <button onClick={() => navigate({ to: "/tecnicos" })} className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Voltar para a equipe
      </button>

      <h1 className="font-display text-2xl font-semibold tracking-tight">Novo Técnico</h1>
      <p className="mb-6 text-sm text-muted-foreground">Cadastro completo + criação de acesso.</p>

      {/* Stepper */}
      <ol className="mb-7 flex items-center gap-2">
        {steps.map((s, i) => {
          const n = i + 1;
          const active = n === step;
          const done = n < step;
          return (
            <li key={s} className="flex flex-1 items-center gap-2">
              <span className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold ${active ? "border-primary bg-primary text-primary-foreground" : done ? "border-success bg-success text-success-foreground" : "border-border bg-surface-muted text-muted-foreground"}`}>
                {done ? <Check className="h-3.5 w-3.5" /> : n}
              </span>
              <span className={`text-xs font-medium ${active ? "text-foreground" : "text-muted-foreground"}`}>{s}</span>
              {i < steps.length - 1 && <span className="ml-2 h-px flex-1 bg-border" />}
            </li>
          );
        })}
      </ol>

      <div className="rounded-xl border border-border bg-surface p-6 shadow-soft">
        {step === 1 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome completo *" v={form.full_name} on={(v) => set("full_name", v)} />
            <Field label="Email *" type="email" v={form.email} on={(v) => set("email", v)} />
            <Field label="Senha temporária *" type="password" v={form.password} on={(v) => set("password", v)} />
            <Field label="Telefone" v={form.phone} on={(v) => set("phone", v)} />
            <Field label="CPF" v={form.cpf} on={(v) => set("cpf", v)} />
            <Field label="RG" v={form.rg} on={(v) => set("rg", v)} />
            <Field label="Data de nascimento" type="date" v={form.birth_date} on={(v) => set("birth_date", v)} />
            <Field label="Cargo" v={form.job_title} on={(v) => set("job_title", v)} />
            <Field label="Especialidade" v={form.specialty} on={(v) => set("specialty", v)} />
            <Field label="Matrícula" v={form.registration_code} on={(v) => set("registration_code", v)} />
          </div>
        )}

        {step === 2 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="CEP" v={form.cep} on={(v) => set("cep", v)} />
            <Field label="Logradouro" v={form.address} on={(v) => set("address", v)} />
            <Field label="Número" v={form.address_number} on={(v) => set("address_number", v)} />
            <Field label="Complemento" v={form.address_complement} on={(v) => set("address_complement", v)} />
            <Field label="Bairro" v={form.neighborhood} on={(v) => set("neighborhood", v)} />
            <Field label="Cidade" v={form.city} on={(v) => set("city", v)} />
            <Field label="UF" v={form.state} on={(v) => set("state", v.toUpperCase().slice(0, 2))} />
          </div>
        )}

        {step === 3 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Tipo de vínculo *</Label>
              <Select value={form.employment_type} onValueChange={(v) => set("employment_type", v as Form["employment_type"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="field">Field (sem vínculo / freelancer)</SelectItem>
                  <SelectItem value="clt">CLT</SelectItem>
                  <SelectItem value="pj">PJ</SelectItem>
                  <SelectItem value="internal">Interno</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">Field é o padrão para técnicos avulsos sem vínculo formal.</p>
            </div>
            <div className="space-y-1.5">
              <Label>Permissão de acesso *</Label>
              <Select value={form.role} onValueChange={(v) => set("role", v as Form["role"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="tech">Técnico</SelectItem>
                  <SelectItem value="senior_tech">Técnico Sênior</SelectItem>
                  <SelectItem value="supervisor">Supervisor</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2 rounded-lg border border-border bg-surface-muted p-4 text-xs text-muted-foreground">
              O técnico receberá acesso imediato com a senha definida e poderá alterá-la no primeiro login.
            </div>
          </div>
        )}

        <div className="mt-6 flex items-center justify-between border-t border-border pt-5">
          <Button variant="ghost" disabled={step === 1} onClick={() => setStep((s) => s - 1)}>
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Button>
          {step < 3 ? (
            <Button onClick={() => setStep((s) => s + 1)}>
              Continuar <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={submit} disabled={saving || !form.full_name || !form.email || !form.password}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Criar técnico
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, v, on, type = "text" }: { label: string; v: string; on: (v: string) => void; type?: string }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input type={type} value={v} onChange={(e) => on(e.target.value)} className="h-10" />
    </div>
  );
}

// Silence unused import warning if Textarea not used yet
void Textarea;
