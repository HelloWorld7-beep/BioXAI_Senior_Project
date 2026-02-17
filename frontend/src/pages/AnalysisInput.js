import { useContext } from "react";
import Navbar from "../components/Navbar";
import DashboardBody from "../components/DashboardBody";
import { AnalysisContext } from "../AnalysisContext";
import '../styles/AnalysisInput.css'

function AnalysisInput() {
  const {
    protein,
    setProtein,
    mutation,
    setMutation,
    addRun
  } = useContext(AnalysisContext);

  return (
    <div className="body">
      <Navbar />

      <DashboardBody
        title="Analysis"
        subTitle="Sequence Input"
      >
        <div className="input-container">
          <input
            className="text-input"
            type="text"
            placeholder="Protein Sequence"
            value={protein}
            onChange={(e) => setProtein(e.target.value)}
          />

          <input
            className="text-input"
            type="text"
            placeholder="Mutation (e.g. A123V)"
            value={mutation}
            onChange={(e) => setMutation(e.target.value)}
          />

          <button
            className="run-button"
            onClick={addRun}
          >
            Run Mutation Scoring
          </button>
        </div>
      </DashboardBody>
    </div>
  );
}

export default AnalysisInput;
