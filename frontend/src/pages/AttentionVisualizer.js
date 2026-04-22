import React, { useState } from 'react';
import HeatmapGrid from '../components/HeatmapGrid';

const AttentionVisualizer = () => {
  const [sequence, setSequence] = useState("MAGRS");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      // This fetch talks to your Flask server running on port 5000
      const response = await fetch('http://127.0.0.1:5000/get-attention', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sequence: sequence })
      });
      const result = await response.json();
      setData(result.matrix); 
    } catch (error) {
      console.error("Connection failed:", error);
      alert("Make sure your Flask backend is running!");
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: '20px', textAlign: 'center', fontFamily: 'Arial, sans-serif' }}>
      <h1>Attention Heatmap Visualizer</h1>
      <p style={{ color: '#666' }}>Identify residue-residue dependencies and epistatic interactions.</p>
      
      <div style={{ marginBottom: '30px' }}>
        <input 
          type="text" 
          value={sequence} 
          onChange={(e) => setSequence(e.target.value.toUpperCase())}
          placeholder="Enter sequence (e.g. MAGRS)"
          style={{ padding: '10px', width: '250px', borderRadius: '4px', border: '1px solid #ccc' }}
        />
        <button 
          onClick={handleGenerate} 
          disabled={loading} 
          style={{ padding: '10px 20px', marginLeft: '10px', cursor: 'pointer', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px' }}
        >
          {loading ? "Processing..." : "Generate Heatmap"}
        </button>
      </div>

      {/* This container below centers the heatmap on your screen */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '300px',
        backgroundColor: '#f9f9f9',
        borderRadius: '8px',
        padding: '20px'
      }}>
        {data ? (
          <HeatmapGrid sequence={sequence} data={data} />
        ) : (
          <p style={{ color: '#999' }}>
            {loading ? "ESM-2 is analyzing the transformer layers..." : "Enter a protein sequence and click generate to begin."}
          </p>
        )}
      </div>
    </div>
  );
};

export default AttentionVisualizer;