import { useMemo, useState, useContext } from 'react';
import '../styles/AnalysisXAI.css';
import Navbar from '../components/Navbar';
import DashboardBody from '../components/DashboardBody';
import HeatmapGrid from '../components/HeatmapGrid';
import { AnalysisContext } from '../AnalysisContext';

function AnalysisXAI() {
    const methods = ["LRP", "Heatmaps", "Linear"];
    const [selectedMethod, setSelectedMethod] = useState("LRP");
    const [hoveredResidue, setHoveredResidue] = useState(null);
    const { getSelectedRun } = useContext(AnalysisContext);

    const run = getSelectedRun();
    const residues = run?.perResidue?.lrp ?? [];
    const heatmapData = run?.perResidue?.heatmap ?? run?.perResidue?.heatmaps ?? run?.heatmap ?? run?.matrix ?? [];
    const sequence = run?.protein ?? run?.sequence ?? '';

    const maxAbs = useMemo(
        () => residues.reduce((m, r) => Math.max(m, Math.abs(r?.score ?? 0)), 0),
        [residues]
    );

    const sorted = useMemo(
        () => [...residues].sort((a, b) => Math.abs((b?.score ?? 0)) - Math.abs((a?.score ?? 0))),
        [residues]
    );

    const selectedResidue = hoveredResidue || sorted[0] || null;

    const relevanceRatio = (score) => {
        if (!maxAbs) return 0;
        return Math.min(1, Math.abs(score) / maxAbs);
    };

    const colorForScore = (score) => {
        const t = relevanceRatio(score);
        const light = 97 - (49 * t);
        const saturation = 58 + (18 * t);
        // Soft lavender -> deep violet.
        return `hsl(268, ${saturation}%, ${light}%)`;
    };

    const formatScore = (value) => {
        if (typeof value !== 'number' || Number.isNaN(value)) return '--';
        if (value === 0) return '0';
        const abs = Math.abs(value);
        if (abs < 0.00001 || abs >= 100000) return value.toExponential(2);
        return value.toFixed(6);
    };

    const renderLRPView = () => {
        if (!residues.length) {
            return (
                <div className='RenderContent lrp-empty'>
                    No LRP data found for this run. Generate a mutation run first.
                </div>
            );
        }

        return (
            <div className='RenderContent lrp-view'>
                <div className='lrp-sequence-map'>
                    {residues.map((r, idx) => {
                        const ratio = relevanceRatio(r?.score ?? 0);
                        return (
                            <button
                                key={`${r?.residue ?? 'X'}-${r?.position ?? idx}`}
                                type="button"
                                className='lrp-residue'
                                style={{ backgroundColor: colorForScore(r?.score ?? 0) }}
                                onMouseEnter={() => setHoveredResidue(r)}
                                onFocus={() => setHoveredResidue(r)}
                                onMouseLeave={() => setHoveredResidue(null)}
                                aria-label={`Residue ${r?.residue ?? '-'} at position ${r?.position ?? idx + 1}`}
                            >
                                <span className='lrp-residue-aa'>{r?.residue ?? '-'}</span>
                                <span className='lrp-residue-pos'>{r?.position ?? idx + 1}</span>
                                <span className='lrp-residue-bar' style={{ transform: `scaleY(${Math.max(0.08, ratio)})` }} />
                            </button>
                        );
                    })}
                </div>

                <div className='lrp-inspector'>
                    <div className='lrp-inspector-title'>Residue Inspector</div>
                    {selectedResidue ? (
                        <div className='lrp-inspector-stats'>
                            <div><strong>Amino Acid:</strong> {selectedResidue.residue}</div>
                            <div><strong>Position:</strong> {selectedResidue.position}</div>
                            <div><strong>Relevance Score:</strong> {formatScore(selectedResidue.score)}</div>
                            <div><strong>Relative Intensity:</strong> {(relevanceRatio(selectedResidue.score) * 100).toFixed(1)}%</div>
                        </div>
                    ) : (
                        <div className='lrp-inspector-stats'>Hover a residue to inspect details.</div>
                    )}
                </div>
            </div>
        );
    };

    const renderHeatmapView = () => {
        if (!heatmapData.length) {
            return (
                <div className='RenderContent'>
                    No heatmap data found for this run. Generate a mutation run first.
                </div>
            );
        }

        return (
            <div className='RenderContent'>
                <HeatmapGrid sequence={sequence} data={heatmapData} />
            </div>
        );
    };

    const renderContent = () => {
        switch (selectedMethod) {
            case "LRP":
                return renderLRPView();
            case "Heatmaps":
                return renderHeatmapView();
            case "Linear":
                return <div className='RenderContent'>Linear Explanation</div>;
            default:
                return <div className='RenderContent'>Please select an XAI method</div>;
        }
    };

    return (
        <div className='body'>
            <Navbar />

            <DashboardBody
                title="XAI Dashboard"
                subTitle="Visual Summary"
            >
                <div className="xai-card">
                    <div className="xai-card-sidebar">
                        <div className="card-select">
                            <div className="select-wrapper">
                                <select
                                    value={selectedMethod}
                                    onChange={(e) => setSelectedMethod(e.target.value)}
                                >
                                    <option value="">XAI Method</option>
                                    {methods.map((method) => (
                                        <option key={method} value={method}>
                                            {method}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {selectedMethod === "LRP" && (
                            <div className='legend'>
                                <div className='legend-title'>Importance Legend</div>
                                <div className='entries'>
                                    <div className='entry-l'>
                                        <div className='entry-bubble-1'></div>
                                        <div className='entry-level'>Low (0-25% max)</div>
                                    </div>
                                    <div className='entry-l'>
                                        <div className='entry-bubble-2'></div>
                                        <div className='entry-level'>Medium (25-50%)</div>
                                    </div>
                                    <div className='entry-l'>
                                        <div className='entry-bubble-3'></div>
                                        <div className='entry-level'>High (50-75%)</div>
                                    </div>
                                    <div className='entry-l'>
                                        <div className='entry-bubble-4'></div>
                                        <div className='entry-level'>Critical (75-100%)</div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {selectedMethod === "Heatmaps" && (
                            <div className='legend'>
                                <div className='legend-title'>Heatmap Info</div>
                                <div className='entries'>
                                    <div className='entry-l'>
                                        <div className='entry-level'>Darker red means stronger attention between residues.</div>
                                    </div>
                                    <div className='entry-l'>
                                        <div className='entry-level'>Hover over a square to see the residue pair and score.</div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="xai-card-content">
                        {renderContent()}
                    </div>
                </div>

            </DashboardBody>
        </div>
    );
}

export default AnalysisXAI;