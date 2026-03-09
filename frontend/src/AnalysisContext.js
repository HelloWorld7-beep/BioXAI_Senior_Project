// AnalysisContext.js
import { createContext, useState } from "react";

export const AnalysisContext = createContext();

export const AnalysisProvider = ({ children }) => {
  const [protein, setProtein] = useState("");
  const [mutation, setMutation] = useState("");

  const [runsByProtein, setRunsByProtein] = useState({});
  const [selectedRunId, setSelectedRunId] = useState("");

  const addRun = (
    embeddingDistance,
    logLikelihood,
    perResidueLogShift,
    perResidueEmbedShift,
    lrpData = null,
    heatmapData = null
  ) => {
    if (!protein || !mutation) return;

    const normalizeResidues = (input) => {
      if (!input) return [];

      if (
        Array.isArray(input) &&
        input.length > 0 &&
        input[0].residue !== undefined &&
        input[0].score !== undefined
      ) {
        return input.map((item, idx) => ({
          residue: String(item.residue),
          score: Number(item.score),
          position: item.position ?? idx + 1,
        }));
      }

      if (!Array.isArray(input)) return [];

      const out = [];
      input.forEach((item, idx) => {
        if (!item || typeof item !== "object") return;

        if (item.residue !== undefined && item.score !== undefined) {
          out.push({
            residue: String(item.residue),
            score: Number(item.score),
            position: item.position ?? idx + 1,
          });
          return;
        }

        const keys = Object.keys(item);
        const allNumeric = keys.every((k) => typeof item[k] === "number");
        if (allNumeric && keys.length > 0) {
          keys.forEach((k, i) => {
            out.push({
              residue: String(k).toUpperCase(),
              score: Number(item[k]),
              position: i + 1,
            });
          });
          return;
        }

        if (item.res !== undefined && item.val !== undefined) {
          out.push({
            residue: String(item.res),
            score: Number(item.val),
            position: item.position ?? idx + 1,
          });
          return;
        }

        const entry = Object.entries(item).find(([, v]) => typeof v === "number");
        if (entry) {
          out.push({
            residue: String(entry[0]).toUpperCase(),
            score: Number(entry[1]),
            position: idx + 1,
          });
        }
      });

      return out;
    };

    const normalizedLog = normalizeResidues(perResidueLogShift);
    const normalizedEmbed = normalizeResidues(perResidueEmbedShift);
    const normalizedLrp = normalizeResidues(lrpData);

    const normalizedHeatmap = Array.isArray(heatmapData)
      ? heatmapData.map((row) =>
          Array.isArray(row) ? row.map((value) => Number(value) || 0) : []
        )
      : [];

    const existingRuns = runsByProtein[protein] || [];
    const existing = existingRuns.find((r) => r.mutation === mutation);
    if (existing) {
      setSelectedRunId(existing.id);
      return existing.id;
    }

    const newRun = {
      id: Date.now(),
      protein,
      mutation,
      embeddingDistance,
      logLikelihood,
      perResidue: {
        logShift: normalizedLog,
        embedShift: normalizedEmbed,
        lrp: normalizedLrp,
        heatmap: normalizedHeatmap,
      },
      timestamp: Date.now(),
    };

    setRunsByProtein((prev) => {
      const proteinRuns = prev[protein] || [];
      return {
        ...prev,
        [protein]: [newRun, ...proteinRuns].slice(0, 10),
      };
    });

    setSelectedRunId(newRun.id);
    return newRun.id;
  };

  const getCurrentRuns = () => runsByProtein[protein] || [];

  const selectRun = (id) => {
    setSelectedRunId(id);

    const allRuns = Object.entries(runsByProtein).flatMap(([proteinKey, runs]) =>
      runs.map((run) => ({ ...run, protein: proteinKey }))
    );

    const run = allRuns.find((r) => r.id === Number(id));
    if (run) {
      setProtein(run.protein);
      setMutation(run.mutation);
    }
  };

  const calculatePercentChange = (current, previous) => {
    if (!previous || previous === 0) return 0;
    const raw = ((current - previous) / previous) * 100;
    if (Math.abs(raw) < 0.005) return 0;
    return Number(raw.toFixed(2));
  };

  const getComparisonForProtein = (proteinKey, currentRunId) => {
    const proteinRuns = runsByProtein[proteinKey] || [];
    if (proteinRuns.length < 2) return null;

    const sortedRuns = [...proteinRuns].sort((a, b) => b.timestamp - a.timestamp);
    const currentIndex = sortedRuns.findIndex((r) => r.id === Number(currentRunId));

    if (currentIndex === -1 || currentIndex === sortedRuns.length - 1) return null;

    const current = sortedRuns[currentIndex];
    const previous = sortedRuns[currentIndex + 1];

    return {
      embedChange: calculatePercentChange(current.embeddingDistance, previous.embeddingDistance),
      logChange: calculatePercentChange(current.logLikelihood, previous.logLikelihood),
      previousMutation: previous.mutation,
    };
  };

  const getSelectedRun = () => {
    if (!selectedRunId) return null;
    const allRuns = Object.entries(runsByProtein).flatMap(([proteinKey, runs]) =>
      runs.map((run) => ({ ...run, protein: proteinKey }))
    );
    return allRuns.find((r) => r.id === Number(selectedRunId)) || null;
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
        addRun,
        selectedRunId,
        setSelectedRunId,
        getSelectedRun,
        getComparisonForProtein,
      }}
    >
      {children}
    </AnalysisContext.Provider>
  );
};