import React from 'react';
import { Button, Badge } from '../ui';

interface HomeProps {
  onNavigate: () => void;
}

const FEATURES = [
  {
    title: 'Stream Architecture',
    description:
      'Upload multi-gigabyte files without buffering. Uses the Web Streams API for near-zero memory overhead regardless of file size.',
    tag: 'stream',
  },
  {
    title: 'Smart Fallbacks',
    description:
      'Transparently switches to XHR chunked uploads when streaming fetch is unavailable. Zero code changes required on your end.',
    tag: 'xhr',
  },
  {
    title: 'Resilient Retries',
    description:
      'Built-in exponential backoff and retry logic handles unstable network conditions automatically with full observability.',
    tag: null,
  },
];

const BROWSER_SUPPORT = [
  { name: 'Chrome / Edge', mode: 'Full Streaming', full: true },
  { name: 'Firefox', mode: 'Full Streaming', full: true },
  { name: 'Safari', mode: 'XHR Fallback', full: false },
  { name: 'Legacy Browsers', mode: 'XHR Fallback', full: false },
];

const DX_ITEMS = [
  'Full TypeScript support with exhaustive type coverage',
  'Under 5 kB gzipped — zero runtime dependencies',
  'onProgress, onError, onComplete lifecycle hooks',
  'Exponential backoff with configurable retry logic',
];

const CODE_SNIPPET = `import { useUniversalUpload } from 'universal-upload';

const { upload, status } = useUniversalUpload({
  url: '/api/upload',
  options: {
    method: 'auto',       // stream → xhr fallback
    retryCount: 3,
    onProgress: (p) => updateUI(p.percentage),
    onError: (err) => console.error(err),
  }
});

// One call — that's it.
upload(file);`;

export const Home = ({ onNavigate }: HomeProps) => {
  return (
    <main className="max-w-[1200px] mx-auto p-8">

      {/* ── Header ─────────────────────────────────────── */}
      <header className="text-center mb-16 pt-8">
        <div className="inline-flex items-center gap-2 mb-6 px-3 py-1 rounded-full border border-blue-200 bg-blue-50 text-blue-700 text-xs font-semibold">
          Stable Release · v1.2.0
        </div>
        <h1 className="text-5xl font-extrabold mb-4 text-gray-900 tracking-tight">
          Universal Stream Uploader
        </h1>
        <p className="text-lg text-gray-500 max-w-2xl mx-auto leading-relaxed mb-8">
          High-performance file uploads for modern browsers. Constant memory footprint, intelligent
          stream-to-XHR fallbacks, and production-grade resilience — in under <strong className="text-gray-700">5 kB</strong>.
        </p>
        <div className="flex justify-center gap-3 flex-wrap">
          <Button onClick={onNavigate} className="px-7 py-2.5 font-semibold">
            Explore Dashboard →
          </Button>
          <Button
            variant="outline"
            onClick={() => window.open('https://github.com/jdy8739/universial-upload', '_blank')}
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
            { value: '0', label: 'Dependencies' },
            { value: '<5kB', label: 'Gzipped' },
            { value: '3', label: 'Upload Modes' },
            { value: '100%', label: 'Type-safe' },
          ].map(({ value, label }) => (
            <div key={label} className="text-center py-7 px-4">
              <div className="text-3xl font-extrabold text-gray-900 mb-1">{value}</div>
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-widest">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ───────────────────────────────────── */}
      <section className="mb-12">
        <h2 className="mt-0 mb-6 text-2xl font-bold">Core Features</h2>
        <div className="grid gap-6 grid-cols-[repeat(auto-fit,minmax(300px,1fr))]">
          {FEATURES.map(({ title, description, tag }) => (
            <div key={title} className="card">
              <div className="flex items-center gap-2 mb-4">
                {tag === 'stream' && <span className="tag tag-stream">stream</span>}
                {tag === 'xhr' && <span className="tag tag-xhr">xhr</span>}
              </div>
              <h3 className="mt-0 text-lg font-bold mb-2">{title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed mb-0">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Developer Experience ────────────────────────── */}
      <section className="mb-12">
        <h2 className="mt-0 mb-6 text-2xl font-bold">Developer Experience</h2>
        <div className="grid lg:grid-cols-2 gap-6 items-start">

          {/* DX list */}
          <div className="card h-full">
            <p className="text-gray-500 leading-relaxed mb-6">
              Simple enough for basic uploads, powerful enough for complex streaming pipelines.
              Zero dependencies, 100% type-safe.
            </p>
            <ul className="space-y-4">
              {DX_ITEMS.map((item) => (
                <li key={item} className="flex gap-3 items-start">
                  <span className="mt-0.5 w-5 h-5 rounded-full bg-primary flex-shrink-0 flex items-center justify-center text-[10px] text-white font-bold">
                    ✓
                  </span>
                  <span className="text-sm text-gray-600 leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Code block */}
          <div className="card bg-slate-950 border-slate-800 p-0 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/60" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                <div className="w-3 h-3 rounded-full bg-green-500/60" />
              </div>
              <span className="text-xs text-slate-400 font-mono">upload.ts</span>
              <div className="w-14" />
            </div>
            <pre className="px-6 py-5 text-[12.5px] leading-[1.85] overflow-x-auto m-0 bg-slate-950">
              <code>
                {CODE_SNIPPET.split('\n').map((line, i) => (
                  <div key={i} className="flex">
                    <span className="select-none w-5 text-slate-600 text-right mr-5 flex-shrink-0 tabular-nums text-[11px]">
                      {i + 1}
                    </span>
                    <span className={getLineColor(line)}>{line || '\u00A0'}</span>
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
                    ? 'border-blue-100 bg-blue-50'
                    : 'border-gray-100 bg-gray-50'
                }`}
              >
                <div className="font-bold text-gray-800 mb-1">{name}</div>
                <span className={`tag ${full ? 'tag-stream' : ''}`}>{mode}</span>
              </div>
            ))}
          </div>
          <p className="mt-5 text-sm text-gray-400 leading-relaxed">
            Streaming fetch support is detected at runtime. Falls back to chunked XHR silently —
            no configuration, no flags, no polyfills required.
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
            The interactive dashboard provides a live environment to test streaming,
            XHR fallbacks, and error recovery.
          </p>
          <Button onClick={onNavigate} className="px-9 py-3 text-base font-semibold">
            Enter Test Dashboard →
          </Button>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────── */}
      <footer className="pt-8 border-t border-gray-200 text-center text-sm text-gray-400">
        <p>Universal Upload © 2026 · Engineered for performance with the Web Streams API & TypeScript.</p>
      </footer>

    </main>
  );
};

function getLineColor(line: string): string {
  if (line.trim().startsWith('//')) return 'text-slate-500';
  if (line.includes('import ')) return 'text-violet-400';
  if (line.includes("'auto'") || line.includes("'stream'") || line.includes("'xhr chunked'"))
    return 'text-amber-300';
  if (/^\s*(const|let|url|method|retryCount|onProgress|onError)\b/.test(line))
    return 'text-sky-300';
  if (line.includes('useUniversalUpload') || line.includes('upload('))
    return 'text-emerald-400';
  return 'text-slate-200';
}
