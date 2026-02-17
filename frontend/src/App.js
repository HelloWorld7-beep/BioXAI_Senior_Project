import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import AnalysisXAI from "./pages/AnalysisXAI";
import AnalysisInput from "./pages/AnalysisInput";
import AnalysisResult from "./pages/AnalysisResult";
import About from "./pages/About";
import { AnalysisProvider } from "./AnalysisContext";
import "./App.css";

function App() {
  return (
    <AnalysisProvider>
      <div className="App">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/analysis/input" element={<AnalysisInput />} />
          <Route path="/analysis" element={<AnalysisInput />} />
          <Route path="/analysis/xai" element={<AnalysisXAI />} />
          <Route path="/analysis/results" element={<AnalysisResult />} />
          <Route path="/about" element={<About />} />
        </Routes>
      </div>
    </AnalysisProvider>
  );
}

export default App;