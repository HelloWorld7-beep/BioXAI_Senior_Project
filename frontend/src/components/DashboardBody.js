import "../styles/DashboardBody.css";
import Sidebar from "./Sidebar";
import { useContext } from "react";
import { AnalysisContext } from "../AnalysisContext";

function DashboardBody({ title, subTitle, children }) {
    const {
        protein,
        mutation,
        runs,
        selectedRunId,
        selectRun
    } = useContext(AnalysisContext);

    return (
        <div className="dashboard-body-container">
            <div className="dashboard-body">
                <Sidebar />

                <div className="dash-content">
                    <div className="dash-title">{title}</div>

                    <div className="dash-card">
                        <div className="card-header">
                            <div className="card-title">{subTitle}</div>

                            <div className="card-select">
                                <div className="select-wrapper">
                                    <select
                                    value={selectedRunId}
                                    onChange={(e) => selectRun(e.target.value)}
                                    >
                                    <option value="">Previous Inputs</option>
                                    {runs.map(run => (
                                        <option key={run.id} value={run.id}>
                                        {run.protein} - {run.mutation}
                                        </option>
                                    ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Shared System Info */}
                        <div className="protein-header">
                            <span className="info">Protein: {protein || "—"}</span>
                            <span className="info">Mutation: {mutation || "—"}</span>
                        </div>

                        <div className="card-body">
                            {children}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default DashboardBody;
