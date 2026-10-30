"use client";

import { animated, Globals, useReducedMotion, useSpring } from "@react-spring/web";
import { useEffect, useState } from "react";
import { ApplicantToggle } from "@/components/ApplicantToggle";
import { Dropzone, MAX_FILES, MAX_TOTAL_BYTES, toPicked, type Picked } from "@/components/Dropzone";
import { ReportView } from "@/components/ReportView";
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

  function addFiles(incoming: File[]) {
    setError("");
    setFiles((prev) => [...prev, ...incoming.slice(0, MAX_FILES - prev.length).map(toPicked)]);
  }

  function removeFile(id: string) {
    setFiles((prev) => {
      const gone = prev.find((p) => p.id === id);
      if (gone?.preview) URL.revokeObjectURL(gone.preview);
      return prev.filter((p) => p.id !== id);
    });
  }

  function reset() {
    files.forEach((p) => p.preview && URL.revokeObjectURL(p.preview));
    setFiles([]);
    setError("");
    setPhase({ name: "idle" });
  }

  async function check(picked: Picked[], type: ApplicantType) {
    setError("");
    setPhase({ name: "checking" });
    window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
    const form = new FormData();
    form.set("applicant_type", type);
    picked.forEach((p) => form.append("files", p.file));
    try {
      const res = await fetch("/api/check", { method: "POST", body: form });
      const body = await res.json().catch(() => ({ error: "Check failed. Try again." }));
      if (res.ok) setPhase({ name: "done", report: body as Report });
      else {
        setError(body.error ?? "Check failed. Try again.");
        setPhase({ name: "idle" });
      }
    } catch {
      setError("Network error. Check your connection and try again.");
      setPhase({ name: "idle" });
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
          <span aria-hidden className="grid size-8 place-items-center rounded-lg bg-accent/15 text-accent ring-1 ring-accent/40">✓</span>
          DocCheck
        </button>
        <span className="rounded-full border border-line px-3 py-1 text-xs text-muted">Free · No sign-up</span>
      </header>

      <FadeIn key={phase.name}>
        {phase.name === "idle" && (
          <div className="space-y-10">
            <div>
              <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
                Know if your loan documents will pass{" "}
                <span className="bg-gradient-to-r from-accent to-sky-400 bg-clip-text text-transparent">before the bank does.</span>
              </h1>
              <p className="mt-4 max-w-2xl text-lg text-muted">
                Upload your KYC and income papers. Get missing documents, name mismatches, stale statements, and salary gaps flagged in under a minute.
              </p>
              <ul className="mt-6 flex flex-wrap gap-2 text-sm">
                {["Files never stored", "ID numbers masked", "~30 second check"].map((t) => (
                  <li key={t} className="rounded-full border border-line bg-panel px-3 py-1 text-foreground/80">{t}</li>
                ))}
              </ul>
            </div>

            <form
              onSubmit={(e) => { e.preventDefault(); check(files, applicantType); }}
              className="space-y-6 rounded-3xl border border-line bg-panel p-5 backdrop-blur sm:p-8"
            >
              <div className="space-y-3">
                <p className="text-sm font-medium text-muted">I am applying as</p>
                <ApplicantToggle value={applicantType} onChange={setApplicantType} />
              </div>
              <Dropzone files={files} onAdd={addFiles} onRemove={removeFile} />
              {error && <p role="alert" className="rounded-xl border border-fail/40 bg-fail/10 px-4 py-3 text-sm text-fail">{error}</p>}
              <div className="flex flex-wrap items-center gap-4">
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="rounded-full bg-accent px-7 py-3 font-medium text-background shadow-[0_0_30px_rgba(52,211,153,0.35)] transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-30 disabled:shadow-none"
                >
                  Check documents
                </button>
                <button type="button" onClick={trySamples} className="text-sm text-muted underline-offset-4 hover:text-foreground hover:underline">
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
                <li key={title} className="rounded-2xl border border-line p-5">
                  <span className="font-mono text-xs text-accent">0{i + 1}</span>
                  <p className="mt-2 font-medium">{title}</p>
                  <p className="mt-1 text-sm text-muted">{body}</p>
                </li>
              ))}
            </ol>
          </div>
        )}

        {phase.name === "checking" && (
          <div className="space-y-6">
            <h1 className="text-3xl font-semibold tracking-tight">Checking {files.length} document{files.length > 1 ? "s" : ""}</h1>
            <Scanner files={files} />
          </div>
        )}

        {phase.name === "done" && <ReportView report={phase.report} files={files} onReset={reset} />}
      </FadeIn>

      <footer className="mt-20 border-t border-line pt-6 text-xs leading-relaxed text-muted">
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
