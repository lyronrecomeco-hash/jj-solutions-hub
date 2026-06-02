import { forwardRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { ShieldCheck } from "lucide-react";

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
  const origin = typeof window !== "undefined" ? window.location.origin : "https://jjinformatica.app";
  const qrValue = `${origin}/validar/${tech.id}`;

  return (
    <div
      ref={ref}
      className={`relative w-[300px] overflow-hidden rounded-[18px] bg-white shadow-2xl ring-1 ring-black/10 ${className ?? ""}`}
      style={{ aspectRatio: "60 / 95", fontFamily: "Inter, system-ui, sans-serif", color: "#0f172a" }}
    >
      {/* Top brand band */}
      <div
        className="relative px-4 pb-3 pt-4 text-white"
        style={{
          height: 132,
          background: "linear-gradient(145deg, #0f4c8f 0%, #143a79 42%, #24275f 100%)",
        }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage: "repeating-linear-gradient(135deg, rgba(255,255,255,0.15) 0, rgba(255,255,255,0.15) 1px, transparent 1px, transparent 7px)",
          }}
        />
        <div className="relative z-10 flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-lg text-[12px] font-extrabold text-white" style={{ background: "#43a7f5" }}>JJ</span>
            <span className="leading-tight">
              <span className="block text-[13px] font-extrabold tracking-tight">JJ Informática</span>
              <span className="block text-[9px] font-bold uppercase tracking-[0.14em] text-white/65">Service Desk</span>
            </span>
          </div>
          <span
            className="rounded-full px-2 py-0.5 text-[8px] font-bold tracking-[0.18em] text-white"
            style={{ background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.35)" }}
          >
            SERVICE DESK
          </span>
        </div>
        <div
          className="absolute -bottom-11 left-1/2 h-[92px] w-[92px] -translate-x-1/2 overflow-hidden rounded-full bg-slate-200"
          style={{ border: "4px solid #ffffff", boxShadow: "0 8px 14px rgba(15,23,42,0.28)" }}
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
      </div>

      {/* Body */}
      <div className="px-4 pb-3 pt-14 text-center">
        <div className="text-[15px] font-extrabold leading-tight" style={{ color: "#0f172a" }}>
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

        <div className="mt-3 min-h-[34px] space-y-0.5 text-[10px]" style={{ color: "#475569" }}>
          {tech.job_title && <div className="font-bold" style={{ color: "#475569" }}>{tech.job_title}</div>}
          {tech.specialty && <div>{tech.specialty}</div>}
        </div>

        <div
          className="mt-3 inline-block rounded-md px-2.5 py-1 font-mono text-[10px]"
          style={{ background: "#f8fafc", border: "1px solid #e2e8f0", color: "#334155" }}
        >
          Mat. {tech.registration_code ?? "—"}
        </div>

        <div className="mt-2.5 flex justify-center">
          <div className="rounded-md bg-white p-1.5" style={{ border: "1px solid #e2e8f0" }}>
            <QRCodeSVG value={qrValue} size={64} level="H" />
          </div>
        </div>

        <div
          className="mt-1.5 flex items-center justify-center gap-1 text-[7px] font-semibold uppercase tracking-wider"
          style={{ color: "#64748b" }}
        >
          <ShieldCheck className="h-3 w-3" /> Identidade validada
        </div>
      </div>
    </div>
  );
});
CrachaCard.displayName = "CrachaCard";
