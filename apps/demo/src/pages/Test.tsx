import React, { useState } from "react";
import {
  UploadCard,
  RetryAndOnErrorCase,
  ThrowOnErrorCase,
  RetryRecoveryCase,
  LifecycleHooksCase,
  ExponentialBackoffCase,
  SmallChunkStressTest,
  CustomHeadersCase,
  DisableChunkingCase,
  ChunkedResumptionCase,
} from "../scenarios";
import { Button, LanguageToggle } from "../ui";
import { useI18n } from "../i18n";

interface TestProps {
  onBack: () => void;
}

export const Test = ({ onBack }: TestProps) => {
  const [file, setFile] = useState<File | null>(null);
  const { t, language } = useI18n();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  return (
    <main className="max-w-[1200px] mx-auto p-8">
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <Button variant="outline" onClick={onBack}>
            {t("test.backButton")}
          </Button>
          <LanguageToggle />
        </div>
      </div>

      <header className="text-center mb-12">
        <h1 className="text-4xl font-extrabold mb-2">
          {t("test.header.title")}
        </h1>
        <p className="text-lg text-gray-500">
          {t("test.header.subtitle")}
        </p>
      </header>

      <section className="mb-12">
        <h2 className="mt-0 mb-4 text-2xl font-bold">
          {t("test.step1.title")}
        </h2>
        <div className="card">
          <label htmlFor="file-upload" className="sr-only">
            {t("test.step1.label")}
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
        <h2 className="mb-6 text-2xl font-bold">{t("test.step2.title")}</h2>
        <div className="grid gap-6 grid-cols-[repeat(auto-fit,minmax(300px,1fr))]">
          <UploadCard
            title={language === "en" ? "Intelligent Auto" : "지능형 자동"}
            method="auto"
            file={file}
            showResolvedMethod
          />
          <UploadCard
            title={language === "en" ? "Modern Streaming" : "최신 스트리밍"}
            method="stream"
            file={file}
            showResolvedMethod
          />
          <UploadCard
            title={language === "en" ? "Stream Chunked" : "스트림 청크"}
            method="stream chunked"
            file={file}
            showResolvedMethod
          />
          <UploadCard
            title={language === "en" ? "Reliable Chunking" : "신뢰할 수 있는 청킹"}
            method="xhr chunked"
            file={file}
            showResolvedMethod
          />
          <DisableChunkingCase file={file} />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="mb-6 text-2xl font-bold">
          {t("test.step3.title")}
        </h2>
        <div className="grid gap-6 grid-cols-[repeat(auto-fit,minmax(300px,1fr))]">
          <RetryAndOnErrorCase file={file} />
          <ThrowOnErrorCase file={file} />
          <RetryRecoveryCase file={file} />
          <ExponentialBackoffCase file={file} />
          <ChunkedResumptionCase
            file={file}
            method="stream chunked"
            title={language === "en" ? "Stream Chunked Resumption" : "스트림 청크 재개"}
          />
          <ChunkedResumptionCase
            file={file}
            method="xhr chunked"
            title={language === "en" ? "XHR Chunked Resumption" : "XHR 청크 재개"}
          />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="mb-6 text-2xl font-bold">
          {t("test.step4.title")}
        </h2>
        <div className="grid gap-6 grid-cols-[repeat(auto-fit,minmax(300px,1fr))]">
          <SmallChunkStressTest file={file} />
          <CustomHeadersCase file={file} />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="mb-6 text-2xl font-bold">
          {t("test.step5.title")}
        </h2>
        <div className="grid gap-6 grid-cols-[repeat(auto-fit,minmax(300px,1fr))]">
          <LifecycleHooksCase file={file} />
        </div>
      </section>

      <footer className="mt-16 pt-8 border-t border-gray-200 text-center text-sm text-gray-500">
        <p>{t("test.footer")}</p>
      </footer>
    </main>
  );
};
