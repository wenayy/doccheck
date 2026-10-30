"use client";

import { animated, useSpring, useTrail } from "@react-spring/web";
import { ArrowLeft, CircleAlert, CircleCheck, CircleX, FilePlus2, RotateCcw } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Report } from "@/lib/check";
import { Thumb, type Picked } from "./Dropzone";

type Status = Report["checks"][number]["status"];

const VERDICT = {
  ready: { title: "Ready to submit", line: "Everything we checked looks good.", tone: "text-success", card: "border-success/40 bg-success/5" },
  needs_attention: { title: "Almost there", line: "A few things need a second look before you apply.", tone: "text-warning", card: "border-warning/40 bg-warning/5" },
  not_ready: { title: "Not ready yet", line: "Fix the items below before you apply.", tone: "text-destructive", card: "border-destructive/40 bg-destructive/5" },
} as const;

const STATUS: Record<Status, { label: string; Icon: typeof CircleCheck; text: string; badge: string; color: string }> = {
  fail: { label: "Must fix", Icon: CircleX, text: "text-destructive", badge: "border-destructive/40 bg-destructive/10 text-destructive", color: "var(--destructive)" },
  warn: { label: "Review", Icon: CircleAlert, text: "text-warning", badge: "border-warning/40 bg-warning/10 text-warning", color: "var(--warning)" },
  pass: { label: "Passed", Icon: CircleCheck, text: "text-success", badge: "border-success/40 bg-success/10 text-success", color: "var(--success)" },
};

const ORDER: Status[] = ["fail", "warn", "pass"];

export function ReportView({ report, files, onBack, onReset }: { report: Report; files: Picked[]; onBack: () => void; onReset: () => void }) {
  const v = VERDICT[report.verdict];
  const counts = { fail: 0, warn: 0, pass: 0 };
  report.checks.forEach((c) => counts[c.status]++);
  const issues = report.checks.filter((c) => c.status !== "pass").sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status));
  const passed = report.checks.filter((c) => c.status === "pass");

  const hero = useSpring({ from: { opacity: 0, y: 24 }, to: { opacity: 1, y: 0 }, config: { tension: 220, friction: 24 } });
  const trail = useTrail(report.missing_documents.length, { from: { opacity: 0, x: -12 }, to: { opacity: 1, x: 0 }, delay: 300 });

  return (
    <section aria-live="polite" className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" onClick={onBack} className="-ml-2.5">
          <ArrowLeft data-icon="inline-start" /> Back to my documents
        </Button>
        <Button variant="outline" onClick={onReset}>
          <RotateCcw data-icon="inline-start" /> New check
        </Button>
      </div>

      <animated.div style={{ opacity: hero.opacity, transform: hero.y.to((y) => `translateY(${y}px)`) }}>
        <Card className={v.card}>
          <CardContent className="flex flex-col items-center gap-6 sm:flex-row">
            <Gauge counts={counts} total={report.checks.length} />
            <div className="space-y-3 text-center sm:text-left">
              <div>
                <h2 className={`text-3xl font-semibold tracking-tight ${v.tone}`}>{v.title}</h2>
                <p className="text-muted-foreground">{v.line}</p>
              </div>
              <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
                {ORDER.map((s) => {
                  const { Icon, label, badge } = STATUS[s];
                  return (
                    <Badge key={s} variant="outline" className={badge}>
                      <Icon /> {counts[s]} {label.toLowerCase()}
                    </Badge>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </animated.div>

      <Card>
        <CardHeader>
          <CardTitle>In short</CardTitle>
          <CardDescription className="text-base leading-relaxed text-foreground/85">{report.summary}</CardDescription>
        </CardHeader>
        {report.missing_documents.length > 0 && (
          <CardContent className="space-y-3">
            <p className="text-sm font-medium">Upload these to complete your file</p>
            <ol className="space-y-2">
              {trail.map((style, i) => (
                <animated.li
                  key={i}
                  style={{ opacity: style.opacity, transform: style.x.to((x) => `translateX(${x}px)`) }}
                  className="flex gap-3 rounded-lg bg-muted px-3 py-2.5 text-sm"
                >
                  <FilePlus2 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                  {report.missing_documents[i]}
                </animated.li>
              ))}
            </ol>
          </CardContent>
        )}
      </Card>

      <Tabs defaultValue={issues.length ? "issues" : "passed"}>
        <TabsList className="w-full">
          <TabsTrigger value="issues">Issues ({issues.length})</TabsTrigger>
          <TabsTrigger value="passed">Passed ({passed.length})</TabsTrigger>
          <TabsTrigger value="documents">Documents ({report.documents.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="issues">
          {issues.length ? <CheckList checks={issues} /> : <Empty text="No issues found." />}
        </TabsContent>
        <TabsContent value="passed">
          {passed.length ? <CheckList checks={passed} /> : <Empty text="No checks passed yet." />}
        </TabsContent>
        <TabsContent value="documents" className="grid gap-4 pt-2 sm:grid-cols-2">
          {report.documents.map((d) => {
            const picked = files[d.file_index];
            return (
              <Card key={d.file_index} className="overflow-hidden pt-0">
                {picked && <Thumb picked={picked} className="h-32" />}
                <CardHeader>
                  <Badge variant="secondary" className="w-fit font-mono uppercase">{d.doc_type.replaceAll("_", " ")}</Badge>
                  <CardTitle className="truncate">{d.holder_name || picked?.file.name || `File ${d.file_index + 1}`}</CardTitle>
                  {d.document_date && <CardDescription>Dated {d.document_date}</CardDescription>}
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {d.issues.length > 0 && (
                    <ul className="space-y-1.5">
                      {d.issues.map((issue) => (
                        <li key={issue} className="flex gap-2 text-destructive">
                          <CircleX className="mt-0.5 size-4 shrink-0" aria-hidden /> {issue}
                        </li>
                      ))}
                    </ul>
                  )}
                  <Accordion type="single" collapsible>
                    <AccordionItem value="fields" className="border-none">
                      <AccordionTrigger className="py-1 text-muted-foreground">{d.key_fields.length} fields we read</AccordionTrigger>
                      <AccordionContent>
                        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
                          {d.key_fields.map((f, i) => (
                            <div key={i} className="contents">
                              <dt className="text-muted-foreground">{f.label}</dt>
                              <dd className="break-words">{f.value}</dd>
                            </div>
                          ))}
                        </dl>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>
      </Tabs>

      <p className="text-center text-sm text-muted-foreground">A pre-check to help you prepare. Not a loan decision.</p>
    </section>
  );
}

function CheckList({ checks }: { checks: Report["checks"] }) {
  return (
    <Card className="py-0">
      <Accordion type="multiple" defaultValue={checks.flatMap((c, i) => (c.status === "fail" ? [String(i)] : []))} className="px-4">
        {checks.map((c, i) => {
          const { Icon, label, text, badge } = STATUS[c.status];
          return (
            <AccordionItem key={i} value={String(i)}>
              <AccordionTrigger className="items-center gap-3 hover:no-underline">
                <span className="flex flex-1 items-center gap-3 text-left">
                  <Icon className={`size-5 shrink-0 ${text}`} aria-hidden />
                  <span className="font-medium">{c.check}</span>
                </span>
                <Badge variant="outline" className={`shrink-0 ${badge}`}>{label}</Badge>
              </AccordionTrigger>
              <AccordionContent className="pl-8 text-muted-foreground leading-relaxed">{c.detail}</AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </Card>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">{text}</p>;
}

const R = 52;
const CIRC = 2 * Math.PI * R;

function Gauge({ counts, total }: { counts: Record<Status, number>; total: number }) {
  const { p } = useSpring({ from: { p: 0 }, to: { p: 1 }, delay: 150, config: { tension: 120, friction: 26 } });
  let offset = 0;
  const arcs = (["pass", "warn", "fail"] as const).map((k) => {
    const len = (counts[k] / Math.max(total, 1)) * CIRC;
    const arc = { k, len, start: offset };
    offset += len;
    return arc;
  });

  return (
    <div className="relative size-36 shrink-0">
      <svg viewBox="0 0 128 128" className="-rotate-90" role="img" aria-label={`${counts.pass} of ${total} checks passed`}>
        <circle cx="64" cy="64" r={R} fill="none" stroke="var(--border)" strokeWidth="10" />
        {arcs.map((a) => a.len > 0 && (
          <animated.circle
            key={a.k}
            cx="64" cy="64" r={R} fill="none" stroke={STATUS[a.k].color} strokeWidth="10"
            strokeDasharray={p.to((t) => `${Math.max(a.len * t - 2, 0)} ${CIRC}`)}
            strokeDashoffset={p.to((t) => -a.start * t)}
          />
        ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <animated.span className="text-3xl font-semibold tabular-nums">{p.to((t) => Math.round(t * counts.pass))}</animated.span>
        <span className="text-xs text-muted-foreground">of {total} passed</span>
      </div>
    </div>
  );
}
