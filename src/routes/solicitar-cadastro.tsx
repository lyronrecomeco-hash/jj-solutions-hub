import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle2, Loader2, Upload, X, ChevronRight } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { JJLogo } from "@/components/jj-logo";

export const Route = createFileRoute("/solicitar-cadastro")({ component: SignupPage });

type Step = 1 | 2 | 3;

function SignupPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(1);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [form, setForm] = useState({
    first_name: "", last_name: "", cpf: "", rg: "", email: "", password: "", phone: "", birth_date: "",
    cep: "", address: "", address_number: "", complement: "", neighborhood: "", city: "", state: "",
    specialty: "",
  });
  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) { setForm((f) => ({ ...f, [k]: v })); }

  function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    setPhoto(f); setPreview(URL.createObjectURL(f));
  }

  async function submit() {
    if (!validateStep(1) || !validateStep(2)) return;
    setSubmitting(true);
    try {
      const full_name = `${form.first_name} ${form.last_name}`.trim();
      const { error } = await (supabase.from("technician_signups") as any).insert({
        full_name, cpf: onlyDigits(form.cpf), rg: onlyDigits(form.rg), email: form.email.trim().toLowerCase(), phone: form.phone || null,
        birth_date: form.birth_date || null,
        cep: form.cep || null, address: form.address || null,
        address_number: form.address_number || null, complement: form.complement || null, neighborhood: form.neighborhood || null,
        city: form.city || null, state: form.state || null,
        specialty: form.specialty || null,
        desired_employment_type: "field", // FIXO conforme regra
      });
      if (error) throw new Error(error.message);
      setDone(true);
    } catch (err: any) {
      toast.error("Falha ao enviar", { description: err?.message });
    } finally { setSubmitting(false); }
  }

  function validateStep(target: Step) {
    if (target === 1) {
      if (!form.first_name.trim() || !form.last_name.trim() || !form.email.trim() || !form.password || !form.phone.trim() || !form.birth_date) {
        toast.error("Preencha todos os dados pessoais obrigatórios"); return false;
      }
      if (!isValidCpf(form.cpf)) { toast.error("CPF inválido"); return false; }
      if (onlyDigits(form.rg).length < 5) { toast.error("RG inválido"); return false; }
      if (!isAdult(form.birth_date)) { toast.error("Cadastro permitido apenas para maiores de 18 anos"); return false; }
      if (!/^\S+@\S+\.\S+$/.test(form.email)) { toast.error("E-mail inválido"); return false; }
      if (form.password.length < 8) { toast.error("A senha deve ter pelo menos 8 caracteres"); return false; }
    }
    if (target === 2) {
      if (onlyDigits(form.cep).length !== 8 || !form.address.trim() || !form.address_number.trim() || !form.neighborhood.trim() || !form.city.trim() || form.state.trim().length !== 2) {
        toast.error("Preencha o endereço obrigatório corretamente"); return false;
      }
    }
    return true;
  }

  function nextStep() {
    if (!validateStep(step)) return;
    setStep((s) => Math.min(3, (s + 1)) as Step);
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      {/* topo */}
      <header className="flex items-center justify-between gap-3 border-b border-border bg-surface px-4 py-3 sm:px-5 sm:py-3.5">
        <Link to="/login" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Voltar ao login
        </Link>
        <JJLogo />
      </header>

      <main className="mx-auto w-full max-w-2xl px-3 py-6 sm:px-4 sm:py-14">
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
          {done ? (
            <div className="rounded-2xl border border-border bg-surface p-10 text-center shadow-soft">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-success/15 text-success">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h1 className="mt-5 font-display text-2xl font-semibold tracking-tight">Cadastro recebido</h1>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                Sua solicitação está <strong>em análise</strong>. Em breve nossa equipe entrará em contato
                pelo e-mail informado para confirmar seu acesso à plataforma.
              </p>
              <Button onClick={() => navigate({ to: "/login" })} className="mt-7">Voltar ao login</Button>
            </div>
          ) : (
            <div className="w-full overflow-hidden rounded-2xl border border-border bg-surface p-5 shadow-soft sm:p-9">
              <div className="mb-6">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Solicitação</p>
                <h1 className="font-display text-2xl font-semibold tracking-tight">Cadastro de técnico</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Preencha seus dados. Após análise você receberá as credenciais por e-mail.
                </p>
              </div>

              <StepBar step={step} />

              <motion.div key={step} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }} className="mt-7">
                {step === 1 && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <F label="Nome *" v={form.first_name} on={(v) => set("first_name", v)} required />
                    <F label="Sobrenome *" v={form.last_name} on={(v) => set("last_name", v)} required />
                    <F label="CPF *" v={form.cpf} on={(v) => set("cpf", formatCpf(v))} inputMode="numeric" placeholder="000.000.000-00" required />
                    <F label="RG *" v={form.rg} on={(v) => set("rg", onlyDigits(v).slice(0, 14))} inputMode="numeric" required />
                    <F label="E-mail *" type="email" v={form.email} on={(v) => set("email", v)} required />
                    <F label="Senha desejada *" type="password" v={form.password} on={(v) => set("password", v)} required />
                    <F label="Telefone / WhatsApp *" v={form.phone} on={(v) => set("phone", formatPhone(v))} inputMode="numeric" required />
                    <F label="Data de nascimento *" type="date" v={form.birth_date} on={(v) => set("birth_date", v)} required />
                  </div>
                )}

                {step === 2 && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <F label="CEP *" v={form.cep} on={(v) => set("cep", formatCep(v))} inputMode="numeric" required />
                    <F label="Cidade *" v={form.city} on={(v) => set("city", v)} required />
                    <div className="sm:col-span-2"><F label="Endereço *" v={form.address} on={(v) => set("address", v)} required /></div>
                    <F label="Número *" v={form.address_number} on={(v) => set("address_number", v)} required />
                    <F label="Bairro *" v={form.neighborhood} on={(v) => set("neighborhood", v)} required />
                    <F label="Complemento" v={form.complement} on={(v) => set("complement", v)} />
                    <F label="UF *" v={form.state} on={(v) => set("state", v.toUpperCase().slice(0, 2))} required />
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-5">
                    <div className="flex items-center gap-4">
                      <div className="relative h-20 w-20 overflow-hidden rounded-full border border-border bg-surface-muted">
                        {preview
                          ? <img src={preview} alt="" className="h-full w-full object-cover" />
                          : <div className="grid h-full w-full place-items-center text-xl font-bold text-muted-foreground">{(form.first_name[0] || "?").toUpperCase()}</div>}
                        {preview && (
                          <button type="button" onClick={() => { setPhoto(null); setPreview(null); }} className="absolute right-0 top-0 grid h-5 w-5 place-items-center rounded-full bg-destructive text-destructive-foreground">
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                      <Label className="cursor-pointer">
                        <span className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-xs font-medium hover:bg-accent">
                          <Upload className="h-3.5 w-3.5" /> {photo ? "Trocar foto" : "Enviar foto"}
                        </span>
                        <input type="file" accept="image/*" className="hidden" onChange={onPhoto} />
                      </Label>
                    </div>
                    <F label="Especialidade" v={form.specialty} on={(v) => set("specialty", v)} placeholder="Ex.: Redes, Hardware, Suporte" />
                    <div className="rounded-lg border border-border bg-surface-muted/50 px-4 py-3 text-xs text-muted-foreground">
                      Modalidade do cadastro: <strong className="text-foreground">Field (freelancer)</strong>. Após aprovação, um administrador pode atribuir vínculos adicionais.
                    </div>
                  </div>
                )}
              </motion.div>

              <div className="mt-8 flex items-center justify-between gap-3 border-t border-border pt-5">
                <Button variant="outline" disabled={step === 1} onClick={() => setStep((s) => Math.max(1, (s - 1)) as Step)}>
                  Voltar
                </Button>
                {step < 3 ? (
                  <Button onClick={nextStep}>
                    Continuar <ChevronRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button onClick={submit} disabled={submitting}>
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enviar solicitação"}
                  </Button>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function formatCpf(value: string) {
  const d = onlyDigits(value).slice(0, 11);
  return d.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

function formatCep(value: string) {
  const d = onlyDigits(value).slice(0, 8);
  return d.replace(/(\d{5})(\d)/, "$1-$2");
}

function formatPhone(value: string) {
  const d = onlyDigits(value).slice(0, 11);
  if (d.length <= 10) return d.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2");
  return d.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
}

function isAdult(date: string) {
  const birth = new Date(`${date}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return false;
  const limit = new Date();
  limit.setFullYear(limit.getFullYear() - 18);
  return birth <= limit;
}

function isValidCpf(value: string) {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
  const calc = (base: number) => {
    const sum = cpf.slice(0, base - 1).split("").reduce((acc, n, i) => acc + Number(n) * (base - i), 0);
    const mod = (sum * 10) % 11;
    return mod === 10 ? 0 : mod;
  };
  return calc(10) === Number(cpf[9]) && calc(11) === Number(cpf[10]);
}

function StepBar({ step }: { step: Step }) {
  const items = [
    { n: 1, label: "Dados pessoais" },
    { n: 2, label: "Endereço" },
    { n: 3, label: "Perfil profissional" },
  ];
  return (
    <ol className="grid grid-cols-3 gap-2 sm:flex sm:items-center sm:gap-3">
      {items.map((it, i) => {
        const active = step === it.n;
        const done = step > it.n;
        return (
          <li key={it.n} className="relative flex min-w-0 flex-col items-center gap-1 rounded-lg border border-border bg-surface-muted/40 px-1.5 py-2 text-center sm:flex-1 sm:flex-row sm:gap-3 sm:border-0 sm:bg-transparent sm:p-0 sm:text-left">
            <div className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[12px] font-semibold ${done ? "bg-success text-success-foreground" : active ? "bg-primary text-primary-foreground" : "bg-surface-muted text-muted-foreground border border-border"}`}>
              {done ? <CheckCircle2 className="h-4 w-4" /> : it.n}
            </div>
            <span className={`text-[10px] font-medium leading-tight sm:text-xs ${active || done ? "text-foreground" : "text-muted-foreground"}`}>{it.label}</span>
            {i < items.length - 1 && <div className={`mx-2 hidden h-px flex-1 sm:block ${done ? "bg-success" : "bg-border"}`} />}
          </li>
        );
      })}
    </ol>
  );
}

function F({ label, v, on, type = "text", placeholder, required, inputMode }: { label: string; v: string; on: (v: string) => void; type?: string; placeholder?: string; required?: boolean; inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"] }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input type={type} value={v} onChange={(e) => on(e.target.value)} placeholder={placeholder} required={required} inputMode={inputMode} className="h-11 border-border text-sm placeholder:text-muted-foreground/45" />
    </div>
  );
}
