"use client";

import { animated, to, useSpring, useTransition } from "@react-spring/web";
import { useState } from "react";

export type Picked = { id: string; file: File; preview: string | null };

export const MAX_FILES = 6;
export const MAX_TOTAL_BYTES = 4 * 1024 * 1024;
const ACCEPT = "application/pdf,image/jpeg,image/png,image/webp";

export function toPicked(file: File): Picked {
  return { id: crypto.randomUUID(), file, preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : null };
}

export function Dropzone({ files, onAdd, onRemove }: { files: Picked[]; onAdd: (f: File[]) => void; onRemove: (id: string) => void }) {
  const [dragging, setDragging] = useState(false);
  const zone = useSpring({ scale: dragging ? 1.02 : 1, glow: dragging ? 1 : 0, config: { tension: 300, friction: 22 } });
  const tiles = useTransition(files, {
    keys: (p) => p.id,
    from: { opacity: 0, y: 16, scale: 0.9 },
    enter: { opacity: 1, y: 0, scale: 1 },
    leave: { opacity: 0, y: -8, scale: 0.9 },
    config: { tension: 320, friction: 26 },
  });
  const total = files.reduce((s, p) => s + p.file.size, 0);
  const full = files.length >= MAX_FILES;

  return (
    <div className="space-y-4">
      <animated.label
        htmlFor="files"
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); onAdd(Array.from(e.dataTransfer.files)); }}
        style={{
          transform: zone.scale.to((s) => `scale(${s})`),
          boxShadow: zone.glow.to((g) => `0 0 ${40 * g}px rgba(52,211,153,${0.25 * g})`),
        }}
        className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed px-6 py-10 text-center transition-colors focus-within:border-accent ${dragging ? "border-accent bg-accent/5" : "border-line bg-panel hover:border-white/25"} ${full ? "pointer-events-none opacity-50" : ""}`}
      >
        <svg aria-hidden width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-accent">
          <path d="M12 16V4m0 0-4 4m4-4 4 4M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="text-base font-medium">{full ? "Maximum 6 documents" : "Drop documents here, or click to browse"}</span>
        <span className="text-sm text-muted">PAN, Aadhaar, salary slips, bank statement, ITR, GST certificate · PDF or image · 4 MB total</span>
        <input
          id="files"
          type="file"
          multiple
          accept={ACCEPT}
          disabled={full}
          className="sr-only"
          onChange={(e) => { onAdd(Array.from(e.target.files ?? [])); e.target.value = ""; }}
        />
      </animated.label>

      {files.length > 0 && (
        <>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {tiles((style, p) => (
              <animated.li style={{ opacity: style.opacity, transform: to([style.y, style.scale], (y, s) => `translateY(${y}px) scale(${s})`) }} className="group relative overflow-hidden rounded-xl border border-line bg-panel">
                <Thumb picked={p} />
                <div className="flex items-center justify-between gap-2 px-3 py-2">
                  <span className="truncate text-xs text-muted" title={p.file.name}>{p.file.name}</span>
                  <button type="button" onClick={() => onRemove(p.id)} aria-label={`Remove ${p.file.name}`} className="rounded-md px-1.5 text-muted hover:bg-white/10 hover:text-foreground">✕</button>
                </div>
              </animated.li>
            ))}
          </ul>
          <p className={`text-sm ${total > MAX_TOTAL_BYTES ? "text-fail" : "text-muted"}`}>
            {files.length} of {MAX_FILES} files · {(total / 1024 / 1024).toFixed(1)} MB of 4 MB
            {total > MAX_TOTAL_BYTES && " · over the limit, remove or compress a file"}
          </p>
        </>
      )}
    </div>
  );
}

export function Thumb({ picked, className = "h-28" }: { picked: Picked; className?: string }) {
  return picked.preview ? (
    // eslint-disable-next-line @next/next/no-img-element -- local blob URL, next/image cannot optimize it
    <img src={picked.preview} alt="" className={`w-full object-cover object-top ${className}`} />
  ) : (
    <div className={`flex w-full items-center justify-center bg-white/5 font-mono text-sm text-muted ${className}`}>PDF</div>
  );
}
