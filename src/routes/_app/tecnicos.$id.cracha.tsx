import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Download, Loader2 } from "lucide-react";
import { toPng } from "html-to-image";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { CrachaCard, type Tech } from "@/components/cracha-card";
import { CrachaModal } from "@/components/cracha-modal";

export const Route = createFileRoute("/_app/tecnicos/$id/cracha")({ component: BadgePage });

type Full = Tech & { status: string };

function BadgePage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [tech, setTech] = useState<Full | null>(null);
  const [loading, setLoading] = useState(true);
  const [openModal, setOpenModal] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, email, specialty, job_title, registration_code, employment_type, photo_url, status")
        .eq("id", id).maybeSingle();
      setTech((data as Full | null) ?? null);
      setLoading(false);
    })();
  }, [id]);

  async function downloadImage() {
    const el = document.getElementById("cracha-print");
    if (!el) return;
    setDownloading(true);
    try {
      const dataUrl = await toPng(el, {
        pixelRatio: 4,
        cacheBust: true,
        backgroundColor: "transparent",
      });
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `cracha-${tech?.full_name?.replace(/\s+/g, "-").toLowerCase() ?? id}.png`;
      link.click();
      toast.success("Crachá baixado");
    } catch (err: any) {
      toast.error("Falha ao baixar", { description: err?.message });
    } finally {
      setDownloading(false);
    }
  }

  if (loading) return <div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  if (!tech) return <div className="px-6 py-10 text-sm text-muted-foreground">Técnico não encontrado.</div>;

  const empLabel = { field: "Field", clt: "CLT", pj: "PJ", internal: "Interno" }[tech.employment_type];

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <button onClick={() => navigate({ to: "/tecnicos" })} className="mb-5 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Voltar
      </button>

      <div className="grid items-start gap-8 lg:grid-cols-[auto_1fr]">
        <div className="flex justify-center">
          <button onClick={() => setOpenModal(true)} className="transition hover:scale-[1.02]" title="Abrir crachá em destaque (3D)">
            <div id="cracha-print">
              <CrachaCard tech={tech} />
            </div>
          </button>
        </div>

        <div className="max-w-md space-y-4">
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight">Crachá Digital</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Identidade oficial do técnico. Clique no crachá para vê-lo em 3D ou baixe a imagem para impressão.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-surface p-5 shadow-soft">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <Info label="Nome" v={tech.full_name} />
              <Info label="Email" v={tech.email} />
              <Info label="Cargo" v={tech.job_title ?? "—"} />
              <Info label="Especialidade" v={tech.specialty ?? "—"} />
              <Info label="Vínculo" v={empLabel} />
              <Info label="Matrícula" v={tech.registration_code ?? "—"} />
              <Info label="Status" v={tech.status} />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={downloadImage} className="flex-1" disabled={downloading}>
              {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Baixar imagem para impressão
            </Button>
            <Button variant="outline" onClick={() => setOpenModal(true)}>Vista 3D</Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Imagem PNG em alta resolução (~600 DPI no formato real 60×95 mm).
          </p>
        </div>
      </div>

      <CrachaModal tech={tech} open={openModal} onOpenChange={setOpenModal} />
    </div>
  );
}

function Info({ label, v }: { label: string; v: string }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-sm font-medium">{v}</div>
    </div>
  );
}
