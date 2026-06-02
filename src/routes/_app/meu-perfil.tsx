import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Loader2, Upload, User as UserIcon, Save, IdCard } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CrachaModal } from "@/components/cracha-modal";

export const Route = createFileRoute("/_app/meu-perfil")({ component: MyProfilePage });

type FormState = {
  full_name: string;
  phone: string;
  job_title: string;
  specialty: string;
  bio: string;
  cep: string;
  address: string;
  address_number: string;
  address_complement: string;
  neighborhood: string;
  city: string;
  state: string;
};

function MyProfilePage() {
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [crachaOpen, setCrachaOpen] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [form, setForm] = useState<FormState>({
    full_name: "", phone: "", job_title: "", specialty: "", bio: "",
    cep: "", address: "", address_number: "", address_complement: "",
    neighborhood: "", city: "", state: "",
  });

  useEffect(() => {
    if (!profile) return;
    setForm({
      full_name: profile.full_name ?? "",
      phone: profile.phone ?? "",
      job_title: profile.job_title ?? "",
      specialty: profile.specialty ?? "",
      bio: (profile as any).bio ?? "",
      cep: (profile as any).cep ?? "",
      address: (profile as any).address ?? "",
      address_number: (profile as any).address_number ?? "",
      address_complement: (profile as any).address_complement ?? "",
      neighborhood: (profile as any).neighborhood ?? "",
      city: (profile as any).city ?? "",
      state: (profile as any).state ?? "",
    });
  }, [profile]);

  async function compressImage(file: File): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();
      reader.onload = (e) => { img.src = e.target?.result as string; };
      reader.onerror = reject;
      img.onload = () => {
        const max = 800;
        let { width, height } = img;
        if (width > height && width > max) { height = (height * max) / width; width = max; }
        else if (height > max) { width = (width * max) / height; height = max; }
        const canvas = document.createElement("canvas");
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("canvas"));
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("blob"))), "image/jpeg", 0.85);
      };
      img.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) { toast.error("Selecione uma imagem"); return; }
    setPhotoFile(f);
    setPhotoPreview(URL.createObjectURL(f));
  }

  const save = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Sem sessão");
      let photo_url: string | undefined;
      if (photoFile) {
        const blob = await compressImage(photoFile);
        const path = `${user.id}/avatar-${Date.now()}.jpg`;
        const { error: upErr } = await supabase.storage
          .from("technician-photos")
          .upload(path, blob, { contentType: "image/jpeg", upsert: true });
        if (upErr) throw new Error(upErr.message);
        const { data } = supabase.storage.from("technician-photos").getPublicUrl(path);
        photo_url = data.publicUrl;
      }
      const update: Record<string, any> = { ...form };
      if (photo_url) { update.photo_url = photo_url; update.avatar_url = photo_url; }
      const { error } = await (supabase.from("profiles") as any).update(update).eq("id", user.id);
      if (error) throw new Error(error.message);
      return { photo_url };
    },
    onSuccess: async () => {
      toast.success("Perfil atualizado");
      setPhotoFile(null);
      setPhotoPreview(null);
      qc.invalidateQueries({ queryKey: ["profile"] });
      qc.invalidateQueries({ queryKey: ["tech"] });
      qc.invalidateQueries({ queryKey: ["techs-min"] });
    },
    onError: (e: any) => toast.error("Falha ao salvar", { description: e?.message }),
  });

  if (!user || !profile) {
    return <div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  const currentPhoto = photoPreview ?? (profile as any).photo_url ?? profile.avatar_url ?? null;

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-4xl">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Conta</p>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Meu perfil</h1>
          <p className="text-sm text-muted-foreground">Atualize sua foto e dados. As alterações refletem no crachá automaticamente.</p>
        </div>
        <Button variant="outline" onClick={() => setCrachaOpen(true)}>
          <IdCard className="h-4 w-4" /> Ver crachá
        </Button>
      </header>

      <div className="mb-5 flex items-center gap-5 rounded-xl border border-border bg-surface p-5 shadow-soft">
        <div className="grid h-24 w-24 place-items-center overflow-hidden rounded-full bg-primary/10 text-primary ring-2 ring-border">
          {currentPhoto
            ? <img src={currentPhoto} alt="" className="h-full w-full object-cover" />
            : <UserIcon className="h-10 w-10" />}
        </div>
        <div className="flex-1">
          <div className="font-display text-lg font-semibold">{form.full_name || "—"}</div>
          <div className="text-xs text-muted-foreground">{form.job_title || "Técnico"} · {form.specialty || "—"}</div>
          <div className="mt-3 flex gap-2">
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickFile} />
            <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
              <Upload className="h-3.5 w-3.5" /> Trocar foto
            </Button>
            {photoFile && (
              <Button size="sm" variant="ghost" onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}>
                Cancelar
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 rounded-xl border border-border bg-surface p-5 shadow-soft sm:grid-cols-2">
        <Field label="Nome completo" v={form.full_name} on={(v) => setForm({ ...form, full_name: v })} full />
        <Field label="Telefone" v={form.phone} on={(v) => setForm({ ...form, phone: v })} />
        <Field label="Cargo" v={form.job_title} on={(v) => setForm({ ...form, job_title: v })} />
        <Field label="Especialidade" v={form.specialty} on={(v) => setForm({ ...form, specialty: v })} full />
        <div className="sm:col-span-2 space-y-1.5">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Bio</Label>
          <Textarea rows={3} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="Uma breve apresentação…" />
        </div>
        <Field label="CEP" v={form.cep} on={(v) => setForm({ ...form, cep: v })} />
        <Field label="Endereço" v={form.address} on={(v) => setForm({ ...form, address: v })} />
        <Field label="Número" v={form.address_number} on={(v) => setForm({ ...form, address_number: v })} />
        <Field label="Complemento" v={form.address_complement} on={(v) => setForm({ ...form, address_complement: v })} />
        <Field label="Bairro" v={form.neighborhood} on={(v) => setForm({ ...form, neighborhood: v })} />
        <Field label="Cidade" v={form.city} on={(v) => setForm({ ...form, city: v })} />
        <Field label="Estado" v={form.state} on={(v) => setForm({ ...form, state: v })} />
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar alterações
        </Button>
      </div>

      <CrachaModal
        tech={{
          id: user.id,
          full_name: form.full_name,
          job_title: form.job_title || "Técnico",
          specialty: form.specialty,
          registration_code: profile.registration_code ?? "",
          company: profile.company ?? "JJ Informática",
          email: profile.email,
          photo_url: currentPhoto,
        } as any}
        open={crachaOpen}
        onOpenChange={setCrachaOpen}
      />
    </div>
  );
}

function Field({ label, v, on, full }: { label: string; v: string; on: (v: string) => void; full?: boolean }) {
  return (
    <div className={`space-y-1.5 ${full ? "sm:col-span-2" : ""}`}>
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      <Input value={v} onChange={(e) => on(e.target.value)} />
    </div>
  );
}
