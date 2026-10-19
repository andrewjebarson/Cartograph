import React from "react";

/**
 * Static inline SVG illustrations adhering strictly to Phase 13 spec:
 * - Drawn, not captured (no stranger's directories or real code screenshots).
 * - Unlabelled nodes (abstract geometric boxes with canvas tokens).
 * - Colours derived directly from canvas decisions:
 *   - Greyscale surfaces & borders
 *   - Green (#10b981) for incoming fan-in
 *   - Amber (#f59e0b) for outgoing fan-out
 * - Static (no animation).
 */

export function VerifiedImportsIllustration() {
  return (
    <svg
      viewBox="0 0 400 240"
      className="w-full max-w-md h-auto select-none"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Background card boundary */}
      <rect
        x="10"
        y="10"
        width="380"
        height="220"
        rx="8"
        className="fill-zinc-50/50 dark:fill-zinc-900/40 stroke-zinc-200 dark:stroke-zinc-800"
        strokeWidth="1"
      />

      {/* Edges */}
      {/* Outgoing edge from Node A to Node B (Amber) */}
      <path
        d="M 120 70 C 170 70, 180 140, 230 140"
        stroke="#f59e0b"
        strokeWidth="2"
      />
      <polygon points="230,137 236,140 230,143" fill="#f59e0b" />

      {/* Outgoing edge from Node A to Node C (Amber) */}
      <path
        d="M 120 70 C 180 70, 200 60, 250 60"
        stroke="#f59e0b"
        strokeWidth="2"
      />
      <polygon points="250,57 256,60 250,63" fill="#f59e0b" />

      {/* Incoming edge from Node D to Node A (Green) */}
      <path
        d="M 50 160 C 50 110, 60 70, 80 70"
        stroke="#10b981"
        strokeWidth="2"
      />
      <polygon points="80,67 86,70 80,73" fill="#10b981" />

      {/* Secondary background edge */}
      <path
        d="M 270 90 L 310 130"
        className="stroke-zinc-300 dark:stroke-zinc-700"
        strokeWidth="1"
        strokeDasharray="3 3"
      />

      {/* Node A (Center/Subject) */}
      <rect
        x="60"
        y="50"
        width="80"
        height="40"
        rx="4"
        className="fill-white dark:fill-zinc-950 stroke-amber-500/80"
        strokeWidth="1.5"
      />
      <rect x="70" y="60" width="35" height="4" rx="2" className="fill-amber-500/80" />
      <rect x="70" y="70" width="50" height="3" rx="1.5" className="fill-zinc-300 dark:fill-zinc-700" />

      {/* Node B */}
      <rect
        x="220"
        y="120"
        width="90"
        height="44"
        rx="4"
        className="fill-white dark:fill-zinc-950 stroke-zinc-300 dark:stroke-zinc-700"
        strokeWidth="1"
      />
      <rect x="232" y="132" width="40" height="4" rx="2" className="fill-zinc-400 dark:fill-zinc-500" />
      <rect x="232" y="142" width="60" height="3" rx="1.5" className="fill-zinc-200 dark:fill-zinc-800" />

      {/* Node C */}
      <rect
        x="240"
        y="40"
        width="80"
        height="38"
        rx="4"
        className="fill-white dark:fill-zinc-950 stroke-zinc-300 dark:stroke-zinc-700"
        strokeWidth="1"
      />
      <rect x="252" y="52" width="30" height="4" rx="2" className="fill-zinc-400 dark:fill-zinc-500" />
      <rect x="252" y="61" width="45" height="3" rx="1.5" className="fill-zinc-200 dark:fill-zinc-800" />

      {/* Node D */}
      <rect
        x="30"
        y="145"
        width="75"
        height="36"
        rx="4"
        className="fill-white dark:fill-zinc-950 stroke-zinc-300 dark:stroke-zinc-700"
        strokeWidth="1"
      />
      <rect x="40" y="156" width="35" height="4" rx="2" className="fill-zinc-400 dark:fill-zinc-500" />
      <rect x="40" y="165" width="45" height="3" rx="1.5" className="fill-zinc-200 dark:fill-zinc-800" />
    </svg>
  );
}

export function FoldingHierarchyIllustration() {
  return (
    <svg
      viewBox="0 0 400 240"
      className="w-full max-w-md h-auto select-none"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        x="10"
        y="10"
        width="380"
        height="220"
        rx="8"
        className="fill-zinc-50/50 dark:fill-zinc-900/40 stroke-zinc-200 dark:stroke-zinc-800"
        strokeWidth="1"
      />

      {/* Expanded Cluster Container */}
      <rect
        x="40"
        y="35"
        width="160"
        height="170"
        rx="6"
        className="fill-white/80 dark:fill-zinc-950/80 stroke-zinc-300 dark:stroke-zinc-700"
        strokeWidth="1"
      />
      {/* Folder Header Bar */}
      <rect x="50" y="46" width="55" height="5" rx="2.5" className="fill-zinc-500 dark:fill-zinc-400" />
      <circle cx="185" cy="48" r="3" className="fill-amber-500/80" />

      {/* Internal File Rows */}
      <rect x="50" y="65" width="140" height="20" rx="3" className="fill-zinc-100 dark:fill-zinc-900" />
      <rect x="58" y="73" width="60" height="4" rx="2" className="fill-zinc-400 dark:fill-zinc-500" />

      <rect x="50" y="92" width="140" height="20" rx="3" className="fill-amber-500/10 stroke-amber-500/40" strokeWidth="1" />
      <rect x="58" y="100" width="70" height="4" rx="2" className="fill-amber-600 dark:fill-amber-400" />

      <rect x="50" y="119" width="140" height="20" rx="3" className="fill-zinc-100 dark:fill-zinc-900" />
      <rect x="58" y="127" width="50" height="4" rx="2" className="fill-zinc-400 dark:fill-zinc-500" />

      <rect x="50" y="146" width="140" height="20" rx="3" className="fill-zinc-100 dark:fill-zinc-900" />
      <rect x="58" y="154" width="80" height="4" rx="2" className="fill-zinc-400 dark:fill-zinc-500" />

      <rect x="50" y="173" width="140" height="20" rx="3" className="fill-zinc-100 dark:fill-zinc-900" />
      <rect x="58" y="181" width="45" height="4" rx="2" className="fill-zinc-400 dark:fill-zinc-500" />

      {/* Directed Edge from Selected File to Folded Node */}
      <path
        d="M 190 102 C 225 102, 235 75, 270 75"
        stroke="#f59e0b"
        strokeWidth="2"
      />
      <polygon points="270,72 276,75 270,78" fill="#f59e0b" />

      {/* Incoming edge to another file */}
      <path
        d="M 270 145 C 235 145, 225 156, 190 156"
        stroke="#10b981"
        strokeWidth="2"
      />
      <polygon points="190,153 184,156 190,159" fill="#10b981" />

      {/* Target Folded Node 1 */}
      <rect
        x="260"
        y="50"
        width="100"
        height="50"
        rx="5"
        className="fill-white dark:fill-zinc-950 stroke-zinc-300 dark:stroke-zinc-700"
        strokeWidth="1"
      />
      <rect x="272" y="62" width="45" height="5" rx="2.5" className="fill-zinc-400 dark:fill-zinc-500" />
      <rect x="272" y="74" width="65" height="4" rx="2" className="fill-zinc-200 dark:fill-zinc-800" />

      {/* Target Folded Node 2 */}
      <rect
        x="260"
        y="125"
        width="100"
        height="50"
        rx="5"
        className="fill-white dark:fill-zinc-950 stroke-zinc-300 dark:stroke-zinc-700"
        strokeWidth="1"
      />
      <rect x="272" y="137" width="50" height="5" rx="2.5" className="fill-zinc-400 dark:fill-zinc-500" />
      <rect x="272" y="149" width="40" height="4" rx="2" className="fill-zinc-200 dark:fill-zinc-800" />
    </svg>
  );
}

export function FrameworkAdaptersIllustration() {
  return (
    <svg
      viewBox="0 0 400 240"
      className="w-full max-w-md h-auto select-none"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        x="10"
        y="10"
        width="380"
        height="220"
        rx="8"
        className="fill-zinc-50/50 dark:fill-zinc-900/40 stroke-zinc-200 dark:stroke-zinc-800"
        strokeWidth="1"
      />

      {/* Adapter Layer 1: TypeScript / Angular */}
      <rect
        x="40"
        y="45"
        width="95"
        height="65"
        rx="5"
        className="fill-white dark:fill-zinc-950 stroke-zinc-300 dark:stroke-zinc-700"
        strokeWidth="1"
      />
      <rect x="52" y="58" width="45" height="4" rx="2" className="fill-zinc-700 dark:fill-zinc-300" />
      <rect x="52" y="69" width="65" height="3" rx="1.5" className="fill-zinc-300 dark:fill-zinc-700" />
      <rect x="52" y="78" width="50" height="3" rx="1.5" className="fill-amber-500/70" />

      {/* Adapter Layer 2: Next.js */}
      <rect
        x="40"
        y="130"
        width="95"
        height="65"
        rx="5"
        className="fill-white dark:fill-zinc-950 stroke-zinc-300 dark:stroke-zinc-700"
        strokeWidth="1"
      />
      <rect x="52" y="143" width="40" height="4" rx="2" className="fill-zinc-700 dark:fill-zinc-300" />
      <rect x="52" y="154" width="60" height="3" rx="1.5" className="fill-zinc-300 dark:fill-zinc-700" />
      <rect x="52" y="163" width="55" height="3" rx="1.5" className="fill-emerald-500/70" />

      {/* Flow Converging to Parser Engine */}
      <path d="M 135 77 L 195 110" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="3 3" />
      <path d="M 135 162 L 195 125" stroke="#10b981" strokeWidth="1.5" strokeDasharray="3 3" />

      {/* Core Parser Box */}
      <rect
        x="195"
        y="85"
        width="75"
        height="65"
        rx="5"
        className="fill-zinc-100 dark:fill-zinc-900 stroke-zinc-400 dark:stroke-zinc-600"
        strokeWidth="1.5"
      />
      <rect x="207" y="103" width="50" height="5" rx="2.5" className="fill-zinc-900 dark:fill-zinc-100" />
      <rect x="207" y="115" width="35" height="4" rx="2" className="fill-zinc-400 dark:fill-zinc-500" />

      {/* Output Edge */}
      <path d="M 270 117 L 305 117" stroke="#f59e0b" strokeWidth="2" />
      <polygon points="305,114 311,117 305,120" fill="#f59e0b" />

      {/* Output Topology Canvas */}
      <rect
        x="305"
        y="60"
        width="55"
        height="115"
        rx="4"
        className="fill-white dark:fill-zinc-950 stroke-zinc-300 dark:stroke-zinc-700"
        strokeWidth="1"
      />
      <circle cx="332" cy="85" r="5" className="fill-zinc-400 dark:fill-zinc-500" />
      <line x1="332" y1="90" x2="332" y2="115" stroke="#f59e0b" strokeWidth="1.5" />
      <circle cx="332" cy="115" r="5" className="fill-amber-500" />
      <line x1="332" y1="120" x2="332" y2="145" stroke="#10b981" strokeWidth="1.5" />
      <circle cx="332" cy="145" r="5" className="fill-emerald-500" />
    </svg>
  );
}
