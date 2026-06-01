import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Upload, UserPlus, X } from "lucide-react";
import { toast } from "sonner";

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { createTechnician } from "@/lib/api/technicians.functions";
import { supabase } from "@/integrations/supabase/client";

type Props = { open: boolean; onOpenChange: (o: boolean) => void };

type Form = {
  first_name: string; last_name: string; email: string; password: string; phone: string;
  cpf: string; birth_date: string; job_title: string; specialty: string; registration_code: string;
  cep: string; address: string; address_number: string; neighborhood: string; city: string; state: string;
  employment_type: "field" | "clt" | "pj" | "internal";
  role: "admin" | "supervisor" | "senior_tech" | "tech";
};

const empty: Form = {
  first_name: "", last_name: "", email: "", password: "", phone: "",
  cpf: "", birth_date: "", job_title: "", specialty: "", registration_code: "",
  cep: "", address: "", address_number: "", neighborhood: "", city: "", state: "",
  employment_type: "field", role: "tech",
};

export function TechnicianFormSheet({ open, onOpenChange }: Props) {
  const create = useServerFn(createTechnician);
  const qc = useQueryClient();
  const [form, setForm] = useState<Form>(empty);
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));
  const full_name = `${form.first_name} ${form.last_name}`.trim();

  function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setPhoto(f);
    setPreview(URL.createObjectURL(f));
  }

  const mut = useMutation({
    mutationFn: async () => {
      const { user_id } = await create({
        data: {
          full_name, email: form.email, password: form.password,
          phone: form.phone || null, cpf: form.cpf || null,
          birth_date: form.birth_date || null, job_title: form.job_title || null,
          specialty: form.specialty || null, registration_code: form.registration_code || null,
          cep: form.cep || null, address: form.address || null,
          address_number: form.address_number || null,
          neighborhood: form.neighborhood || null, city: form.city || null, state: form.state || null,
          employment_type: form.employment_type, role: form.role,
        },
      });
      if (photo && user_id) {
        const path = `${user_id}/${Date.now()}-${photo.name}`;
        const { error: upErr } = await supabase.storage.from("technician-photos").upload(path, photo, { upsert: true });
        if (!upErr) {
          const { data: pub } = supabase.storage.from("technician-photos").getPublicUrl(path);
          await supabase.from("profiles").update({ photo_url: pub.publicUrl }).eq("id", user_id);
        }
      }
    },
    onSuccess: () => {
      toast.success("Técnico criado com sucesso");
      qc.invalidateQueries({ queryKey: ["technicians"] });
      setForm(empty); setPhoto(null); setPreview(null);
      onOpenChange(false);
    },
    onError: (e: any) => toast.error("Falha ao criar técnico", { description: e?.message }),
  });

  const canSubmit = form.first_name && form.last_name && form.email && form.password.length >= 6 && !mut.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
              <UserPlus className="h-4 w-4" />
            </span>
            <div>
              <SheetTitle className="font-display text-lg">Adicionar técnico</SheetTitle>
              <SheetDescription className="text-xs">
                Cadastro completo + criação de acesso à plataforma
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Photo */}
          <div className="flex items-center gap-4">
            <div className="relative h-20 w-20 overflow-hidden rounded-full border border-border bg-surface-muted">
              {preview ? (
                <img src={preview} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full w-full place-items-center text-2xl font-bold text-muted-foreground">
                  {(form.first_name[0] || "?").toUpperCase()}
                </div>
              )}
              {preview && (
                <button
                  type="button"
                  onClick={() => { setPhoto(null); setPreview(null); }}
                  className="absolute right-0 top-0 grid h-5 w-5 place-items-center rounded-full bg-destructive text-destructive-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
            <div>
              <Label className="cursor-pointer">
                <span className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-xs font-medium hover:bg-accent">
                  <Upload className="h-3.5 w-3.5" /> Enviar foto
                </span>
                <input type="file" accept="image/*" className="hidden" onChange={onPhoto} />
              </Label>
              <p className="mt-1.5 text-[11px] text-muted-foreground">JPG ou PNG, até 5 MB.</p>
            </div>
          </div>

          <Separator />

          <Section title="Identificação">
            <Grid>
              <F label="Nome *" v={form.first_name} on={(v) => set("first_name", v)} />
              <F label="Sobrenome *" v={form.last_name} on={(v) => set("last_name", v)} />
              <F label="Email corporativo *" type="email" v={form.email} on={(v) => set("email", v)} />
              <F label="Senha temporária *" type="password" v={form.password} on={(v) => set("password", v)} hint="Mínimo 6 caracteres" />
              <F label="Telefone" v={form.phone} on={(v) => set("phone", v)} />
              <F label="Data de nascimento" type="date" v={form.birth_date} on={(v) => set("birth_date", v)} />
              <F label="CPF" v={form.cpf} on={(v) => set("cpf", v)} />
              <F label="Matrícula" v={form.registration_code} on={(v) => set("registration_code", v)} placeholder="JJ-0000" />
            </Grid>
          </Section>

          <Section title="Função na equipe">
            <Grid>
              <F label="Cargo" v={form.job_title} on={(v) => set("job_title", v)} placeholder="Técnico Sênior" />
              <F label="Especialidade" v={form.specialty} on={(v) => set("specialty", v)} placeholder="Redes / Hardware" />
            </Grid>
          </Section>

          <Section title="Endereço">
            <Grid>
              <F label="CEP" v={form.cep} on={(v) => set("cep", v)} />
              <F label="Logradouro" v={form.address} on={(v) => set("address", v)} />
              <F label="Número" v={form.address_number} on={(v) => set("address_number", v)} />
              <F label="Bairro" v={form.neighborhood} on={(v) => set("neighborhood", v)} />
              <F label="Cidade" v={form.city} on={(v) => set("city", v)} />
              <F label="UF" v={form.state} on={(v) => set("state", v.toUpperCase().slice(0, 2))} />
            </Grid>
          </Section>

          <Section title="Vínculo e acesso">
            <Grid>
              <div className="space-y-1.5">
                <Label className="text-xs">Tipo de vínculo *</Label>
                <Select value={form.employment_type} onValueChange={(v) => set("employment_type", v as Form["employment_type"])}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="field">Field (freelancer)</SelectItem>
                    <SelectItem value="clt">CLT</SelectItem>
                    <SelectItem value="pj">PJ</SelectItem>
                    <SelectItem value="internal">Interno</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Permissão *</Label>
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
            </Grid>
          </Section>

          <div className="sticky bottom-0 -mx-6 flex items-center justify-end gap-2 border-t border-border bg-surface px-6 py-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={() => mut.mutate()} disabled={!canSubmit}>
              {mut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar técnico"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
      {children}
    </div>
  );
}
function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2">{children}</div>;
}
function F({ label, v, on, type = "text", placeholder, hint }: { label: string; v: string; on: (v: string) => void; type?: string; placeholder?: string; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input type={type} value={v} onChange={(e) => on(e.target.value)} className="h-10" placeholder={placeholder} />
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
