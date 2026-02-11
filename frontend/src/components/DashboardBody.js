import "../styles/DashboardBody.css";
import Sidebar from "./Sidebar";

function DashboardBody(props) {
    return (
        <div className ="dashboard-body-container">
            <div className="dashboard-body">
                <Sidebar />
                <div className="dash-content">
                    <div className="dash-title">{props.title}</div>
                    <div className="dash-card">
                        <div className="card-header">
                            <div className="card-title">{props.subTitle}</div>
                            <div className="card-select">
                                <div className="select-wrapper">
                                    <select value={props.value} onChange={e => props.onChange(e.target.value)}>
                                        <option value="">{props.buttonName}</option>
                                        {props.options.map(item => (
                                            <option key={item} value={item}>
                                            {item}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div className="card-body">
                            {props.content}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default DashboardBody;