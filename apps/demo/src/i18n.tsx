import { createContext, useContext, useState, ReactNode } from "react";
import en from "./langs/en.json";
import ko from "./langs/ko.json";

export type Language = "en" | "ko";

// ── Translation schema ────────────────────────────────────
export interface FeatureItem {
  title: string;
  description: string;
  tag: string;
}

export interface ControlItem {
  action: string;
  behavior: string;
}

export interface ControlBadge {
  label: string;
  description: string;
}

export interface MethodRow {
  label: string;
  values: string[];
}

export interface LegendItem {
  title: string;
  description: string;
}

export interface BrowserItem {
  name: string;
  mode: string;
}

interface TranslationSchema {
  home: {
    header: {
      badge: string;
      title: string;
      subtitle: string;
      exploreDashboard: string;
      sourceCode: string;
    };
    stats: {
      dependencies: { value: string; label: string };
      gzipped: { value: string; label: string };
      uploadModes: { value: string; label: string };
      typeSafe: { value: string; label: string };
    };
    features: {
      title: string;
      items: FeatureItem[];
    };
    controlSemantics: {
      title: string;
      description: string;
      items: ControlItem[];
      badges: ControlBadge[];
    };
    developerExperience: {
      title: string;
      description: string;
      items: string[];
    };
    browserSupport: {
      title: string;
      description: string;
      items: BrowserItem[];
    };
    methodComparison: {
      title: string;
      description: string;
      headers: string[];
      rows: MethodRow[];
      legend: LegendItem[];
    };
    cta: {
      title: string;
      description: string;
      button: string;
    };
    footer: string;
  };
}

// Deep path resolver: "a.b.c" → TranslationSchema["a"]["b"]["c"]
// Falls back to `string` for paths not in the schema (e.g. dynamic interpolation).
type DeepValue<T, P extends string> = P extends `${infer K}.${infer Rest}`
  ? K extends keyof T
    ? DeepValue<T[K], Rest>
    : string
  : P extends keyof T
    ? T[P]
    : string;

function getBrowserLanguage(): Language {
  const langs =
    typeof navigator !== "undefined"
      ? [...(navigator.languages ?? []), navigator.language]
      : [];

  for (const lang of langs) {
    if (lang.toLowerCase().startsWith("ko")) return "ko";
  }

  return "en";
}

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: <P extends string>(
    path: P,
    defaultValue?: string,
  ) => DeepValue<TranslationSchema, P>;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export const I18nProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<Language>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("lang");
      if (stored === "en" || stored === "ko") return stored;

      return getBrowserLanguage();
    }
    return "en";
  });

  const t = <P extends string>(
    path: P,
    defaultValue: string = path,
  ): DeepValue<TranslationSchema, P> => {
    const translations = language === "ko" ? ko : en;

    return path.split(".").reduce(
      (obj: unknown, key) =>
        (obj as Record<string, unknown>)?.[key] ?? defaultValue,
      translations,
    ) as DeepValue<TranslationSchema, P>;
  };

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang);
    if (typeof window !== "undefined") {
      localStorage.setItem("lang", lang);
    }
  };

  const toggleLanguage = () => {
    handleSetLanguage(language === "en" ? "ko" : "en");
  };

  return (
    <I18nContext.Provider
      value={{ language, setLanguage: handleSetLanguage, toggleLanguage, t }}
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
