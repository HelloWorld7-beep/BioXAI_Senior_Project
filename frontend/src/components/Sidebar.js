import "../styles/Sidebar.css";
import { NavLink } from "react-router-dom";
import { FaPlus, FaChartPie, FaChartLine } from "react-icons/fa";

function Sidebar() {
    return (
        <div className="dash-nav">
            <div className="spacer"></div>
            <NavLink to="/analysis" end className="dash-link">
                <div className="icon"><FaPlus size={16} /></div>
                <div className="label">Protein Input</div>
            </NavLink>
            <NavLink to="/analysis/results" end className="dash-link">
                <div className="icon"><FaChartPie size={16} /></div>
                <div className="label">Results</div>
            </NavLink>
            <NavLink to="/analysis/XAI" end className="dash-link">
                <div className="icon"><FaChartLine size={16} /></div>
                <div className="label">XAI Visualization</div>
            </NavLink>
        </div>
    );
}

export default Sidebar;