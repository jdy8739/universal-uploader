import React from "react";
import { Badge, Button, Card } from "../ui";
import { useI18n } from "../i18n";

interface HomeProps {
  onNavigate: () => void;
}

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
  const { t, language, setLanguage } = useI18n();

  return (
    <main className="max-w-[1200px] mx-auto p-8">
      {/* ── Language Toggle ──────────────────────────────── */}
      <div className="flex justify-end mb-6">
        <div className="flex gap-2">
          <button
            onClick={() => setLanguage("en")}
            className={`px-3 py-1 rounded text-sm font-medium transition ${
              language === "en"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            English
          </button>
          <button
            onClick={() => setLanguage("ko")}
            className={`px-3 py-1 rounded text-sm font-medium transition ${
              language === "ko"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            한국어
          </button>
        </div>
      </div>

      {/* ── Header ─────────────────────────────────────── */}
      <header className="text-center mb-16 pt-8">
        <div className="inline-flex items-center gap-2 mb-6 px-3 py-1 rounded-full border border-blue-200 bg-blue-50 text-blue-700 text-xs font-semibold">
          {t("home.header.badge")}
        </div>
        <h1 className="text-5xl font-extrabold mb-4 text-gray-900 tracking-tight">
          {t("home.header.title")}
        </h1>
        <p className="text-lg text-gray-500 max-w-2xl mx-auto leading-relaxed mb-8">
          {language === "en" ? (
            <>
              High-performance file uploads for modern browsers. Constant memory
              footprint, intelligent stream-to-XHR fallbacks, and
              production-grade resilience — in under{" "}
              <strong className="text-gray-700">10 kB</strong>.
            </>
          ) : (
            <>
              현대 브라우저를 위한 고성능 파일 업로드. 일정한 메모리 사용량,
              지능형 스트림-XHR 폴백, 프로덕션 등급의 복원력 —{" "}
              <strong className="text-gray-700">10 kB 이하</strong>.
            </>
          )}
        </p>
        <div className="flex justify-center gap-2 flex-wrap">
          {process.env.NODE_ENV === "development" && (
            <Button
              onClick={onNavigate}
              className="px-6 py-2.5 font-semibold bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-md hover:shadow-lg transition-all"
            >
              {t("home.header.exploreDashboard")}
            </Button>
          )}
          <a
            href="https://www.npmjs.com/package/@universal-uploader/core"
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-2.5 font-semibold rounded-lg bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 hover:border-red-300 transition-all shadow-sm hover:shadow-md inline-flex items-center gap-2"
          >
            <span>@universal-uploader/core</span>
            <span className="text-lg">↗</span>
          </a>
          <a
            href="https://www.npmjs.com/package/@universal-uploader/react"
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-2.5 font-semibold rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 hover:border-blue-300 transition-all shadow-sm hover:shadow-md inline-flex items-center gap-2"
          >
            <span>@universal-uploader/react</span>
            <span className="text-lg">↗</span>
          </a>
          <Button
            variant="outline"
            onClick={() =>
              window.open(
                "https://github.com/jdy8739/universial-upload",
                "_blank",
              )
            }
            className="px-6 py-2.5 font-semibold"
          >
            {t("home.header.sourceCode")} ↗
          </Button>
        </div>
      </header>

      {/* ── Stats ──────────────────────────────────────── */}
      <section className="mb-12">
        <div className="card grid grid-cols-2 md:grid-cols-4 divide-x divide-gray-100 p-0 overflow-hidden">
          {[
            {
              value: t("home.stats.dependencies.value"),
              label: t("home.stats.dependencies.label"),
            },
            {
              value: t("home.stats.gzipped.value"),
              label: t("home.stats.gzipped.label"),
            },
            {
              value: t("home.stats.uploadModes.value"),
              label: t("home.stats.uploadModes.label"),
            },
            {
              value: t("home.stats.typeSafe.value"),
              label: t("home.stats.typeSafe.label"),
            },
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
        <h2 className="mt-0 mb-6 text-2xl font-bold">
          {t("home.features.title")}
        </h2>
        <div className="grid gap-6 grid-cols-[repeat(auto-fit,minmax(300px,1fr))]">
          {(t("home.features.items") as any).map(
            (feature: any, idx: number) => (
              <Card key={idx}>
                <div className="flex items-center gap-2 mb-4">
                  {feature.tag && (
                    <Badge
                      variant={FEATURE_BADGE_VARIANTS[feature.tag] || "info"}
                      className="px-2 py-1"
                    >
                      {feature.tag}
                    </Badge>
                  )}
                  <Badge variant="info" className="px-2 py-1">
                    core
                  </Badge>
                </div>
                <Card.Title>{feature.title}</Card.Title>
                <Card.Description>{feature.description}</Card.Description>
              </Card>
            ),
          )}
        </div>
      </section>

      {/* ── Quick Start / Installation ───────────────────────── */}
      <section className="mb-12">
        <h2 className="mt-0 mb-6 text-2xl font-bold">Quick Start</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {/* Core Package */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">
                @universal-uploader/core
              </h3>
              <a
                href="https://www.npmjs.com/package/@universal-uploader/core"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded font-medium hover:bg-red-200 transition"
              >
                NPM ↗
              </a>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Core upload engine with three strategies
            </p>
            <pre className="bg-slate-950 text-slate-100 p-3 rounded text-xs overflow-x-auto mb-3">
              <code>npm install @universal-uploader/core</code>
            </pre>
            <pre className="bg-slate-950 text-slate-100 p-3 rounded text-xs overflow-x-auto">
              <code className="text-emerald-400">{`const { upload } = require('@universal-uploader/core');\nawait upload('/api/upload', file);`}</code>
            </pre>
          </div>

          {/* React Package */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">
                @universal-uploader/react
              </h3>
              <a
                href="https://www.npmjs.com/package/@universal-uploader/react"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded font-medium hover:bg-blue-200 transition"
              >
                NPM ↗
              </a>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              React Hook wrapper for seamless integration
            </p>
            <pre className="bg-slate-950 text-slate-100 p-3 rounded text-xs overflow-x-auto mb-3">
              <code>
                npm install @universal-uploader/react @universal-uploader/core
              </code>
            </pre>
            <pre className="bg-slate-950 text-slate-100 p-3 rounded text-xs overflow-x-auto">
              <code className="text-emerald-400">{`const { upload, progress } = useUniversalUpload({\n  url: '/api/upload'\n});`}</code>
            </pre>
          </div>
        </div>
      </section>

      {/* ── Upload Controls ─────────────────────────────── */}
      <section className="mb-12">
        <h2 className="mt-0 mb-6 text-2xl font-bold">
          {t("home.controlSemantics.title")}
        </h2>
        <div className="card">
          <p className="text-sm text-gray-500 leading-relaxed mt-0 mb-6">
            {t("home.controlSemantics.description")}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {(t("home.controlSemantics.items") as any).map(
              (item: any, idx: number) => (
                <div
                  key={idx}
                  className="rounded-lg border border-gray-100 bg-gray-50 p-4"
                >
                  <div className="mb-2">
                    <Badge
                      variant={
                        item.action === "abort"
                          ? "error"
                          : item.action === "resume"
                            ? "success"
                            : "info"
                      }
                      className="px-2 py-1 uppercase"
                    >
                      {item.action}
                    </Badge>
                  </div>
                  <p className="m-0 text-sm text-gray-600 leading-relaxed">
                    {item.behavior}
                  </p>
                </div>
              ),
            )}
          </div>
          <div className="grid gap-3 md:grid-cols-4 mt-4">
            {(t("home.controlSemantics.badges") as any).map(
              (badge: any, idx: number) => {
                const bgColorClasses: Record<string, string> = {
                  abort: "border-red-100 bg-red-50",
                  pause: "border-blue-100 bg-blue-50",
                  resume: "border-green-100 bg-green-50",
                  refresh: "border-slate-200 bg-slate-50",
                };
                const textColorClasses: Record<string, string> = {
                  abort: "text-red-600 text-red-700",
                  pause: "text-blue-600 text-blue-700",
                  resume: "text-green-600 text-green-700",
                  refresh: "text-slate-600 text-slate-700",
                };
                const bgClass =
                  bgColorClasses[badge.label] || "border-red-100 bg-red-50";
                const textClass =
                  textColorClasses[badge.label] || "text-red-600 text-red-700";

                return (
                  <div key={idx} className={`rounded-lg border ${bgClass} p-3`}>
                    <div
                      className={`text-[11px] uppercase tracking-wider ${textClass.split(" ")[0]} font-semibold mb-1`}
                    >
                      {badge.label}
                    </div>
                    <p className={`m-0 text-xs ${textClass.split(" ")[1]}`}>
                      {badge.description}
                    </p>
                  </div>
                );
              },
            )}
          </div>
        </div>
      </section>

      {/* ── Developer Experience ────────────────────────── */}
      <section className="mb-12">
        <h2 className="mt-0 mb-6 text-2xl font-bold">
          {t("home.developerExperience.title")}
        </h2>
        <div className="grid lg:grid-cols-2 gap-6 items-stretch">
          {/* DX list */}
          <div className="card h-full">
            <p className="text-gray-500 leading-relaxed mb-6">
              {t("home.developerExperience.description")}
            </p>
            <ul className="space-y-4">
              {(t("home.developerExperience.items") as any).map(
                (item: string, idx: number) => (
                  <li key={idx} className="flex gap-3 items-start">
                    <span className="mt-0.5 w-5 h-5 rounded-full bg-primary flex-shrink-0 flex items-center justify-center text-[10px] text-white font-bold">
                      ✓
                    </span>
                    <span className="text-sm text-gray-600 leading-relaxed">
                      {item}
                    </span>
                  </li>
                ),
              )}
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

      {/* ── Method Comparison ──────────────────────────── */}
      <section className="mb-12">
        <h2 className="mt-0 mb-6 text-2xl font-bold">
          {t("home.methodComparison.title")}
        </h2>
        <div className="card">
          <p className="text-sm text-gray-500 leading-relaxed mt-0 mb-6">
            {t("home.methodComparison.description")}
          </p>

          {/* 비교 표 */}
          <div className="overflow-x-auto mb-8">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-200">
                  {(t("home.methodComparison.headers") as any).map(
                    (header: string, idx: number) => (
                      <th
                        key={idx}
                        className={`px-4 py-3 text-left text-sm font-semibold text-gray-700 ${
                          idx === 0 ? "bg-gray-50" : ""
                        }`}
                      >
                        {header}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {(t("home.methodComparison.rows") as any).map(
                  (row: any, rowIdx: number) => (
                    <tr
                      key={rowIdx}
                      className={`border-b border-gray-100 ${
                        rowIdx % 2 === 0 ? "bg-white" : "bg-gray-50"
                      }`}
                    >
                      <td className="px-4 py-3 text-sm font-medium text-gray-600 bg-gray-50">
                        {row.label}
                      </td>
                      {(row.values as any).map(
                        (value: string, valIdx: number) => (
                          <td
                            key={valIdx}
                            className="px-4 py-3 text-sm text-gray-700"
                          >
                            {value}
                          </td>
                        ),
                      )}
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>

          {/* 범례 */}
          <div className="grid md:grid-cols-3 gap-4">
            {(t("home.methodComparison.legend") as any).map(
              (item: any, idx: number) => {
                const colors = [
                  "border-blue-100 bg-blue-50",
                  "border-green-100 bg-green-50",
                  "border-purple-100 bg-purple-50",
                ];
                return (
                  <div
                    key={idx}
                    className={`border rounded-lg p-4 ${colors[idx] || colors[0]}`}
                  >
                    <h4 className="font-semibold text-gray-800 mb-2">
                      {item.title}
                    </h4>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                );
              },
            )}
          </div>
        </div>
      </section>

      {/* ── Browser Support ─────────────────────────────── */}
      <section className="mb-12">
        <h2 className="mt-0 mb-6 text-2xl font-bold">
          {t("home.browserSupport.title")}
        </h2>
        <div className="card">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {(t("home.browserSupport.items") as any).map(
              (item: any, idx: number) => {
                const isFull = idx < 2;
                return (
                  <div
                    key={idx}
                    className={`p-4 rounded-lg border text-sm ${
                      isFull
                        ? "border-blue-100 bg-blue-50"
                        : "border-gray-100 bg-gray-50"
                    }`}
                  >
                    <div className="font-bold text-gray-800 mb-1">
                      {item.name}
                    </div>
                    <Badge
                      variant={isFull ? "success" : "info"}
                      className="px-2 py-1"
                    >
                      {item.mode}
                    </Badge>
                  </div>
                );
              },
            )}
          </div>
          <p className="mt-5 text-sm text-gray-400 leading-relaxed">
            {t("home.browserSupport.description")}
          </p>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────── */}
      {process.env.NODE_ENV === "development" && (
        <section className="mb-12">
          <div className="card text-center py-12">
            <h2 className="mt-0 text-3xl font-extrabold mb-3 text-gray-900">
              {t("home.cta.title")}
            </h2>
            <p className="text-gray-500 mb-8 max-w-md mx-auto leading-relaxed">
              {t("home.cta.description")}
            </p>
            <Button
              onClick={onNavigate}
              className="px-9 py-3 text-base font-semibold"
            >
              {t("home.cta.button")}
            </Button>
          </div>
        </section>
      )}

      {/* ── Footer ──────────────────────────────────────── */}
      <footer className="pt-8 border-t border-gray-200 text-center text-sm text-gray-400">
        <p>{t("home.footer")}</p>
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
