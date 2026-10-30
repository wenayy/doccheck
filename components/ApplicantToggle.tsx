"use client";

import { animated, useSpring } from "@react-spring/web";
import type { ApplicantType } from "@/lib/check";

const OPTIONS: { value: ApplicantType; label: string }[] = [
  { value: "salaried", label: "Salaried" },
  { value: "self_employed", label: "Self-employed" },
];

export function ApplicantToggle({ value, onChange }: { value: ApplicantType; onChange: (v: ApplicantType) => void }) {
  const index = OPTIONS.findIndex((o) => o.value === value);
  const pill = useSpring({ x: `${index * 100}%`, config: { tension: 380, friction: 30 } });

  return (
    <div role="radiogroup" aria-label="Applicant type" className="relative grid w-full max-w-sm grid-cols-2 rounded-full border border-border bg-card p-1">
      <animated.div
        aria-hidden
        style={{ transform: pill.x.to((x) => `translateX(${x})`) }}
        className="absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-primary/15 ring-1 ring-primary/40"
      />
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`relative z-10 rounded-full px-4 py-2 text-sm font-medium transition-colors ${value === o.value ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
