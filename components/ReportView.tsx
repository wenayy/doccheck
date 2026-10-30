"use client";

import { animated, useSpring, useTrail } from "@react-spring/web";
import type { Report } from "@/lib/check";
import { Thumb, type Picked } from "./Dropzone";

const VERDICT = {
  ready: { title: "Ready to submit", tone: "text-accent", ring: "ring-accent/40 bg-accent/10" },
  needs_attention: { title: "Needs attention", tone: "text-warn", ring: "ring-warn/40 bg-warn/10" },
  not_ready: { title: "Not ready yet", tone: "text-fail", ring: "ring-fail/40 bg-fail/10" },
} as const;

const STATUS = {
  pass: { label: "Pass", dot: "bg-accent", text: "text-accent", color: "var(--accent)" },
  warn: { label: "Warning", dot: "bg-warn", text: "text-warn", color: "var(--warn)" },
  fail: { label: "Fail", dot: "bg-fail", text: "text-fail", color: "var(--fail)" },
} as const;

export function ReportView({ report, files, onReset }: { report: Report; files: Picked[]; onReset: () => void }) {
  const v = VERDICT[report.verdict];
  const hero = useSpring({ from: { opacity: 0, y: 24 }, to: { opacity: 1, y: 0 }, config: { tension: 220, friction: 24 } });
  const trail = useTrail(report.checks.length, { from: { opacity: 0, x: -16 }, to: { opacity: 1, x: 0 }, delay: 350, config: { tension: 260, friction: 26 } });

  return (
    <section aria-live="polite" className="space-y-10">
      <animated.div style={{ opacity: hero.opacity, transform: hero.y.to((y) => `translateY(${y}px)`) }} className={`flex flex-col items-center gap-6 rounded-3xl p-6 ring-1 sm:flex-row sm:p-8 ${v.ring}`}>
        <Gauge checks={report.checks} />
        <div className="text-center sm:text-left">
          <h2 className={`text-3xl font-semibold tracking-tight ${v.tone}`}>{v.title}</h2>
          <p className="mt-2 leading-relaxed text-foreground/85">{report.summary}</p>
        </div>
      </animated.div>

      {report.missing_documents.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold">Still needed</h3>
          <ul className="mt-3 space-y-2">
            {report.missing_documents.map((m) => (
              <li key={m} className="flex gap-3 rounded-xl border border-line bg-panel px-4 py-3">
                <span aria-hidden className="mt-0.5 text-warn">＋</span>
                <span>{m}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <h3 className="text-lg font-semibold">Checks</h3>
        <ul className="mt-3 space-y-2">
          {trail.map((style, i) => {
            const c = report.checks[i];
            const s = STATUS[c.status];
            return (
              <animated.li key={i} style={{ opacity: style.opacity, transform: style.x.to((x) => `translateX(${x}px)`) }} className="rounded-xl border border-line bg-panel px-4 py-3">
                <div className="flex items-center gap-3">
                  <span aria-hidden className={`size-2.5 shrink-0 rounded-full ${s.dot}`} />
                  <span className="font-medium">{c.check}</span>
                  <span className={`ml-auto shrink-0 font-mono text-xs uppercase ${s.text}`}>{s.label}</span>
                </div>
                <p className="mt-1 pl-5.5 text-sm leading-relaxed text-muted">{c.detail}</p>
              </animated.li>
            );
          })}
        </ul>
      </div>

      <div>
        <h3 className="text-lg font-semibold">What we read</h3>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          {report.documents.map((d) => {
            const picked = files[d.file_index];
            return (
              <article key={d.file_index} className="overflow-hidden rounded-2xl border border-line bg-panel">
                {picked && <Thumb picked={picked} className="h-32" />}
                <div className="p-4">
                  <p className="font-mono text-xs uppercase tracking-wider text-accent">{d.doc_type.replaceAll("_", " ")}</p>
                  <h4 className="mt-1 truncate font-medium">{d.holder_name || picked?.file.name || `File ${d.file_index + 1}`}</h4>
                  <details className="mt-3 text-sm">
                    <summary className="cursor-pointer text-muted hover:text-foreground">{d.key_fields.length} fields extracted</summary>
                    <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
                      {d.key_fields.map((f, i) => (
                        <div key={i} className="contents">
                          <dt className="text-muted">{f.label}</dt>
                          <dd className="break-words">{f.value}</dd>
                        </div>
                      ))}
                    </dl>
                  </details>
                  {d.issues.length > 0 && (
                    <ul className="mt-3 space-y-1 text-sm text-fail/90">
                      {d.issues.map((issue) => <li key={issue}>• {issue}</li>)}
                    </ul>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <button type="button" onClick={onReset} className="rounded-full bg-accent px-6 py-3 font-medium text-background hover:bg-accent/90">
          Check another set
        </button>
        <p className="text-sm text-muted">A pre-check to help you prepare. Not a loan decision.</p>
      </div>
    </section>
  );
}

const R = 52;
const CIRC = 2 * Math.PI * R;

function Gauge({ checks }: { checks: Report["checks"] }) {
  const total = Math.max(checks.length, 1);
  const counts = { pass: 0, warn: 0, fail: 0 };
  checks.forEach((c) => counts[c.status]++);
  const { p } = useSpring({ from: { p: 0 }, to: { p: 1 }, delay: 150, config: { tension: 120, friction: 26 } });

  let offset = 0;
  const arcs = (["pass", "warn", "fail"] as const).map((k) => {
    const len = (counts[k] / total) * CIRC;
    const arc = { k, len, start: offset };
    offset += len;
    return arc;
  });

  return (
    <div className="relative size-36 shrink-0">
      <svg viewBox="0 0 128 128" className="-rotate-90" role="img" aria-label={`${counts.pass} passed, ${counts.warn} warnings, ${counts.fail} failed`}>
        <circle cx="64" cy="64" r={R} fill="none" stroke="var(--line)" strokeWidth="10" />
        {arcs.map((a) => a.len > 0 && (
          <animated.circle
            key={a.k}
            cx="64" cy="64" r={R} fill="none" stroke={STATUS[a.k].color} strokeWidth="10" strokeLinecap="butt"
            strokeDasharray={p.to((t) => `${Math.max(a.len * t - 2, 0)} ${CIRC}`)}
            strokeDashoffset={p.to((t) => -a.start * t)}
          />
        ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <animated.span className="text-3xl font-semibold tabular-nums">{p.to((t) => Math.round(t * counts.pass))}</animated.span>
        <span className="text-xs text-muted">of {checks.length} passed</span>
      </div>
    </div>
  );
}
