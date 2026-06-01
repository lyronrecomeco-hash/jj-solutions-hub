import { useState } from "react";
import { CheckCircle2, Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

type Props = { open: boolean; onOpenChange: (o: boolean) => void };

export function SignupFormDialog({ open, onOpenChange }: Props) {
  const [form, setForm] = useState({
    first_name: "", last_name: "", email: "", password: "", phone: "", birth_date: "",
    address: "", city: "", state: "", specialty: "",
    employment_type: "field" as "field" | "clt" | "pj" | "internal",
  });
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) { setForm((f) => ({ ...f, [k]: v })); }
  function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    setPhoto(f); setPreview(URL.createObjectURL(f));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const full_name = `${form.first_name} ${form.last_name}`.trim();
      const { error } = await supabase.from("technician_signups").insert({
        full_name, email: form.email, phone: form.phone || null,
        birth_date: form.birth_date || null, address: form.address || null,
        city: form.city || null, state: form.state || null,
        specialty: form.specialty || null, desired_employment_type: form.employment_type,
      });
      if (error) throw new Error(error.message);
      setDone(true);
    } catch (err: any) {
      toast.error("Falha ao enviar", { description: err?.message });
    } finally { setSubmitting(false); }
  }

  function close() {
    onOpenChange(false);
    setTimeout(() => {
      setDone(false); setPhoto(null); setPreview(null);
      setForm({ first_name: "", last_name: "", email: "", password: "", phone: "", birth_date: "", address: "", city: "", state: "", specialty: "", employment_type: "field" });
    }, 250);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => (!o ? close() : onOpenChange(true))}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        {done ? (
          <div className="py-6 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-success/15 text-success">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <h2 className="mt-4 font-display text-xl font-semibold">Cadastro enviado com sucesso</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
              Seu cadastro está <strong>pendente de aprovação</strong>. Em breve nossa equipe entrará em contato pelo e-mail informado para confirmar seu acesso.
            </p>
            <Button onClick={close} className="mt-6">Voltar para o login</Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Solicitar cadastro de técnico</DialogTitle>
              <DialogDescription>Preencha seus dados — após análise você receberá as credenciais por e-mail.</DialogDescription>
            </DialogHeader>

            <form onSubmit={submit} className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="relative h-16 w-16 overflow-hidden rounded-full border border-border bg-surface-muted">
                  {preview
                    ? <img src={preview} alt="" className="h-full w-full object-cover" />
                    : <div className="grid h-full w-full place-items-center text-lg font-bold text-muted-foreground">{(form.first_name[0] || "?").toUpperCase()}</div>}
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

              <div className="grid gap-3 sm:grid-cols-2">
                <F label="Nome *" v={form.first_name} on={(v) => set("first_name", v)} required />
                <F label="Sobrenome *" v={form.last_name} on={(v) => set("last_name", v)} required />
                <F label="E-mail *" type="email" v={form.email} on={(v) => set("email", v)} required />
                <F label="Senha desejada *" type="password" v={form.password} on={(v) => set("password", v)} required />
                <F label="Telefone" v={form.phone} on={(v) => set("phone", v)} />
                <F label="Data de nascimento" type="date" v={form.birth_date} on={(v) => set("birth_date", v)} />
                <div className="sm:col-span-2"><F label="Endereço" v={form.address} on={(v) => set("address", v)} /></div>
                <F label="Cidade" v={form.city} on={(v) => set("city", v)} />
                <F label="UF" v={form.state} on={(v) => set("state", v.toUpperCase().slice(0, 2))} />
                <F label="Especialidade" v={form.specialty} on={(v) => set("specialty", v)} placeholder="Ex.: Redes, Hardware" />
                <div className="space-y-1.5">
                  <Label className="text-xs">Vínculo desejado</Label>
                  <Select value={form.employment_type} onValueChange={(v) => set("employment_type", v as typeof form.employment_type)}>
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="field">Field (freelancer)</SelectItem>
                      <SelectItem value="clt">CLT</SelectItem>
                      <SelectItem value="pj">PJ</SelectItem>
                      <SelectItem value="internal">Interno</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-border pt-4">
                <Button type="button" variant="outline" onClick={close}>Cancelar</Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enviar solicitação"}
                </Button>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function F({ label, v, on, type = "text", placeholder, required }: { label: string; v: string; on: (v: string) => void; type?: string; placeholder?: string; required?: boolean }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input type={type} value={v} onChange={(e) => on(e.target.value)} placeholder={placeholder} required={required} className="h-10" />
    </div>
  );
}
