import { forwardRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { ShieldCheck } from "lucide-react";
import { JJLogo } from "@/components/jj-logo";

export type Tech = {
  id: string;
  full_name: string;
  email: string;
  specialty: string | null;
  job_title: string | null;
  registration_code: string | null;
  employment_type: "field" | "clt" | "pj" | "internal";
  photo_url: string | null;
};

const empLabel: Record<Tech["employment_type"], string> = {
  field: "FIELD", clt: "CLT", pj: "PJ", internal: "INTERNO",
};

interface Props {
  tech: Tech;
  className?: string;
}

/**
 * Realistic vertical employee badge — 60×95mm proportion.
 * Used both for download (html2canvas) and inline preview.
 */
export const CrachaCard = forwardRef<HTMLDivElement, Props>(({ tech, className }, ref) => {
  const initials = (tech.full_name || "JJ")
    .split(" ").map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
  const qrValue = `https://jjinformatica.app/validar/${tech.id}`;

  return (
    <div
      ref={ref}
      className={`relative w-[300px] overflow-hidden rounded-[18px] bg-white shadow-2xl ring-1 ring-black/10 ${className ?? ""}`}
      style={{ aspectRatio: "60 / 95" }}
    >
      {/* Lanyard hole */}
      <div className="pointer-events-none absolute left-1/2 top-2 h-3 w-12 -translate-x-1/2 rounded-full border border-slate-300 bg-slate-100" />

      {/* Top brand band with diagonal pattern */}
      <div
        className="relative h-[128px] px-4 pb-3 pt-5 text-white"
        style={{
          background:
            "linear-gradient(135deg, oklch(0.34 0.14 258) 0%, oklch(0.22 0.09 260) 100%)",
        }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, white 0 1px, transparent 1px 12px)",
          }}
        />
        <JJLogo />
        <div className="absolute -bottom-12 left-1/2 h-24 w-24 -translate-x-1/2 overflow-hidden rounded-full border-4 border-white bg-slate-200 shadow-md">
          {tech.photo_url ? (
            <img src={tech.photo_url} alt={tech.full_name} className="h-full w-full object-cover" crossOrigin="anonymous" />
          ) : (
            <div
              className="flex h-full w-full items-center justify-center text-2xl font-bold text-white"
              style={{ background: "linear-gradient(135deg, oklch(0.55 0.14 258), oklch(0.4 0.12 258))" }}
            >
              {initials}
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="px-4 pb-4 pt-16 text-center text-slate-900">
        <div className="text-[15px] font-bold leading-tight">{tech.full_name}</div>
        <div className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          JJ Informática · Soluções em Tecnologia
        </div>

        <div className="mt-3 flex justify-center">
          <span
            className="rounded-full px-3 py-0.5 text-[9px] font-bold tracking-wider text-white shadow-sm"
            style={{ background: "linear-gradient(135deg, oklch(0.5 0.16 258), oklch(0.36 0.13 258))" }}
          >
            {empLabel[tech.employment_type]}
          </span>
        </div>

        <div className="mt-3 space-y-0.5 text-[10px] text-slate-600">
          {tech.job_title && <div className="font-semibold text-slate-700">{tech.job_title}</div>}
          {tech.specialty && <div className="text-slate-500">{tech.specialty}</div>}
        </div>

        <div className="mt-3 inline-block rounded border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-[10px]">
          Mat. {tech.registration_code ?? "—"}
        </div>

        <div className="mt-3 flex justify-center">
          <div className="rounded border border-slate-200 bg-white p-1.5">
            <QRCodeSVG value={qrValue} size={70} level="M" />
          </div>
        </div>

        <div className="mt-2 flex items-center justify-center gap-1 text-[8px] font-semibold uppercase tracking-wider text-slate-500">
          <ShieldCheck className="h-3 w-3" /> Identidade validada
        </div>
      </div>
    </div>
  );
});
CrachaCard.displayName = "CrachaCard";
