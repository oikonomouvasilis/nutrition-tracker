"use client";

import { useEffect, useRef } from "react";

/** Φουτουριστικό φόντο: neon blobs + κινούμενο πλέγμα + spotlight «φακός». */
export default function AuthBackground() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onMove = (e: PointerEvent) => {
      el.style.setProperty("--mx", `${e.clientX}px`);
      el.style.setProperty("--my", `${e.clientY}px`);
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{ "--mx": "50%", "--my": "28%" } as React.CSSProperties}
    >
      {/* Κινούμενο πλέγμα γραμμών */}
      <div className="auth-grid absolute inset-0 opacity-70" />

      {/* Neon blobs που αιωρούνται */}
      <div className="auth-blob absolute -left-24 -top-28 h-80 w-80 rounded-full bg-neon-green/20 blur-3xl" />
      <div
        className="auth-blob absolute -right-28 top-8 h-96 w-96 rounded-full bg-neon-cyan/15 blur-3xl"
        style={{ animationDelay: "-6s" }}
      />
      <div
        className="auth-blob absolute -bottom-28 left-1/3 h-80 w-80 rounded-full bg-neon-violet/15 blur-3xl"
        style={{ animationDelay: "-11s" }}
      />

      {/* Σαρωτική γραμμή */}
      <div className="auth-scan absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-neon-green/60 to-transparent" />

      {/* Spotlight «φακός» που ακολουθεί τον δείκτη */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle 320px at var(--mx) var(--my), rgba(45,255,149,0.13), transparent 70%)",
        }}
      />

      {/* Vignette για βάθος */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_38%,rgba(0,0,0,0.55))]" />
    </div>
  );
}
