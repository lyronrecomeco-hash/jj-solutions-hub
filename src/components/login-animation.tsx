import { motion } from "framer-motion";

/**
 * Animated tech/network backdrop for the login left pane.
 * - SVG circuit grid + traveling pulses
 * - Concentric rings behind the logo
 * - Floating node constellation (connected dots)
 * Corporate palette, no neon.
 */
export function LoginAnimation() {
  // Constellation nodes — fixed positions for deterministic look
  const nodes = [
    { x: 12, y: 18 }, { x: 28, y: 32 }, { x: 18, y: 58 },
    { x: 42, y: 22 }, { x: 55, y: 48 }, { x: 38, y: 72 },
    { x: 72, y: 28 }, { x: 82, y: 56 }, { x: 65, y: 80 },
    { x: 90, y: 14 }, { x: 8, y: 82 },  { x: 50, y: 90 },
  ];

  // Connections (indices into nodes[])
  const links: Array<[number, number]> = [
    [0,1],[1,2],[1,3],[3,4],[4,5],[2,5],
    [3,6],[6,7],[4,7],[7,8],[5,8],[6,9],
    [2,10],[10,11],[8,11],
  ];

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Base gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,oklch(0.32_0.13_258)_0%,oklch(0.16_0.04_260)_55%,oklch(0.12_0.03_260)_100%)]" />

      {/* Faint circuit grid */}
      <svg className="absolute inset-0 h-full w-full opacity-[0.18]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="circuit" width="48" height="48" patternUnits="userSpaceOnUse">
            <path d="M0 24 H48 M24 0 V48" stroke="oklch(0.85 0.05 250)" strokeWidth="0.4" />
            <circle cx="24" cy="24" r="1.2" fill="oklch(0.85 0.05 250)" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#circuit)" />
      </svg>

      {/* Concentric rings */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        {[280, 420, 560, 700].map((s, i) => (
          <motion.div
            key={s}
            className="absolute rounded-full border border-white/10"
            style={{ width: s, height: s, left: -s / 2, top: -s / 2 }}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: [0.15, 0.4, 0.15], scale: [0.95, 1.02, 0.95] }}
            transition={{ duration: 6 + i, repeat: Infinity, ease: "easeInOut", delay: i * 0.6 }}
          />
        ))}
      </div>

      {/* Constellation */}
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        {links.map(([a, b], i) => {
          const A = nodes[a]; const B = nodes[b];
          return (
            <motion.line
              key={i}
              x1={A.x} y1={A.y} x2={B.x} y2={B.y}
              stroke="oklch(0.85 0.1 230)"
              strokeWidth="0.15"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.15, 0.55, 0.15] }}
              transition={{ duration: 3 + (i % 4), repeat: Infinity, delay: i * 0.2 }}
            />
          );
        })}
        {nodes.map((n, i) => (
          <g key={i}>
            <motion.circle
              cx={n.x} cy={n.y} r="0.35"
              fill="oklch(0.92 0.08 230)"
              animate={{ r: [0.3, 0.55, 0.3], opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 2.2 + (i % 5) * 0.4, repeat: Infinity, delay: i * 0.15 }}
            />
            <motion.circle
              cx={n.x} cy={n.y} r="1.2"
              fill="oklch(0.7 0.12 235)"
              animate={{ opacity: [0, 0.25, 0], r: [1, 2.4, 1] }}
              transition={{ duration: 3 + (i % 3), repeat: Infinity, delay: i * 0.3 }}
            />
          </g>
        ))}
      </svg>

      {/* Traveling pulse along a diagonal */}
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        <motion.circle
          r="0.6"
          fill="oklch(0.92 0.12 220)"
          initial={{ cx: 0, cy: 100 }}
          animate={{ cx: [0, 100], cy: [100, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        />
        <motion.circle
          r="0.45"
          fill="oklch(0.9 0.1 200)"
          initial={{ cx: 100, cy: 100 }}
          animate={{ cx: [100, 0], cy: [100, 30] }}
          transition={{ duration: 11, repeat: Infinity, ease: "linear", delay: 1.5 }}
        />
      </svg>

      {/* Top glow + bottom fade for depth */}
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-white/[0.06] to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/40 to-transparent" />
    </div>
  );
}
