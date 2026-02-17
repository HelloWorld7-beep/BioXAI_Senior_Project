import { useState } from 'react';
import '../styles/AnalysisResult.css';
import Navbar from '../components/Navbar';
import DashboardBody from '../components/DashboardBody';

function AnalysisResult() {
      const [items, setItems] = useState([
        "Run 1",
        "Run 2",
        "Run 3"
    ]);

    const [selected, setSelected] = useState("");
    
    return (
        <div className='body'>
            <Navbar/>
            <DashboardBody title={"Results Dashboard"} 
                subTitle={"Summary"} 
                buttonName={"Previous Visuals"} 
                options={items}
                value={selected}
                onChange={setSelected}
                content={
                    <div>
                        Component Goes Here!
                    </div>
                }
            />
        </div>
    )
}

export default AnalysisResult;