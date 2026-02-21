import './App.css';
import { useState } from 'react';
import AttentionVisualizer from './pages/AttentionVisualizer';
import IntegratedGradientsVisualizer from './pages/IntegratedGradientsVisualizer'; 
//UPDATE - added IG page import so we can switch between visualizers

function App() {
  //UPDATE - using simple state toggle)
  const [page, setPage] = useState("attention");

  return (
    <div className="App">

      {/* Simple Toggle Navigation */}
      {/* UPDATE - manual nav buttons*/}
      <div style={{ margin: "20px" }}>
        <button
          onClick={() => setPage("attention")}
          style={{
            marginRight: "15px",
            padding: "8px 16px",
            cursor: "pointer"
          }}
        >
          Attention
        </button>

        <button
          onClick={() => setPage("ig")}
          style={{
            padding: "8px 16px",
            cursor: "pointer"
          }}
        >
          Integrated Gradients
        </button>
      </div>

      {/* Conditional Rendering */}
      {/* UPDATE - render components conditionally based on page state*/}
      {page === "attention" && <AttentionVisualizer />}
      {page === "ig" && <IntegratedGradientsVisualizer />}

    </div>
  );
}

export default App;
