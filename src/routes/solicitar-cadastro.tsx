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
    first_name: "", last_name: "", email: "", password: "", phone: "", birth_date: "",
    cep: "", address: "", address_number: "", neighborhood: "", city: "", state: "",
    specialty: "",
  });
  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) { setForm((f) => ({ ...f, [k]: v })); }

  function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    setPhoto(f); setPreview(URL.createObjectURL(f));
  }

  async function submit() {
    if (!form.first_name || !form.last_name || !form.email || !form.password) {
      toast.error("Preencha os campos obrigatórios"); return;
    }
    setSubmitting(true);
    try {
      const full_name = `${form.first_name} ${form.last_name}`.trim();
      const { error } = await supabase.from("technician_signups").insert({
        full_name, email: form.email, phone: form.phone || null,
        birth_date: form.birth_date || null,
        cep: form.cep || null, address: form.address || null,
        address_number: form.address_number || null, neighborhood: form.neighborhood || null,
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

  return (
    <div className="min-h-screen bg-background">
      {/* topo */}
      <header className="flex items-center justify-between border-b border-border bg-surface px-5 py-3.5">
        <Link to="/login" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Voltar ao login
        </Link>
        <JJLogo />
      </header>

      <main className="mx-auto max-w-2xl px-4 py-10 sm:py-14">
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
            <div className="rounded-2xl border border-border bg-surface p-7 shadow-soft sm:p-9">
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
                    <F label="E-mail *" type="email" v={form.email} on={(v) => set("email", v)} required />
                    <F label="Senha desejada *" type="password" v={form.password} on={(v) => set("password", v)} required />
                    <F label="Telefone" v={form.phone} on={(v) => set("phone", v)} />
                    <F label="Data de nascimento" type="date" v={form.birth_date} on={(v) => set("birth_date", v)} />
                  </div>
                )}

                {step === 2 && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <F label="CEP" v={form.cep} on={(v) => set("cep", v)} />
                    <F label="Cidade" v={form.city} on={(v) => set("city", v)} />
                    <div className="sm:col-span-2"><F label="Endereço" v={form.address} on={(v) => set("address", v)} /></div>
                    <F label="Número" v={form.address_number} on={(v) => set("address_number", v)} />
                    <F label="Bairro" v={form.neighborhood} on={(v) => set("neighborhood", v)} />
                    <F label="UF" v={form.state} on={(v) => set("state", v.toUpperCase().slice(0, 2))} />
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
                  <Button onClick={() => setStep((s) => Math.min(3, (s + 1)) as Step)}>
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

function StepBar({ step }: { step: Step }) {
  const items = [
    { n: 1, label: "Dados pessoais" },
    { n: 2, label: "Endereço" },
    { n: 3, label: "Perfil profissional" },
  ];
  return (
    <ol className="flex items-center gap-3">
      {items.map((it, i) => {
        const active = step === it.n;
        const done = step > it.n;
        return (
          <li key={it.n} className="flex flex-1 items-center gap-3">
            <div className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[12px] font-semibold ${done ? "bg-success text-success-foreground" : active ? "bg-primary text-primary-foreground" : "bg-surface-muted text-muted-foreground border border-border"}`}>
              {done ? <CheckCircle2 className="h-4 w-4" /> : it.n}
            </div>
            <span className={`text-xs font-medium ${active || done ? "text-foreground" : "text-muted-foreground"}`}>{it.label}</span>
            {i < items.length - 1 && <div className={`mx-2 h-px flex-1 ${done ? "bg-success" : "bg-border"}`} />}
          </li>
        );
      })}
    </ol>
  );
}

function F({ label, v, on, type = "text", placeholder, required }: { label: string; v: string; on: (v: string) => void; type?: string; placeholder?: string; required?: boolean }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input type={type} value={v} onChange={(e) => on(e.target.value)} placeholder={placeholder} required={required} className="h-10 border-border" />
    </div>
  );
}
