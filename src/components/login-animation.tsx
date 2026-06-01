import { motion } from "framer-motion";

/**
 * Login backdrop — corporate tech, refined.
 * Layered: navy gradient + faint dotted grid + slow rotating ring +
 * three drifting orbs + a subtle animated connection line.
 * Quiet and premium, never neon.
 */
export function LoginAnimation() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Deep navy gradient */}
      <div className="absolute inset-0 bg-[linear-gradient(160deg,oklch(0.24_0.06_260)_0%,oklch(0.16_0.035_260)_55%,oklch(0.1_0.025_260)_100%)]" />

      {/* Faint dotted grid */}
      <svg className="absolute inset-0 h-full w-full opacity-[0.08]">
        <defs>
          <pattern id="dots" width="26" height="26" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" fill="oklch(0.95 0.02 250)" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#dots)" />
      </svg>

      {/* Slow rotating concentric rings — subtle */}
      <motion.svg
        className="absolute left-1/2 top-1/2 h-[680px] w-[680px] -translate-x-1/2 -translate-y-1/2 opacity-[0.18]"
        viewBox="0 0 600 600"
        animate={{ rotate: 360 }}
        transition={{ duration: 80, repeat: Infinity, ease: "linear" }}
      >
        <circle cx="300" cy="300" r="120" fill="none" stroke="oklch(0.7 0.1 240)" strokeWidth="0.6" strokeDasharray="2 8" />
        <circle cx="300" cy="300" r="200" fill="none" stroke="oklch(0.7 0.1 240)" strokeWidth="0.6" strokeDasharray="2 14" />
        <circle cx="300" cy="300" r="280" fill="none" stroke="oklch(0.7 0.1 240)" strokeWidth="0.5" strokeDasharray="2 18" />
      </motion.svg>

      {/* Soft glow behind logo area */}
      <motion.div
        className="absolute -left-32 -top-32 h-[460px] w-[460px] rounded-full"
        style={{
          background:
            "radial-gradient(closest-side, oklch(0.6 0.18 250 / 0.35), transparent 70%)",
        }}
        animate={{ opacity: [0.55, 0.9, 0.55] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Drifting orbs */}
      <motion.div
        className="absolute right-[-140px] top-1/3 h-[340px] w-[340px] rounded-full"
        style={{
          background:
            "radial-gradient(closest-side, oklch(0.62 0.14 220 / 0.25), transparent 70%)",
        }}
        animate={{ y: [0, 24, 0], x: [0, -18, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-[-180px] left-1/4 h-[380px] w-[380px] rounded-full"
        style={{
          background:
            "radial-gradient(closest-side, oklch(0.5 0.12 270 / 0.24), transparent 70%)",
        }}
        animate={{ y: [0, -22, 0], x: [0, 14, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Connecting line — slow draw */}
      <svg className="absolute inset-0 h-full w-full opacity-[0.25]">
        <motion.path
          d="M 60 540 C 200 460, 320 600, 460 460 S 700 360, 820 420"
          fill="none"
          stroke="oklch(0.78 0.12 240)"
          strokeWidth="0.8"
          strokeDasharray="800"
          initial={{ strokeDashoffset: 800 }}
          animate={{ strokeDashoffset: [800, 0, -800] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        />
      </svg>

      {/* Bottom fade */}
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/45 to-transparent" />
    </div>
  );
}
