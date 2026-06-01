import { motion } from "framer-motion";

/**
 * Login backdrop — minimal, corporate, tech.
 * Subtle gradient + faint grid + a single soft glow + two slow drifting dots.
 * No constellation, no neon. Quiet on purpose.
 */
export function LoginAnimation() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Deep navy gradient */}
      <div className="absolute inset-0 bg-[linear-gradient(160deg,oklch(0.22_0.06_260)_0%,oklch(0.15_0.035_260)_55%,oklch(0.11_0.025_260)_100%)]" />

      {/* Faint dotted grid */}
      <svg className="absolute inset-0 h-full w-full opacity-[0.07]">
        <defs>
          <pattern id="dots" width="28" height="28" patternUnits="userSpaceOnUse">
            <circle cx="1.2" cy="1.2" r="1.2" fill="oklch(0.95 0.02 250)" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#dots)" />
      </svg>

      {/* Soft glow behind logo area (top-left) */}
      <motion.div
        className="absolute -left-32 -top-32 h-[420px] w-[420px] rounded-full"
        style={{
          background:
            "radial-gradient(closest-side, oklch(0.55 0.16 250 / 0.35), transparent 70%)",
        }}
        animate={{ opacity: [0.55, 0.85, 0.55] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Two drifting soft orbs */}
      <motion.div
        className="absolute right-[-120px] top-1/3 h-[320px] w-[320px] rounded-full"
        style={{
          background:
            "radial-gradient(closest-side, oklch(0.6 0.12 220 / 0.22), transparent 70%)",
        }}
        animate={{ y: [0, 24, 0], x: [0, -18, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-[-160px] left-1/4 h-[360px] w-[360px] rounded-full"
        style={{
          background:
            "radial-gradient(closest-side, oklch(0.5 0.1 270 / 0.22), transparent 70%)",
        }}
        animate={{ y: [0, -20, 0], x: [0, 14, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Bottom fade */}
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/40 to-transparent" />
    </div>
  );
}
