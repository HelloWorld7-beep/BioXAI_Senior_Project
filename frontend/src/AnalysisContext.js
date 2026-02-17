// AnalysisContext.js
import { createContext, useState } from "react";

export const AnalysisContext = createContext();

export const AnalysisProvider = ({ children }) => {
  const [protein, setProtein] = useState("");
  const [mutation, setMutation] = useState("");

  const [runsByProtein, setRunsByProtein] = useState({});
  const [selectedRunId, setSelectedRunId] = useState("");

  const addRun = (embeddingDistance, logLikelihood, perResidueLogShift, perResidueEmbedShift) => {
    if (!protein || !mutation) return;

    setRunsByProtein(prev => {
      const proteinRuns = prev[protein] || [];

      const newRun = {
        id: Date.now(),
        mutation,
        embeddingDistance,
        logLikelihood,
        perResidue: {
          logShift: perResidueLogShift,   // e.g. [{ position: 1, residue: 'M', score: 0.02 }, ...]
          embedShift: perResidueEmbedShift // e.g. [{ position: 1, residue: 'M', score: 0.15 }, ...]
        },
        timestamp: Date.now()
      };

      return {
        ...prev,
        [protein]: [newRun, ...proteinRuns].slice(0, 10)
      };
    });
  };

  const getCurrentRuns = () => {
    return runsByProtein[protein] || [];
  };

  const selectRun = (id) => {
    setSelectedRunId(id);

    // Flatten to search across all proteins
    const allRuns = Object.entries(runsByProtein).flatMap(
      ([proteinKey, runs]) =>
        runs.map(run => ({
          ...run,
          protein: proteinKey
        }))
    );

    const run = allRuns.find(r => r.id === Number(id));

    if (run) {
      setProtein(run.protein);
      setMutation(run.mutation);
    }
  };

  const calculatePercentChange = (current, previous) => {
    if (!previous || previous === 0) return 0;

    const raw = ((current - previous) / previous) * 100;

    // Threshold tiny floating noise
    if (Math.abs(raw) < 0.005) return 0;

    return Number(raw.toFixed(2));
  };

  const getComparisonForProtein = (proteinKey, currentRunId) => {
    const proteinRuns = runsByProtein[proteinKey] || [];

    if (proteinRuns.length < 2) return null;

    const sortedRuns = [...proteinRuns].sort(
      (a, b) => b.timestamp - a.timestamp
    );

    const currentIndex = sortedRuns.findIndex(
      r => r.id === Number(currentRunId)
    );

    if (currentIndex === -1 || currentIndex === sortedRuns.length - 1) {
      return null; // no previous mutation
    }

    const current = sortedRuns[currentIndex];
    const previous = sortedRuns[currentIndex + 1];

    const embedChange = calculatePercentChange(
      current.embeddingDistance,
      previous.embeddingDistance
    );

    const logChange = calculatePercentChange(
      current.logLikelihood,
      previous.logLikelihood
    );

    return {
      embedChange,
      logChange,
      previousMutation: previous.mutation
    };
  };

  return (
    <AnalysisContext.Provider
      value={{
        protein,
        setProtein,
        mutation,
        setMutation,
        runsByProtein,
        getCurrentRuns,
        selectRun,
        addRun
      }}
    >
      {children}
    </AnalysisContext.Provider>
  );
};
