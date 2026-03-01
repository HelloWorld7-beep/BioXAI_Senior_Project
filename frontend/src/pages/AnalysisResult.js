import { useState, useContext, useEffect } from 'react';
import '../styles/AnalysisResult.css';
import Navbar from '../components/Navbar';
import DashboardBody from '../components/DashboardBody';
import { PiVectorThreeBold } from "react-icons/pi"
import { MdGraphicEq } from "react-icons/md";
import { FaArrowDownLong, FaArrowUpLong, FaArrowRightLong  } from "react-icons/fa6";
import { AnalysisContext } from '../AnalysisContext';
import { Link } from 'react-router-dom';

const SMALL_THRESHOLD = 0.1;
const LARGE_THRESHOLD = 100;

const formatNumberParts = (value, fixed = 4, mode = 'default') => {
    if (typeof value !== 'number' || Number.isNaN(value) || !Number.isFinite(value)) {
        return { kind: 'text', text: '--' };
    }
    if (value === 0) return { kind: 'text', text: '0' };

    const abs = Math.abs(value);
    const useSci = mode === 'compact'
        ? (abs < 1 || abs >= LARGE_THRESHOLD)
        : mode === 'residue'
            ? (abs >= 100000 || abs < 0.00001)
            : (abs < SMALL_THRESHOLD || abs >= LARGE_THRESHOLD);

    if (useSci) {
        const exponent = Math.floor(Math.log10(abs));
        const coefficient = value / Math.pow(10, exponent);
        return {
            kind: 'sci',
            coefficient: coefficient.toFixed(2),
            exponent,
        };
    }

    return { kind: 'text', text: value.toFixed(fixed) };
};

const renderNumber = (value, fixed = 4, mode = 'default') => {
    const parts = formatNumberParts(value, fixed, mode);
    if (parts.kind === 'text') return parts.text;
    return (
        <span className="score-sci">
            {parts.coefficient}
            <span className="score-mul">x10</span>
            <sup className="score-exp">{parts.exponent}</sup>
        </span>
    );
};

function AnalysisResult() {
        const { protein, mutation, getCurrentRuns, selectedRunId, setSelectedRunId, getSelectedRun, getComparisonForProtein } = useContext(AnalysisContext);

        const [selectedMetric, setSelectedMetric] = useState('embed'); // 'embed' or 'log'

        // ensure there's a selected run (choose most recent if none)
        useEffect(() => {
            const runs = getCurrentRuns();
            if (!selectedRunId && runs && runs.length > 0) {
                setSelectedRunId(runs[0].id);
            }
        }, [getCurrentRuns, selectedRunId, setSelectedRunId]);
    
    return (
        <div className='body'>
            <Navbar/>
            <DashboardBody
                title="Results Dashboard"
                subTitle="Summary"
            >
                <div className="results-container">
                    <div className="distance-container">

                                                {(() => {
                                                    const run = getSelectedRun();
                                                    const comparison = run ? getComparisonForProtein(run.protein, run.id) : null;

                                                    // Debug: show stored runs and comparison in console
                                                    try {
                                                        // eslint-disable-next-line no-console
                                                        console.log('DEBUG runs for protein', run?.protein, getCurrentRuns());
                                                        // eslint-disable-next-line no-console
                                                        console.log('DEBUG selected run', run, 'comparison', comparison);
                                                    } catch (e) {
                                                        // ignore
                                                    }

                                                    const embedVal = run?.embeddingDistance;
                                                    const logVal = run?.logLikelihood;

                                                    const embedChange = comparison?.embedChange;
                                                    const logChange = comparison?.logChange;

                                                    const embedChangeVisible = embedChange !== undefined && embedChange !== null && embedChange !== 0;
                                                    const logChangeVisible = logChange !== undefined && logChange !== null && logChange !== 0;

                                                    return (
                                                        <>
                                                            <div className={"distance-container-entry " + (selectedMetric === 'embed' ? 'selected' : 'unselected')} onClick={() => setSelectedMetric('embed')}>
                                                                <div className="distance-container-title"><PiVectorThreeBold size={16}/>Embedding Distance</div>
                                                                <div className="distance-container-stats">
                                                                    <div className="main-distance-score">{renderNumber(embedVal, 6)}</div>
                                                                    <div className="distance-compare-score">
                                                                        {embedChangeVisible && (
                                                                            <div className="percent-change-num">
                                                                                {embedChange > 0 ? <FaArrowUpLong size={11}/> : <FaArrowDownLong size={11}/>}
                                                                                {Math.abs(embedChange)}%
                                                                            </div>
                                                                        )}
                                                                        <div className="percent-change-name">vs last mutation</div>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className={"distance-container-entry-2 " + (selectedMetric === 'log' ? 'selected' : 'unselected')} onClick={() => setSelectedMetric('log')}>
                                                                <div className="distance-container-title"><MdGraphicEq size={16}/>Log-Likelihood Impact</div>
                                                                <div className="distance-container-stats">
                                                                    <div className="main-distance-score">{renderNumber(logVal, 4, 'compact')}</div>
                                                                    <div className="distance-compare-score">
                                                                        {logChangeVisible && (
                                                                            <div className="percent-change-num">
                                                                                {logChange > 0 ? <FaArrowUpLong size={11}/> : <FaArrowDownLong size={11}/>}
                                                                                {Math.abs(logChange)}%
                                                                            </div>
                                                                        )}
                                                                        <div className="percent-change-name">vs last mutation</div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </>
                                                    );
                                                })()}
                    </div>
                    <div className="summary-title-container">
                        <div className="summary-title">Explanation Summary</div>
                        <div className="summary-subtitle">Key Residues Highlighted</div>
                    </div>
                                        <div className="residue-container">
                                                {(() => {
                                                    const run = getSelectedRun();
                                                    const residues = run ? (selectedMetric === 'embed' ? run.perResidue?.embedShift : run.perResidue?.logShift) : null;
                                                    const list = residues && Array.isArray(residues)
                                                        ? [...residues]
                                                            .sort((a, b) => Math.abs((b?.score ?? 0)) - Math.abs((a?.score ?? 0)))
                                                            .slice(0, 4)
                                                        : [];

                                                    return (
                                                        <>
                                                            {list.map((r, idx) => (
                                                                <div key={idx} className="entry">
                                                                    <div className="entry-title">{r?.residue ?? '-'}{r?.position ? ` ${r.position}` : ''}</div>
                                                                    <div className="entry-score">{renderNumber(r?.score, 6, 'residue')}</div>
                                                                </div>
                                                            ))}

                                                            <div className="entry">
                                                                <Link to="/analysis/xai" className="entry-next" style={{textDecoration: 'none'}}><FaArrowRightLong size={17}/></Link>
                                                                <div className="entry-score">View all</div>
                                                            </div>
                                                        </>
                                                    );
                                                })()}
                                        </div>
                </div>
            </DashboardBody>
        </div>
    )
}

export default AnalysisResult;
