import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { ArrowLeft, Download, Loader2, ShieldCheck } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { JJLogo } from "@/components/jj-logo";

export const Route = createFileRoute("/_app/tecnicos/$id/cracha")({ component: BadgePage });

type T = {
  id: string;
  full_name: string;
  email: string;
  specialty: string | null;
  job_title: string | null;
  registration_code: string | null;
  employment_type: "field" | "clt" | "pj" | "internal";
  photo_url: string | null;
  status: string;
};

const empLabel: Record<T["employment_type"], string> = {
  field: "FIELD", clt: "CLT", pj: "PJ", internal: "INTERNO",
};

function BadgePage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [tech, setTech] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, email, specialty, job_title, registration_code, employment_type, photo_url, status")
        .eq("id", id)
        .maybeSingle();
      setTech((data as T | null) ?? null);
      setLoading(false);
    })();
  }, [id]);

  async function downloadPdf() {
    if (!cardRef.current) return;
    const canvas = await html2canvas(cardRef.current, { scale: 3, backgroundColor: null });
    const img = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ unit: "mm", format: [60, 95], orientation: "portrait" });
    pdf.addImage(img, "PNG", 0, 0, 60, 95);
    pdf.save(`cracha-${tech?.full_name?.replace(/\s+/g, "-").toLowerCase() ?? id}.pdf`);
  }

  if (loading) {
    return <div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }
  if (!tech) return <div className="px-6 py-10 text-sm text-muted-foreground">Técnico não encontrado.</div>;

  const initials = tech.full_name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  const qrValue = `https://jjinformatica.app/validar/${tech.id}`;

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <button onClick={() => navigate({ to: "/tecnicos" })} className="mb-5 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Voltar
      </button>

      <div className="grid items-start gap-8 lg:grid-cols-[auto_1fr]">
        {/* The card */}
        <div className="flex justify-center">
          <div
            ref={cardRef}
            className="relative w-[300px] overflow-hidden rounded-2xl bg-white shadow-2xl"
            style={{ aspectRatio: "60 / 95" }}
          >
            {/* Top brand band */}
            <div
              className="relative h-[120px] px-4 pt-4 text-white"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.32 0.13 258) 0%, oklch(0.22 0.09 260) 100%)",
              }}
            >
              <JJLogo />
              <div className="absolute -bottom-12 left-1/2 h-24 w-24 -translate-x-1/2 overflow-hidden rounded-full border-4 border-white bg-slate-200">
                {tech.photo_url ? (
                  <img src={tech.photo_url} alt={tech.full_name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-slate-300 text-2xl font-bold text-slate-700">
                    {initials}
                  </div>
                )}
              </div>
            </div>

            {/* Body */}
            <div className="px-4 pb-4 pt-16 text-center text-slate-900">
              <div className="text-[15px] font-bold leading-tight">{tech.full_name}</div>
              <div className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                JJ Informática · Soluções em Tecnologia
              </div>

              <div className="mt-3 flex justify-center">
                <span
                  className="rounded-full px-2.5 py-0.5 text-[9px] font-bold tracking-wider text-white"
                  style={{ background: "oklch(0.42 0.13 258)" }}
                >
                  {empLabel[tech.employment_type]}
                </span>
              </div>

              <div className="mt-3 space-y-0.5 text-[10px] text-slate-600">
                {tech.job_title && <div>{tech.job_title}</div>}
                {tech.specialty && <div className="text-slate-500">{tech.specialty}</div>}
              </div>

              <div className="mt-3 inline-block rounded border border-slate-200 px-2 py-1 text-[10px] font-mono">
                Mat. {tech.registration_code ?? "—"}
              </div>

              <div className="mt-3 flex justify-center">
                <div className="rounded bg-white p-1.5">
                  <QRCodeSVG value={qrValue} size={70} level="M" />
                </div>
              </div>

              <div className="mt-2 flex items-center justify-center gap-1 text-[8px] font-medium uppercase tracking-wider text-slate-500">
                <ShieldCheck className="h-3 w-3" /> Identidade validada
              </div>
            </div>
          </div>
        </div>

        {/* Side actions */}
        <div className="max-w-md space-y-4">
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight">Crachá Digital</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Identidade oficial do técnico no campo. Inclui QR Code para validação imediata.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-surface p-5 shadow-soft">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <Info label="Nome" v={tech.full_name} />
              <Info label="Email" v={tech.email} />
              <Info label="Cargo" v={tech.job_title ?? "—"} />
              <Info label="Especialidade" v={tech.specialty ?? "—"} />
              <Info label="Vínculo" v={empLabel[tech.employment_type]} />
              <Info label="Matrícula" v={tech.registration_code ?? "—"} />
              <Info label="Status" v={tech.status} />
            </div>
          </div>

          <Button onClick={downloadPdf} className="w-full">
            <Download className="h-4 w-4" /> Baixar crachá em PDF
          </Button>
        </div>
      </div>
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
