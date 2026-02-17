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
                            <span className="info" title={protein}>
                                Protein: {protein?.length > 5 ? `${protein.slice(0, 5)}...` : (protein || "—")}
                            </span>
                            <span className="info" title={mutation}>
                                Mutation: {mutation?.length > 5 ? `${mutation.slice(0, 5)}...` : (mutation || "—")}
                            </span>
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
