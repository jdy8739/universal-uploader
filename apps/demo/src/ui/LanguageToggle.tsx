import React from "react";
import { useI18n } from "../i18n";

interface LanguageToggleProps {
  className?: string;
}

export const LanguageToggle = ({ className = "" }: LanguageToggleProps) => {
  const { language, toggleLanguage } = useI18n();

  return (
    <button
      type="button"
      onClick={toggleLanguage}
      aria-label={
        language === "en" ? "Switch to Korean" : "Switch to English"
      }
      className={`lang-toggle ${className}`}
    >
      <span>{language === "en" ? "English" : "한국어"}</span>
      <span className="lang-toggle-icon" aria-hidden="true">
        ⇄
      </span>
    </button>
  );
};
