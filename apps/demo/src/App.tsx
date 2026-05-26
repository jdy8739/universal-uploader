import { useState } from "react";
import { Home } from "./pages/Home";
import { Test } from "./pages/Test";
import { I18nProvider } from "./i18n";

const App = () => {
  const [showDashboard, setShowDashboard] = useState(false);

  if (!showDashboard) {
    return <Home onNavigate={() => setShowDashboard(true)} />;
  }

  return <Test onBack={() => setShowDashboard(false)} />;
};

export default function AppWithI18n() {
  return (
    <I18nProvider>
      <App />
    </I18nProvider>
  );
}
