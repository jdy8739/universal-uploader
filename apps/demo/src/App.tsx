import React, { useState } from 'react';
import {
  UploadCard,
  RetryAndOnErrorCase,
  ThrowOnErrorCase,
  RetryRecoveryCase,
  LifecycleHooksCase,
  ExponentialBackoffCase,
  SmallChunkStressTest,
  CustomHeadersCase,
} from './scenarios';

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
          <UploadCard title="Intelligent Auto" method="auto" file={file} />
          <UploadCard title="Modern Streaming" method="stream" file={file} />
          <UploadCard title="Reliable Chunking" method="xhr chunked" file={file} />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="mb-6 text-2xl font-bold">Step 3: Error & Recovery Scenarios</h2>
        <div className="grid gap-6 grid-cols-[repeat(auto-fit,minmax(300px,1fr))]">
          <RetryAndOnErrorCase file={file} />
          <ThrowOnErrorCase file={file} />
          <RetryRecoveryCase file={file} />
          <ExponentialBackoffCase file={file} />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="mb-6 text-2xl font-bold">Step 4: Advanced Configurations</h2>
        <div className="grid gap-6 grid-cols-[repeat(auto-fit,minmax(300px,1fr))]">
          <SmallChunkStressTest file={file} />
          <CustomHeadersCase file={file} />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="mb-6 text-2xl font-bold">Step 5: Lifecycle & Hooks</h2>
        <div className="grid gap-6 grid-cols-[repeat(auto-fit,minmax(300px,1fr))]">
          <LifecycleHooksCase file={file} />
        </div>
      </section>

      <footer className="mt-16 pt-8 border-t border-gray-200 text-center text-sm text-gray-500">
        <p>Engineered for performance with the Web Streams API & TypeScript.</p>
      </footer>
    </main>
  );
};

export default App;
