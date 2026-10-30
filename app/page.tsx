"use client";

import { animated, Globals, useReducedMotion, useSpring } from "@react-spring/web";
import { useCallback, useEffect, useRef, useState } from "react";
import { ApplicantToggle } from "@/components/ApplicantToggle";
import { ACCEPTED_TYPES, Dropzone, filesFrom, MAX_FILES, MAX_TOTAL_BYTES, toPicked, type Picked } from "@/components/Dropzone";
import { ReportView } from "@/components/ReportView";
import { Button } from "@/components/ui/button";
import { Scanner } from "@/components/Scanner";
import type { ApplicantType, Report } from "@/lib/check";

type Phase = { name: "idle" } | { name: "checking" } | { name: "done"; report: Report };

const SAMPLES = ["sample-payslip.png", "sample-bank-statement.png"];

export default function Home() {
  const reduced = useReducedMotion();
  useEffect(() => Globals.assign({ skipAnimation: !!reduced }), [reduced]);

  const [applicantType, setApplicantType] = useState<ApplicantType>("salaried");
  const [files, setFiles] = useState<Picked[]>([]);
  const [phase, setPhase] = useState<Phase>({ name: "idle" });
  const [error, setError] = useState("");

  const totalBytes = files.reduce((s, p) => s + p.file.size, 0);
  const canSubmit = files.length > 0 && totalBytes <= MAX_TOTAL_BYTES;

  const addFiles = useCallback((incoming: File[]) => {
    // Empty type is allowed: some drag sources omit it, and the server checks the bytes anyway.
    const ok = incoming.filter((f) => f.type === "" || ACCEPTED_TYPES.includes(f.type));
    const rejected = incoming.filter((f) => !ok.includes(f));
    setError(rejected.length ? `Skipped ${rejected.map((f) => f.name).join(", ")}: only PDF, JPG, PNG, or WEBP files work.` : "");
    setFiles((prev) => [...prev, ...ok.slice(0, MAX_FILES - prev.length).map(toPicked)]);
  }, []);

  const [dragging, setDragging] = useState(false);
  const dragDepth = useRef(0);
  useEffect(() => {
    const idle = phase.name === "idle";
    const onEnter = (e: DragEvent) => {
      e.preventDefault();
      dragDepth.current++;
      if (idle) setDragging(true);
    };
    const onOver = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = idle ? "copy" : "none";
    };
    const onLeave = () => {
      dragDepth.current = Math.max(0, dragDepth.current - 1);
      if (dragDepth.current === 0) setDragging(false);
    };
    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      dragDepth.current = 0;
      setDragging(false);
      if (!idle || !e.dataTransfer) return;
      const dropped = filesFrom(e.dataTransfer);
      if (dropped.length > 0) addFiles(dropped);
      else setError("That app sent a link, not the file itself. Drag the file from Finder, or click the upload box to browse.");
    };
    window.addEventListener("dragenter", onEnter);
    window.addEventListener("dragover", onOver);
    window.addEventListener("dragleave", onLeave);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragenter", onEnter);
      window.removeEventListener("dragover", onOver);
      window.removeEventListener("dragleave", onLeave);
      window.removeEventListener("drop", onDrop);
    };
  }, [phase.name, addFiles]);

  function removeFile(id: string) {
    setFiles((prev) => {
      const gone = prev.find((p) => p.id === id);
      if (gone?.preview) URL.revokeObjectURL(gone.preview);
      return prev.filter((p) => p.id !== id);
    });
  }

  // Checking and results live on a pushed history entry, so the browser Back button returns to the upload form with files kept.
  const inFlight = useRef<AbortController | null>(null);
  useEffect(() => {
    const onPop = () => {
      inFlight.current?.abort();
      setPhase({ name: "idle" });
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const backToUpload = () => (history.state?.doccheck ? history.back() : setPhase({ name: "idle" }));

  function reset() {
    files.forEach((p) => p.preview && URL.revokeObjectURL(p.preview));
    setFiles([]);
    setError("");
    backToUpload();
  }

  async function check(picked: Picked[], type: ApplicantType) {
    setError("");
    setPhase({ name: "checking" });
    if (!history.state?.doccheck) history.pushState({ doccheck: true }, "");
    window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
    const form = new FormData();
    form.set("applicant_type", type);
    picked.forEach((p) => form.append("files", p.file));
    const controller = new AbortController();
    inFlight.current = controller;
    try {
      const res = await fetch("/api/check", { method: "POST", body: form, signal: controller.signal });
      const body = await res.json().catch(() => ({ error: "Check failed. Try again." }));
      if (res.ok) setPhase({ name: "done", report: body as Report });
      else {
        setError(body.error ?? "Check failed. Try again.");
        backToUpload();
      }
    } catch {
      if (controller.signal.aborted) return;
      setError("Network error. Check your connection and try again.");
      backToUpload();
    }
  }

  async function trySamples() {
    const loaded = await Promise.all(
      SAMPLES.map(async (name) => new File([await (await fetch(`/samples/${name}`)).blob()], name, { type: "image/png" })),
    );
    files.forEach((p) => p.preview && URL.revokeObjectURL(p.preview));
    const picked = loaded.map(toPicked);
    setFiles(picked);
    setApplicantType("salaried");
    check(picked, "salaried");
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-24 pt-8 sm:pt-12">
      <header className="flex items-center justify-between">
        <button type="button" onClick={reset} className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <span aria-hidden className="grid size-8 place-items-center rounded-lg bg-primary/15 text-primary ring-1 ring-primary/40">✓</span>
          DocCheck
        </button>
        <span className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">Free · No sign-up</span>
      </header>

      <FadeIn key={phase.name}>
        {phase.name === "idle" && (
          <div className="space-y-10">
            <div>
              <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
                Know if your loan documents will pass{" "}
                <span className="bg-gradient-to-r from-primary to-sky-400 bg-clip-text text-transparent">before the bank does.</span>
              </h1>
              <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
                Upload your KYC and income papers. Get missing documents, name mismatches, stale statements, and salary gaps flagged in under a minute.
              </p>
              <ul className="mt-6 flex flex-wrap gap-2 text-sm">
                {["Files never stored", "ID numbers masked", "~30 second check"].map((t) => (
                  <li key={t} className="rounded-full border border-border bg-card px-3 py-1 text-foreground/80">{t}</li>
                ))}
              </ul>
            </div>

            <form
              onSubmit={(e) => { e.preventDefault(); check(files, applicantType); }}
              className="space-y-6 rounded-3xl border border-border bg-card p-5 backdrop-blur sm:p-8"
            >
              <div className="space-y-3">
                <p className="text-sm font-medium text-muted-foreground">I am applying as</p>
                <ApplicantToggle value={applicantType} onChange={setApplicantType} />
              </div>
              <Dropzone files={files} dragging={dragging} onAdd={addFiles} onRemove={removeFile} />
              {error && <p role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>}
              <div className="flex flex-wrap items-center gap-4">
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="rounded-full bg-primary px-7 py-3 font-medium text-primary-foreground shadow-[0_0_30px_rgba(52,211,153,0.35)] transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-30 disabled:shadow-none"
                >
                  Check documents
                </button>
                <button type="button" onClick={trySamples} className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
                  No documents handy? Try sample documents →
                </button>
              </div>
            </form>

            <ol className="grid gap-4 sm:grid-cols-3">
              {[
                ["Upload", "Drop up to 6 PDFs or photos of your documents."],
                ["Cross-check", "Names, dates, and amounts are compared across every document."],
                ["Fix before applying", "See exactly what is missing or inconsistent."],
              ].map(([title, body], i) => (
                <li key={title} className="rounded-2xl border border-border p-5">
                  <span className="font-mono text-xs text-primary">0{i + 1}</span>
                  <p className="mt-2 font-medium">{title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{body}</p>
                </li>
              ))}
            </ol>
          </div>
        )}

        {phase.name === "checking" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-3">
              <h1 className="text-3xl font-semibold tracking-tight">Checking {files.length} document{files.length > 1 ? "s" : ""}</h1>
              <Button variant="ghost" onClick={backToUpload}>Cancel</Button>
            </div>
            <Scanner files={files} />
          </div>
        )}

        {phase.name === "done" && <ReportView report={phase.report} files={files} onBack={backToUpload} onReset={reset} />}
      </FadeIn>

      {dragging && (
        <div aria-hidden className="pointer-events-none fixed inset-0 z-50 grid place-items-center bg-background/80 backdrop-blur-sm">
          <div className="rounded-3xl border-2 border-dashed border-primary px-12 py-10 text-center shadow-[0_0_60px_rgba(52,211,153,0.3)]">
            <p className="text-2xl font-semibold text-primary">Drop to add documents</p>
            <p className="mt-2 text-sm text-muted-foreground">Anywhere on the page works</p>
          </div>
        </div>
      )}

      <footer className="mt-20 border-t border-border pt-6 text-xs leading-relaxed text-muted-foreground">
        Documents are processed in memory and sent to an AI model for reading. DocCheck does not store them. This is a preparation aid, not a credit decision.
      </footer>
    </main>
  );
}

function FadeIn({ children }: { children: React.ReactNode }) {
  const s = useSpring({ from: { opacity: 0, y: 20 }, to: { opacity: 1, y: 0 }, config: { tension: 240, friction: 26 } });
  return (
    <animated.div style={{ opacity: s.opacity, transform: s.y.to((y) => `translateY(${y}px)`) }} className="mt-12 sm:mt-16">
      {children}
    </animated.div>
  );
}
