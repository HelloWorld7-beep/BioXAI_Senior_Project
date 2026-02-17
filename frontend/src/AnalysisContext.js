// AnalysisContext.js
import { createContext, useState } from "react";

export const AnalysisContext = createContext();

export const AnalysisProvider = ({ children }) => {
  const [protein, setProtein] = useState("");
  const [mutation, setMutation] = useState("");

  const [runs, setRuns] = useState([]); 
  const [selectedRunId, setSelectedRunId] = useState("");

  const addRun = () => {
    if (!protein || !mutation) return;

    const newRun = {
      id: Date.now(),
      protein,
      mutation
    };

    setRuns(prev => {
      const updated = [newRun, ...prev];
      return updated.slice(0, 3); // max 3 runs
    });

    setSelectedRunId(newRun.id);
  };

  const selectRun = (id) => {
    setSelectedRunId(id);

    const run = runs.find(r => r.id === Number(id));
    if (run) {
      setProtein(run.protein);
      setMutation(run.mutation);
    }
  };

  return (
    <AnalysisContext.Provider
      value={{
        protein,
        setProtein,
        mutation,
        setMutation,
        runs,
        selectedRunId,
        selectRun,
        addRun
      }}
    >
      {children}
    </AnalysisContext.Provider>
  );
};
