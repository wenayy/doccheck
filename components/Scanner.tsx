"use client";

import { animated, useTransition } from "@react-spring/web";
import { useEffect, useState } from "react";
import { Thumb, type Picked } from "./Dropzone";

const STAGES = [
  "Reading each document",
  "Identifying document types",
  "Extracting names, dates, and amounts",
  "Matching names across documents",
  "Checking statement recency",
  "Reconciling salary with bank credits",
  "Looking for signs of editing",
  "Comparing against the checklist",
];

export function Scanner({ files }: { files: Picked[] }) {
  const [stage, setStage] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setStage((s) => (s + 1) % STAGES.length), 2200);
    return () => clearInterval(t);
  }, []);
  const text = useTransition(stage, {
    from: { opacity: 0, y: 12 },
    enter: { opacity: 1, y: 0 },
    leave: { opacity: 0, y: -12, position: "absolute" as const },
  });

  return (
    <section aria-live="polite" aria-busy="true" className="space-y-8">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {files.map((p) => (
          <div key={p.id} className="relative overflow-hidden rounded-xl border border-accent/30 bg-panel">
            <Thumb picked={p} className="h-40" />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/60" />
            <div className="scan-line pointer-events-none absolute inset-x-0 top-0 h-[10%] bg-gradient-to-b from-transparent via-accent/40 to-transparent shadow-[0_0_24px_rgba(52,211,153,0.6)]" />
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <span className="relative flex size-3">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent opacity-60 motion-reduce:animate-none" />
          <span className="relative inline-flex size-3 rounded-full bg-accent" />
        </span>
        <div className="relative h-6 flex-1 overflow-hidden">
          {text((style, i) => (
            <animated.p style={{ opacity: style.opacity, transform: style.y.to((y) => `translateY(${y}px)`), position: style.position }} className="text-base">
              {STAGES[i]}…
            </animated.p>
          ))}
        </div>
      </div>
      <p className="text-sm text-muted">Usually 15 to 40 seconds. Keep this tab open.</p>
    </section>
  );
}
