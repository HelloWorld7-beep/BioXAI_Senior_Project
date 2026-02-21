import React, { useState } from "react";


//Main UI page for visualizing integrated gradients from backend
const IntegratedGradientsVisualizer = () => {

  //React state hooks to track user input + backend output
  const [sequence, setSequence] = useState("MAGRS"); //Protein sequence string
  const [position, setPosition] = useState(0); //0-indexed mutation position
  const [mutant, setMutant] = useState(""); //Single mutant amino acid
  const [importance, setImportance] = useState(null); //IG output array (per-residue attribution)
  const [loading, setLoading] = useState(false); //Loading state for async call


  //Handles button click -> sends request to Flask backend
  const handleGenerate = async () => {

    //Basic validation (must have sequence + exactly one mutant AA)
    if (!sequence || mutant.length !== 1) {
      alert("Enter valid sequence and single mutant AA");
      return;
    }

    setLoading(true);

    try {

      //Send POST request to Flask endpoint
      //Backend computes IG and returns residue-level attribution scores
      const response = await fetch("http://127.0.0.1:5000/get-integrated-gradients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sequence,
          position: parseInt(position), //Ensure integer before sending to backend
          mutant: mutant.toUpperCase(), //Force uppercase for AA consistency
        }),
      });

      const result = await response.json();

      //Store returned IG values in state so React re-renders visualization
      setImportance(result.importance);

    } catch (error) {
      console.error(error);
      alert("Ensure backend is running!");
    }

    setLoading(false);
  };


  //Normalize values between -1 and 1 for color mapping
  //We scale by max absolute value so strongest residue = full intensity color
  const normalize = (vals) => {
    const maxAbs = Math.max(...vals.map((v) => Math.abs(v)));
    if (maxAbs === 0) return vals; //Edge case: no signal
    return vals.map((v) => v / maxAbs);
  };


  return (
    <div style={{ padding: "20px", textAlign: "center", fontFamily: "Arial, sans-serif" }}>

      <h1>Integrated Gradients Visualizer</h1>
      <p style={{ color: "#666" }}>
        Shows how each residue contributes to the mutation score.
      </p>

      {/* Input controls for sequence, mutation position, and mutant AA */}
      <div style={{ marginBottom: "30px" }}>

        {/* Sequence input */}
        <input
          type="text"
          value={sequence}
          onChange={(e) => setSequence(e.target.value.toUpperCase())} //Force uppercase AA
          placeholder="Enter sequence"
          style={{
            padding: "10px",
            width: "250px",
            borderRadius: "4px",
            border: "1px solid #ccc",
          }}
        />

        {/* Mutation position input (0-indexed to match backend logic) */}
        <input
          type="number"
          value={position}
          onChange={(e) => setPosition(e.target.value)}
          placeholder="Position (0-indexed)"
          style={{
            padding: "10px",
            width: "150px",
            borderRadius: "4px",
            border: "1px solid #ccc",
            marginLeft: "10px",
          }}
        />

        {/* Mutant amino acid input (single character) */}
        <input
          type="text"
          maxLength={1} //Only allow one character
          value={mutant}
          onChange={(e) => setMutant(e.target.value.toUpperCase())}
          placeholder="Mutant AA"
          style={{
            padding: "10px",
            width: "120px",
            borderRadius: "4px",
            border: "1px solid #ccc",
            marginLeft: "10px",
          }}
        />

        {/* Trigger computation */}
        <button
          onClick={handleGenerate}
          disabled={loading}
          style={{
            padding: "10px 20px",
            marginLeft: "10px",
            cursor: "pointer",
            backgroundColor: "#007bff",
            color: "white",
            border: "none",
            borderRadius: "4px",
          }}
        >
          {loading ? "Processing..." : "Compute IG"}
        </button>
      </div>


      {/* Visualization region */}
      {importance ? (

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            flexWrap: "wrap", //Wrap long sequences to next line
            padding: "10px",
            backgroundColor: "#f9f9f9",
            borderRadius: "8px",
          }}
        >

          {/* Map each residue to a colored square */}
          {normalize(importance).map((val, idx) => {

            const isMutationSite = idx === parseInt(position); //Highlight mutation site

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
                title={`Pos ${idx} (${sequence[idx]}): ${importance[idx].toFixed(3)}`}

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
                {sequence[idx]} {/* Render residue letter inside square */}
              </div>
            );
          })}
        </div>

      ) : (

        <p style={{ color: "#999" }}>
          {loading
            ? "Computing integrated gradients..."
            : "Enter inputs and click Compute IG."}
        </p>

      )}
    </div>
  );
};

export default IntegratedGradientsVisualizer;
