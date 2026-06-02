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
 * Premium vertical employee badge — 60×95mm proportion.
 * Uses sRGB hex colors only so the rasterizer can render it correctly.
 */
export const CrachaCard = forwardRef<HTMLDivElement, Props>(({ tech, className }, ref) => {
  const initials = (tech.full_name || "JJ")
    .split(" ").map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
  const qrValue = `https://jjinformatica.app/validar/${tech.id}`;

  return (
    <div
      ref={ref}
      className={`relative w-[300px] overflow-hidden rounded-[20px] bg-white shadow-2xl ring-1 ring-black/10 ${className ?? ""}`}
      style={{ aspectRatio: "60 / 95", fontFamily: "Inter, system-ui, sans-serif", color: "#0f172a" }}
    >
      {/* Lanyard hole */}
      <div
        className="pointer-events-none absolute left-1/2 top-2.5 h-3 w-14 -translate-x-1/2 rounded-full"
        style={{ background: "#f1f5f9", border: "1px solid #cbd5e1" }}
      />

      {/* Top brand band */}
      <div
        className="relative px-4 pb-3 pt-6 text-white"
        style={{
          height: 140,
          background: "linear-gradient(135deg, #1e3a8a 0%, #1e1b4b 60%, #0f172a 100%)",
        }}
      >
        <div className="flex items-center justify-between">
          <JJLogo />
          <span
            className="rounded-full px-2 py-0.5 text-[8px] font-bold tracking-[0.15em] text-white"
            style={{ background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.35)" }}
          >
            SERVICE DESK
          </span>
        </div>
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-full"
          style={{
            background: "radial-gradient(ellipse at top right, rgba(96,165,250,0.25), transparent 60%)",
          }}
        />
        <div
          className="absolute -bottom-12 left-1/2 h-24 w-24 -translate-x-1/2 overflow-hidden rounded-full bg-slate-200"
          style={{ border: "4px solid #ffffff", boxShadow: "0 6px 14px rgba(0,0,0,0.22)" }}
        >
          {tech.photo_url ? (
            <img
              src={tech.photo_url}
              alt={tech.full_name}
              className="h-full w-full object-cover"
              crossOrigin="anonymous"
            />
          ) : (
            <div
              className="flex h-full w-full items-center justify-center text-2xl font-bold text-white"
              style={{ background: "linear-gradient(135deg, #3b82f6, #1d4ed8)" }}
            >
              {initials}
            </div>
          )}
        </div>
        {/* Online dot indicator */}
        <span
          className="absolute"
          style={{
            bottom: -6, left: "calc(50% + 28px)",
            width: 14, height: 14, borderRadius: 9999,
            background: "#22c55e", border: "3px solid #ffffff",
            boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
          }}
        />
      </div>

      {/* Body */}
      <div className="px-4 pb-4 pt-16 text-center">
        <div className="text-[16px] font-bold leading-tight" style={{ color: "#0f172a" }}>
          {tech.full_name}
        </div>
        <div className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.16em]" style={{ color: "#64748b" }}>
          JJ Informática · Soluções em Tecnologia
        </div>

        <div className="mt-3 flex justify-center">
          <span
            className="rounded-full px-3 py-0.5 text-[9px] font-bold tracking-wider text-white"
            style={{
              background: "linear-gradient(135deg, #2563eb, #1e3a8a)",
              boxShadow: "0 2px 6px rgba(30,58,138,0.35)",
            }}
          >
            {empLabel[tech.employment_type]}
          </span>
        </div>

        <div className="mt-3 space-y-0.5 text-[11px]" style={{ color: "#475569" }}>
          {tech.job_title && <div className="font-semibold" style={{ color: "#1e293b" }}>{tech.job_title}</div>}
          {tech.specialty && <div>{tech.specialty}</div>}
        </div>

        <div
          className="mt-3 inline-block rounded-md px-2.5 py-1 font-mono text-[10px]"
          style={{ background: "#f8fafc", border: "1px solid #e2e8f0", color: "#334155" }}
        >
          Mat. {tech.registration_code ?? "—"}
        </div>

        <div className="mt-3 flex justify-center">
          <div className="rounded-md bg-white p-1.5" style={{ border: "1px solid #e2e8f0" }}>
            <QRCodeSVG value={qrValue} size={70} level="H" />
          </div>
        </div>

        <div
          className="mt-2 flex items-center justify-center gap-1 text-[8px] font-semibold uppercase tracking-wider"
          style={{ color: "#64748b" }}
        >
          <ShieldCheck className="h-3 w-3" /> Identidade validada
        </div>
      </div>
    </div>
  );
});
CrachaCard.displayName = "CrachaCard";
