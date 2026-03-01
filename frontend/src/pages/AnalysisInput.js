// analysisInput.js

import { useContext, useState } from "react";
import { useNavigate } from 'react-router-dom';
import Navbar from "../components/Navbar";
import DashboardBody from "../components/DashboardBody";
import { AnalysisContext } from "../AnalysisContext";
import '../styles/AnalysisInput.css';

const BASE = 'http://127.0.0.1:5000';

function AnalysisInput() {
  const {
    protein,
    setProtein,
    mutation,
    setMutation,
    addRun,
  } = useContext(AnalysisContext);

  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const postJson = async (url, payload) => {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    let body = {};
    try {
      body = text ? JSON.parse(text) : {};
    } catch (_) {
      body = { error: text || `Non-JSON response from ${url}` };
    }

    if (!res.ok) {
      throw new Error(body.error || `Request failed (${res.status})`);
    }
    return body;
  };

  const handleRun = async () => {
    if (isLoading) return;

    // basic sanity check before firing off the requests
    const seq = protein.trim();
    const mut = mutation.trim();

    if (!seq) {
      alert('Please provide a protein sequence.');
      return;
    }

    // mutation must follow <WT><pos><MUT> e.g. A123V; multiple mutations
    // can be separated by commas, spaces or semicolons (same as backend).
    const mutationRegex = /^[A-Za-z]\d+[A-Za-z](?:[,;/\s]+[A-Za-z]\d+[A-Za-z])*$/;
    if (mut && !mutationRegex.test(mut)) {
      alert(
        'Invalid mutation format. Example: A123V or A123V,G45E. ' +
          'Do not leave off the mutated residue (e.g. A12 is not valid).'
      );
      return;
    }

    const payload = { sequence: seq, mutation: mut };

    try {
      setIsLoading(true);

      // Run sequentially to avoid model initialization races on first run.
      const embedRes = await postJson(`${BASE}/residues-embed`, payload);
      const logRes = await postJson(`${BASE}/residues-log`, payload);
      const embedScoreRes = await postJson(`${BASE}/score-embed`, payload);
      const logScoreRes = await postJson(`${BASE}/score-log`, payload);
      const lrpRes = await postJson(`${BASE}/lrp`, payload);

      // if any of the responses carry an `error` key bail out and inform user
      const responses = [embedRes, logRes, embedScoreRes, logScoreRes, lrpRes];
      const err = responses.find((r) => r && r.error);
      if (err) {
        alert(`Server error: ${err.error}`);
        return;
      }

      const embedShift = embedRes?.embedShift ?? [];
      const logShift   = logRes?.logShift     ?? [];
      const embedScore = embedScoreRes?.embeddingDistance ?? 0;
      const logScore   = logScoreRes?.logLikelihood       ?? 0;
      const lrpData    = lrpRes?.lrp                      ?? [];

      // addRun now accepts lrpData as the fifth argument
      addRun(embedScore, logScore, logShift, embedShift, lrpData);

      navigate('/analysis/results');
    } catch (err) {
      console.error('Failed to fetch analysis from backend:', err);
      alert(err.message || 'An error occurred when contacting the server. See console for details.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="body">
      <Navbar />

      <DashboardBody title="Analysis" subTitle="Sequence Input">
        <div className="input-container">
          <input
            className="text-input"
            type="text"
            placeholder="Protein Sequence"
            value={protein}
            disabled={isLoading}
            onChange={(e) => setProtein(e.target.value)}
          />

          <input
            className="text-input"
            type="text"
            placeholder="Mutation (e.g. A123V)"
            value={mutation}
            disabled={isLoading}
            onChange={(e) => setMutation(e.target.value)}
          />

          <button className="run-button" onClick={handleRun} disabled={isLoading}>
            {isLoading ? 'Scoring in progress...' : 'Run Mutation Scoring'}
          </button>

          {isLoading && (
            <div className="analysis-loading">
              <div className="analysis-spinner" />
              <div className="analysis-loading-text">Running mutation scoring. First run can take longer while models warm up.</div>
            </div>
          )}
        </div>
      </DashboardBody>
    </div>
  );
}

export default AnalysisInput;
