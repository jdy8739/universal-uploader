import { createContext, useContext, useState, ReactNode } from "react";
import en from "./langs/en.json";
import ko from "./langs/ko.json";

export type Language = "en" | "ko";

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (path: string, defaultValue?: string) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export const I18nProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<Language>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("lang");
      if (stored === "en" || stored === "ko") return stored;

      const browserLang = navigator.language.startsWith("ko") ? "ko" : "en";
      return browserLang;
    }
    return "en";
  });

  const t = (path: string, defaultValue = path): string => {
    const translations = language === "ko" ? ko : en;

    return path.split(".").reduce((obj: any, key: string) => {
      return obj?.[key] ?? defaultValue;
    }, translations);
  };

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang);
    if (typeof window !== "undefined") {
      localStorage.setItem("lang", lang);
    }
  };

  return (
    <I18nContext.Provider
      value={{ language, setLanguage: handleSetLanguage, t }}
    >
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return context;
};
