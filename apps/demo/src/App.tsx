/* eslint-disable no-nested-ternary */
import React, { useState } from 'react';
import { useUniversalUpload } from '@usu/react';

const UploadSection = ({
  title,
  method,
  file,
}: {
  title: string;
  method: 'auto' | 'stream' | 'xhr chunked';
  file: File | null;
}) => {
  const [progress, setProgress] = useState(0);

  const { upload, status, error, abort, retry, result } = useUniversalUpload({
    url: '/upload',
    file: file || ({} as File),
    options: {
      method,
      chunkSize: 1024 * 1024,
      onProgress: ({ percentage }) => setProgress(Math.round(percentage)),
    },
  });

  const handleUpload = () => {
    if (!file) return;
    upload();
  };

  const tagClass =
    method === 'stream' ? 'tag tag-stream' : method === 'xhr chunked' ? 'tag tag-xhr' : 'tag';

  return (
    <article className="card">
      <header>
        <span className={tagClass}>{method}</span>
        <h3 className="mt-2 text-xl font-bold">{title}</h3>
        <p className="text-sm text-gray-500 mb-6">
          {method === 'stream'
            ? 'Constant memory usage via Web Streams.'
            : method === 'xhr chunked'
              ? 'Sequential chunks via XMLHttpRequest.'
              : 'Automatically selects optimal transfer method.'}
        </p>
      </header>

      <div className="mb-6 flex gap-3 items-center">
        <button
          className="btn-primary"
          onClick={handleUpload}
          disabled={!file || status === 'uploading'}
        >
          {status === 'idle' || status === 'aborted'
            ? 'Start Upload'
            : status === 'success' || status === 'error'
              ? 'Retry Upload'
              : 'Uploading...'}
        </button>
        <button className="btn-outline" onClick={abort} disabled={status !== 'uploading'}>
          Abort
        </button>
        <button className="btn-outline" onClick={retry} disabled={status === 'idle'}>
          Retry
        </button>
      </div>

      {status !== 'idle' && (
        <section aria-labelledby={`progress-title-${method}`}>
          <h4 id={`progress-title-${method}`} className="sr-only">
            Upload Progress
          </h4>
          <progress
            value={status === 'success' ? 100 : progress}
            max="100"
            className="w-full h-1.5 rounded-full"
            style={{
              accentColor:
                status === 'success'
                  ? 'var(--success)'
                  : status === 'error'
                    ? 'var(--error)'
                    : 'var(--primary)',
            }}
          />
          <output className="mt-3 flex justify-between text-sm font-medium">
            <span
              className={
                status === 'error'
                  ? 'text-error'
                  : status === 'success'
                    ? 'text-success'
                    : 'text-gray-700'
              }
            >
              {status.toUpperCase()}
            </span>
            <span>{status === 'success' ? 100 : progress}%</span>
          </output>

          <dl className="mt-3 text-[10px] bg-stone-100 p-2 rounded text-stone-600 font-mono grid grid-cols-[max-content_1fr] gap-x-2">
            <dt>ok:</dt>
            <dd>{result.ok.toString()}</dd>
            <dt>message:</dt>
            <dd>{result.message || 'N/A'}</dd>
            <dt>status:</dt>
            <dd>{result.status}</dd>
            <dt>total:</dt>
            <dd>{result.total} bytes</dd>
          </dl>

          {error && (
            <p role="alert" className="mt-3 text-sm p-2 rounded bg-red-50 text-error">
              {error.message}
            </p>
          )}
        </section>
      )}
    </article>
  );
};

const App = () => {
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  return (
    <main className="max-w-[1200px] mx-auto p-8">
      <header className="text-center mb-12">
        <h1 className="text-4xl font-extrabold mb-2">Universal Stream Uploader</h1>
        <p className="text-lg text-gray-500">
          High-performance file uploads with intelligent fallbacks.
        </p>
      </header>

      <section className="mb-12">
        <h2 className="mt-0 mb-4 text-2xl font-bold">Step 1: Select a File</h2>
        <div className="card">
          <label htmlFor="file-upload" className="sr-only">
            Choose file to upload
          </label>
          <input
            id="file-upload"
            type="file"
            onChange={handleFileChange}
            className="block w-full p-4 border-2 border-dashed border-gray-200 rounded-lg cursor-pointer hover:border-blue-400 transition-colors"
          />
          {file && (
            <aside className="mt-4 p-3 bg-gray-100 rounded-md text-sm">
              📄 <strong>{file.name}</strong> • {(file.size / (1024 * 1024)).toFixed(2)} MB
            </aside>
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-6 text-2xl font-bold">Step 2: Choose Upload Method</h2>
        <div className="grid gap-6 grid-cols-[repeat(auto-fit,minmax(300px,1fr))]">
          <UploadSection title="Intelligent Auto" method="auto" file={file} />
          <UploadSection title="Modern Streaming" method="stream" file={file} />
          <UploadSection title="Reliable Chunking" method="xhr chunked" file={file} />
        </div>
      </section>

      <footer className="mt-16 pt-8 border-t border-gray-200 text-center text-sm text-gray-500">
        <p>Engineered for performance with the Web Streams API & TypeScript.</p>
      </footer>
    </main>
  );
};

export default App;
