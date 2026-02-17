import { useState, useContext } from 'react';
import '../styles/AnalysisXAI.css';
import Navbar from '../components/Navbar';
import DashboardBody from '../components/DashboardBody';
import { AnalysisContext } from '../AnalysisContext';

function AnalysisXAI() {
    const methods = ["LRP", "Heatmaps", "Linear"];
    const [selectedMethod, setSelectedMethod] = useState("");

    const renderContent = () => {
        switch (selectedMethod) {
            case "LRP":
                return <div className='RenderContent'>LRP Visualization</div>;
            case "Heatmaps":
                return <div className='RenderContent'>Heatmap Visualization</div>;
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
                                    <option value="">XAI Method Selector</option>
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
                                    <div className='entry'>
                                        <div className='entry-bubble-1'></div>
                                        <div className='entry-level'>Benign</div>
                                    </div>
                                    <div className='entry'>
                                        <div className='entry-bubble-2'></div>
                                        <div className='entry-level'>Mild</div>
                                    </div>
                                    <div className='entry'>
                                        <div className='entry-bubble-3'></div>
                                        <div className='entry-level'>Moderate</div>
                                    </div>
                                    <div className='entry'>
                                        <div className='entry-bubble-4'></div>
                                        <div className='entry-level'>Severe</div>
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