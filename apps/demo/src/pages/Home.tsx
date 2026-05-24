import React from "react";
import { Badge, Button, Card } from "../ui";

interface HomeProps {
  onNavigate: () => void;
}

const FEATURES = [
  {
    title: "Zero-Buffer Streaming",
    description:
      "Use the Web Streams API to upload large files with a constant memory footprint. This keeps browser memory stable and avoids tab freezes even for multi-gigabyte transfers.",
    tag: "stream",
  },
  {
    title: "Adaptive Intelligent Fallbacks",
    description:
      "Automatically choose the best transport at runtime: modern fetch streaming when available, then chunked strategies when needed. You get broad compatibility without manual branching.",
    tag: "xhr",
  },
  {
    title: "Production-Grade Resilience",
    description:
      "Combine retry backoff, resumable chunk flows, and deterministic refresh semantics for predictable recovery on unstable networks. Upload control stays explicit and observable.",
    tag: "retry",
  },
  {
    title: "Explicit Runtime Controls",
    description:
      "Drive uploads with clear control semantics across methods: abort for terminal stop, pause for resumable interruption, resume for continuation, and refresh for clean restart.",
    tag: "control",
  },
  {
    title: "Deterministic Action Rebinding",
    description:
      "After retry/resume/refresh relaunches, control actions stay bound to the latest in-flight request so abort/pause always target the active upload operation.",
    tag: "lifecycle",
  },
];

const BROWSER_SUPPORT = [
  { name: "Chrome / Edge", mode: "Full Streaming", full: true },
  { name: "Firefox", mode: "Full Streaming", full: true },
  { name: "Safari", mode: "XHR Fallback", full: false },
  { name: "Legacy Browsers", mode: "XHR Fallback", full: false },
];

const DX_ITEMS = [
  "Full TypeScript support with exhaustive, strict type definitions",
  "Tiny < 5 kB gzipped React hooks package; lightweight core library",
  "First-class hooks for progress, pause/resume, and lifecycle events",
  "Deterministic refresh flow with initial-option snapshot semantics",
  "Configurable retry + backoff with explicit recovery behaviors",
  "One API over stream / stream chunked / xhr chunked execution paths",
];

const CONTROL_SEMANTICS = [
  {
    action: "abort",
    behavior:
      "Terminal stop. Ends the current upload session and does not continue with resume.",
  },
  {
    action: "pause",
    behavior:
      "Resumable stop. Moves upload into paused state where resume can continue.",
  },
  {
    action: "resume",
    behavior:
      "Continue from persisted upload progress/context (not a full restart).",
  },
  {
    action: "refresh",
    behavior:
      "Full restart from initial options snapshot. Retry/offset state is reset.",
  },
];

const FEATURE_BADGE_VARIANTS: Record<string, "info" | "error" | "success"> = {
  stream: "success",
  xhr: "info",
  retry: "error",
  control: "info",
  lifecycle: "success",
};

const CODE_SNIPPET = `import { useUniversalUpload } from 'universal-upload';

const { upload, pause, resume, refresh, status } = useUniversalUpload({
  url: '/api/upload',
  options: {
    method: 'auto',       // stream → xhr fallback
    retryCount: 3,
    onProgress: (p) => updateUI(p.percentage),
    onError: (err) => console.error(err),
  }
});

<button onClick={() => upload(file)} disabled={status === 'uploading'}>
  {status === 'idle' ? 'Start Upload' : 'Upload Again'}
</button>

<button onClick={pause} disabled={status !== 'uploading'}>
  Pause
</button>

<button onClick={resume} disabled={status !== 'paused'}>
  Resume
</button>

<button onClick={refresh} disabled={status === 'idle'}>
  Refresh
</button>`;

export const Home = ({ onNavigate }: HomeProps) => {
  return (
    <main className="max-w-[1200px] mx-auto p-8">
      {/* ── Header ─────────────────────────────────────── */}
      <header className="text-center mb-16 pt-8">
        <div className="inline-flex items-center gap-2 mb-6 px-3 py-1 rounded-full border border-blue-200 bg-blue-50 text-blue-700 text-xs font-semibold">
          Stable Release · v1.0.0
        </div>
        <h1 className="text-5xl font-extrabold mb-4 text-gray-900 tracking-tight">
          Universal Stream Uploader
        </h1>
        <p className="text-lg text-gray-500 max-w-2xl mx-auto leading-relaxed mb-8">
          High-performance file uploads for modern browsers. Constant memory
          footprint, intelligent stream-to-XHR fallbacks, and production-grade
          resilience — in under <strong className="text-gray-700">5 kB</strong>.
        </p>
        <div className="flex justify-center gap-3 flex-wrap">
          <Button onClick={onNavigate} className="px-7 py-2.5 font-semibold">
            Explore Dashboard →
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              window.open(
                "https://github.com/jdy8739/universial-upload",
                "_blank",
              )
            }
            className="px-7 py-2.5 font-semibold"
          >
            Source Code
          </Button>
        </div>
      </header>

      {/* ── Stats ──────────────────────────────────────── */}
      <section className="mb-12">
        <div className="card grid grid-cols-2 md:grid-cols-4 divide-x divide-gray-100 p-0 overflow-hidden">
          {[
            { value: "0", label: "Dependencies" },
            { value: "<5kB", label: "Gzipped" },
            { value: "3", label: "Upload Modes" },
            { value: "100%", label: "Type-safe" },
          ].map(({ value, label }) => (
            <div key={label} className="text-center py-7 px-4">
              <div className="text-3xl font-extrabold text-gray-900 mb-1">
                {value}
              </div>
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
                {label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ───────────────────────────────────── */}
      <section className="mb-12">
        <h2 className="mt-0 mb-6 text-2xl font-bold">Core Features</h2>
        <div className="grid gap-6 grid-cols-[repeat(auto-fit,minmax(300px,1fr))]">
          {FEATURES.map(({ title, description, tag }) => (
            <Card key={title}>
              <div className="flex items-center gap-2 mb-4">
                {tag && (
                  <Badge
                    variant={FEATURE_BADGE_VARIANTS[tag] || "info"}
                    className="px-2 py-1"
                  >
                    {tag}
                  </Badge>
                )}
                <Badge variant="info" className="px-2 py-1">
                  core
                </Badge>
              </div>
              <Card.Title>{title}</Card.Title>
              <Card.Description>{description}</Card.Description>
            </Card>
          ))}
        </div>
      </section>

      {/* ── Upload Controls ─────────────────────────────── */}
      <section className="mb-12">
        <h2 className="mt-0 mb-6 text-2xl font-bold">
          Upload Control Behavior
        </h2>
        <div className="card">
          <p className="text-sm text-gray-500 leading-relaxed mt-0 mb-6">
            This dashboard shows exactly how each control action behaves during
            real uploads. Use it to distinguish resumable flows from terminal
            stop/reset flows before wiring them into your app state logic.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {CONTROL_SEMANTICS.map(({ action, behavior }) => (
              <div
                key={action}
                className="rounded-lg border border-gray-100 bg-gray-50 p-4"
              >
                <div className="mb-2">
                  <Badge
                    variant={
                      action === "abort"
                        ? "error"
                        : action === "resume"
                          ? "success"
                          : "info"
                    }
                    className="px-2 py-1 uppercase"
                  >
                    {action}
                  </Badge>
                </div>
                <p className="m-0 text-sm text-gray-600 leading-relaxed">
                  {behavior}
                </p>
              </div>
            ))}
          </div>
          <div className="grid gap-3 md:grid-cols-4 mt-4">
            <div className="rounded-lg border border-red-100 bg-red-50 p-3">
              <div className="text-[11px] uppercase tracking-wider text-red-600 font-semibold mb-1">
                abort
              </div>
              <p className="m-0 text-xs text-red-700">terminal stop</p>
            </div>
            <div className="rounded-lg border border-blue-100 bg-blue-50 p-3">
              <div className="text-[11px] uppercase tracking-wider text-blue-600 font-semibold mb-1">
                pause
              </div>
              <p className="m-0 text-xs text-blue-700">resumable stop</p>
            </div>
            <div className="rounded-lg border border-green-100 bg-green-50 p-3">
              <div className="text-[11px] uppercase tracking-wider text-green-600 font-semibold mb-1">
                resume
              </div>
              <p className="m-0 text-xs text-green-700">
                continue from progress
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="text-[11px] uppercase tracking-wider text-slate-600 font-semibold mb-1">
                refresh
              </div>
              <p className="m-0 text-xs text-slate-700">full restart</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Developer Experience ────────────────────────── */}
      <section className="mb-12">
        <h2 className="mt-0 mb-6 text-2xl font-bold">Developer Experience</h2>
        <div className="grid lg:grid-cols-2 gap-6 items-stretch">
          {/* DX list */}
          <div className="card h-full">
            <p className="text-gray-500 leading-relaxed mb-6">
              Simple enough for basic uploads, powerful enough for complex
              streaming pipelines. Zero dependencies, 100% type-safe.
            </p>
            <ul className="space-y-4">
              {DX_ITEMS.map((item) => (
                <li key={item} className="flex gap-3 items-start">
                  <span className="mt-0.5 w-5 h-5 rounded-full bg-primary flex-shrink-0 flex items-center justify-center text-[10px] text-white font-bold">
                    ✓
                  </span>
                  <span className="text-sm text-gray-600 leading-relaxed">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Code block */}
          <div className="card bg-slate-950 border-slate-800 p-0 overflow-hidden h-full">
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/60" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                <div className="w-3 h-3 rounded-full bg-green-500/60" />
              </div>
              <span className="text-xs text-slate-400 font-mono">
                upload.ts
              </span>
              <div className="w-14" />
            </div>
            <pre className="px-6 py-5 text-[12.5px] leading-[1.85] overflow-x-auto m-0 bg-slate-950">
              <code>
                {CODE_SNIPPET.split("\n").map((line, i) => (
                  <div key={i} className="flex">
                    <span className="select-none w-5 text-slate-600 text-right mr-5 flex-shrink-0 tabular-nums text-[11px]">
                      {i + 1}
                    </span>
                    <span className={getLineColor(line)}>
                      {line || "\u00A0"}
                    </span>
                  </div>
                ))}
              </code>
            </pre>
          </div>
        </div>
      </section>

      {/* ── Browser Support ─────────────────────────────── */}
      <section className="mb-12">
        <h2 className="mt-0 mb-6 text-2xl font-bold">Browser Support</h2>
        <div className="card">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {BROWSER_SUPPORT.map(({ name, mode, full }) => (
              <div
                key={name}
                className={`p-4 rounded-lg border text-sm ${
                  full
                    ? "border-blue-100 bg-blue-50"
                    : "border-gray-100 bg-gray-50"
                }`}
              >
                <div className="font-bold text-gray-800 mb-1">{name}</div>
                <Badge
                  variant={full ? "success" : "info"}
                  className="px-2 py-1"
                >
                  {mode}
                </Badge>
              </div>
            ))}
          </div>
          <p className="mt-5 text-sm text-gray-400 leading-relaxed">
            Streaming fetch support is detected at runtime. Falls back to
            chunked XHR silently — no configuration, no flags, no polyfills
            required.
          </p>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────── */}
      <section className="mb-12">
        <div className="card text-center py-12">
          <h2 className="mt-0 text-3xl font-extrabold mb-3 text-gray-900">
            Ready to see it in action?
          </h2>
          <p className="text-gray-500 mb-8 max-w-md mx-auto leading-relaxed">
            The interactive dashboard provides a live environment to test
            streaming, XHR fallbacks, and error recovery.
          </p>
          <Button
            onClick={onNavigate}
            className="px-9 py-3 text-base font-semibold"
          >
            Enter Test Dashboard →
          </Button>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────── */}
      <footer className="pt-8 border-t border-gray-200 text-center text-sm text-gray-400">
        <p>
          Universal Upload © 2026 · Engineered for performance with the Web
          Streams API & TypeScript.
        </p>
      </footer>
    </main>
  );
};

function getLineColor(line: string): string {
  if (line.trim().startsWith("//")) return "text-slate-500";
  if (line.includes("import ")) return "text-violet-400";
  if (
    line.includes("'auto'") ||
    line.includes("'stream'") ||
    line.includes("'xhr chunked'")
  )
    return "text-amber-300";
  if (/^\s*(const|let|url|method|retryCount|onProgress|onError)\b/.test(line))
    return "text-sky-300";
  if (line.includes("useUniversalUpload") || line.includes("upload("))
    return "text-emerald-400";
  return "text-slate-200";
}
