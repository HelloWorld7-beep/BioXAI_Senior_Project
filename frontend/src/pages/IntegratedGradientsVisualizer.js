import React, { useContext, useMemo } from "react";
import { AnalysisContext } from "../AnalysisContext";


const IntegratedGradientsVisualizer = ({ embedded = false }) => {
  const { protein, getSelectedRun } = useContext(AnalysisContext);
  const run = getSelectedRun();
  const residues = run?.perResidue?.integratedGradients ?? [];

  const sequence = (run?.protein ?? protein ?? "").trim();
  const scores = useMemo(() => {
    if (!Array.isArray(residues) || residues.length === 0) return [];
    if (!sequence) {
      return residues.map((r) => Number(r?.score ?? 0));
    }
    const arr = Array.from({ length: sequence.length }, () => 0);
    residues.forEach((r) => {
      const pos = Number(r?.position);
      if (!Number.isFinite(pos) || pos < 1 || pos > arr.length) return;
      arr[pos - 1] = Number(r?.score ?? 0);
    });
    return arr;
  }, [residues, sequence]);
  const mutationIndex = useMemo(() => {
    const raw = (run?.mutation ?? "").trim();
    if (!raw) return -1;
    const first = raw.split(/[,;/\s]+/).find(Boolean);
    if (!first) return -1;
    const match = first.match(/^[A-Za-z](\d+)[A-Za-z]$/);
    if (!match) return -1;
    const pos = Number(match[1]);
    if (!Number.isFinite(pos) || pos < 1) return -1;
    return pos - 1;
  }, [run]);


  //Normalize values between -1 and 1 for color mapping
  //We scale by max absolute value so strongest residue = full intensity color
  const normalize = (vals) => {
    const maxAbs = Math.max(...vals.map((v) => Math.abs(v)));
    if (maxAbs === 0) return vals; //Edge case: no signal
    return vals.map((v) => v / maxAbs);
  };


  const containerStyle = embedded
    ? {
        width: "100%",
        height: "100%",
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        textAlign: "center",
        fontFamily: "Arial, sans-serif",
      }
    : { padding: "20px", textAlign: "center", fontFamily: "Arial, sans-serif" };

  const vizStyle = embedded
    ? { flex: 1, minHeight: 0, display: "flex", justifyContent: "center", flexWrap: "wrap", padding: "10px", backgroundColor: "#f9f9f9", borderRadius: "8px", overflow: "auto" }
    : { display: "flex", justifyContent: "center", flexWrap: "wrap", padding: "10px", backgroundColor: "#f9f9f9", borderRadius: "8px" };

  const emptyTextStyle = embedded
    ? { color: "#999", marginTop: "0" }
    : { color: "#999" };

  return (
    <div style={containerStyle}>

      {embedded ? <h2>Integrated Gradients</h2> : <h1>Integrated Gradients Visualizer</h1>}
      <p style={{ color: "#666", marginTop: embedded ? "6px" : undefined }}>
        Shows how each residue contributes to the mutation score.
      </p>


      {/* Visualization region */}
      {scores.length > 0 ? (

        <div style={vizStyle}>

          {/* Map each residue to a colored square */}
          {normalize(scores).map((val, idx) => {
            const isMutationSite = idx === mutationIndex;

            //Map positive attribution -> red
            //Map negative attribution -> blue
            //Color intensity proportional to magnitude
            const color = val >= 0
              ? `rgba(255,0,0,${Math.abs(val)})`
              : `rgba(0,0,255,${Math.abs(val)})`;

            return (
              <div
                key={idx}

                //Tooltip shows raw (non-normalized) IG value
                title={`Pos ${idx} (${sequence[idx] || "-"}): ${val.toFixed(3)}`}

                style={{
                  width: "25px",
                  height: "25px",
                  margin: "2px",
                  backgroundColor: color,
                  border: isMutationSite ? "3px solid black" : "1px solid #ccc",
                  fontSize: "12px",
                  fontWeight: isMutationSite ? "bold" : "normal",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  color: isMutationSite ? "#000" : "#fff",
                }}
              >
                {sequence[idx] || "-"} {/* Render residue letter inside square */}
              </div>
            );
          })}
        </div>

      ) : (

        <p style={emptyTextStyle}>
          {!sequence && "Run mutation scoring to compute integrated gradients."}
          {sequence && "Integrated gradients not available yet."}
        </p>

      )}
    </div>
  );
};

export default IntegratedGradientsVisualizer;
