"use client";

import { Fragment, useState } from "react";
import type { ApplicantType, Report } from "@/lib/check";

const MAX_TOTAL_BYTES = 4 * 1024 * 1024;

const VERDICT_STYLE: Record<Report["verdict"], { label: string; className: string }> = {
  ready: { label: "Ready to submit", className: "bg-emerald-50 text-emerald-900 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-100 dark:border-emerald-800" },
  needs_attention: { label: "Needs attention", className: "bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-100 dark:border-amber-800" },
  not_ready: { label: "Not ready", className: "bg-red-50 text-red-900 border-red-300 dark:bg-red-950 dark:text-red-100 dark:border-red-800" },
};

const STATUS_STYLE = {
  pass: "text-emerald-700 dark:text-emerald-400",
  warn: "text-amber-700 dark:text-amber-400",
  fail: "text-red-700 dark:text-red-400",
} as const;

export default function Home() {
  const [applicantType, setApplicantType] = useState<ApplicantType>("salaried");
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [report, setReport] = useState<Report | null>(null);

  const totalBytes = files.reduce((sum, f) => sum + f.size, 0);
  const tooLarge = totalBytes > MAX_TOTAL_BYTES;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setReport(null);
    const form = new FormData();
    form.set("applicant_type", applicantType);
    files.forEach((f) => form.append("files", f));
    try {
      const res = await fetch("/api/check", { method: "POST", body: form });
      const body = await res.json().catch(() => ({ error: "Check failed. Try again." }));
      if (!res.ok) setError(body.error ?? "Check failed. Try again.");
      else setReport(body as Report);
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:py-16">
      <h1 className="text-3xl font-semibold tracking-tight">DocCheck</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        Check your loan documents before you submit them. Find missing papers, name mismatches, and outdated statements in under a minute.
      </p>

      <form onSubmit={submit} className="mt-8 space-y-6">
        <fieldset>
          <legend className="font-medium">I am applying as</legend>
          <div className="mt-2 flex gap-3">
            {(["salaried", "self_employed"] as const).map((type) => (
              <label key={type} className="flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-300 px-4 py-2 has-checked:border-zinc-900 has-checked:bg-zinc-100 dark:border-zinc-700 dark:has-checked:border-zinc-100 dark:has-checked:bg-zinc-900">
                <input type="radio" name="applicant_type" value={type} checked={applicantType === type} onChange={() => setApplicantType(type)} />
                {type === "salaried" ? "Salaried" : "Self-employed / business"}
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label htmlFor="files" className="font-medium">Documents</label>
          <p id="files-hint" className="text-sm text-zinc-600 dark:text-zinc-400">
            PAN, Aadhaar, salary slips, bank statements, ITR, GST certificate. PDF, JPG, PNG, or WEBP. Up to 6 files, 4 MB total.
          </p>
          <input
            id="files"
            type="file"
            multiple
            accept="application/pdf,image/jpeg,image/png,image/webp"
            aria-describedby="files-hint"
            onChange={(e) => setFiles(Array.from(e.target.files ?? []).slice(0, 6))}
            className="mt-2 block w-full text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-zinc-900 file:px-4 file:py-2 file:text-white dark:file:bg-zinc-100 dark:file:text-zinc-900"
          />
          {files.length > 0 && (
            <p className={`mt-2 text-sm ${tooLarge ? "text-red-700 dark:text-red-400" : "text-zinc-600 dark:text-zinc-400"}`}>
              {files.length} file{files.length > 1 ? "s" : ""}, {(totalBytes / 1024 / 1024).toFixed(1)} MB{tooLarge ? ". Over the 4 MB limit: compress or remove a file." : ""}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || files.length === 0 || tooLarge}
          className="rounded-lg bg-zinc-900 px-6 py-3 font-medium text-white disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {loading ? "Checking… (up to a minute)" : "Check documents"}
        </button>

        <p className="text-xs text-zinc-500">
          Files are processed in memory and never stored by DocCheck. Identity numbers are masked in the report. This is a pre-check, not a loan decision.
        </p>
      </form>

      <div aria-live="polite">
        {error && <p className="mt-8 rounded-lg border border-red-300 bg-red-50 p-4 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100">{error}</p>}
        {report && <ReportView report={report} files={files} />}
      </div>
    </main>
  );
}

function ReportView({ report, files }: { report: Report; files: File[] }) {
  const verdict = VERDICT_STYLE[report.verdict];
  return (
    <section className="mt-10 space-y-8">
      <div className={`rounded-lg border p-4 ${verdict.className}`}>
        <h2 className="text-xl font-semibold">{verdict.label}</h2>
        <p className="mt-1">{report.summary}</p>
      </div>

      {report.missing_documents.length > 0 && (
        <div>
          <h3 className="font-semibold">Missing documents</h3>
          <ul className="mt-2 list-disc pl-5">
            {report.missing_documents.map((m) => <li key={m}>{m}</li>)}
          </ul>
        </div>
      )}

      <div>
        <h3 className="font-semibold">Checks</h3>
        <ul className="mt-2 divide-y divide-zinc-200 dark:divide-zinc-800">
          {report.checks.map((c, i) => (
            <li key={i} className="py-2">
              <span className={`mr-2 font-mono text-sm uppercase ${STATUS_STYLE[c.status]}`}>{c.status}</span>
              <span className="font-medium">{c.check}</span>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">{c.detail}</p>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="font-semibold">Documents</h3>
        <div className="mt-2 space-y-4">
          {report.documents.map((d) => (
            <article key={d.file_index} className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
              <h4 className="font-medium">
                {files[d.file_index]?.name ?? `File ${d.file_index}`}{" "}
                <span className="text-sm font-normal text-zinc-500">· {d.doc_type.replaceAll("_", " ")}</span>
              </h4>
              <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                {d.holder_name && (<><dt className="text-zinc-500">Name</dt><dd>{d.holder_name}</dd></>)}
                {d.document_date && (<><dt className="text-zinc-500">Date</dt><dd>{d.document_date}</dd></>)}
                {d.key_fields.map((f, i) => (<Fragment key={i}><dt className="text-zinc-500">{f.label}</dt><dd>{f.value}</dd></Fragment>))}
              </dl>
              {d.issues.length > 0 && (
                <ul className="mt-2 list-disc pl-5 text-sm text-red-700 dark:text-red-400">
                  {d.issues.map((issue) => <li key={issue}>{issue}</li>)}
                </ul>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
