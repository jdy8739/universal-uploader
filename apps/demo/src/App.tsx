import React, { useState } from "react";
import { Home } from "./pages/Home";
import { Test } from "./pages/Test";

const App = () => {
  const [showDashboard, setShowDashboard] = useState(false);

  if (!showDashboard) {
    return <Home onNavigate={() => setShowDashboard(true)} />;
  }

  return <Test onBack={() => setShowDashboard(false)} />;
};

export default App;
