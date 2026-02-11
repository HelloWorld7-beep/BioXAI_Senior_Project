import { useState } from 'react';
import '../styles/AnalysisInput.css';
import Navbar from '../components/Navbar';
import DashboardBody from '../components/DashboardBody';

function AnalysisInput() {
      const [items, setItems] = useState([
        "Run 1",
        "Run 2",
        "Run 3"
    ]);

    const [selected, setSelected] = useState("");
    
    return (
        <div className='body'>
            <Navbar/>
            <DashboardBody title={"XAI Dashboard"} 
                subTitle={"Summary"} 
                buttonName={"Previous Visuals"} 
                options={items}
                value={selected}
                onChange={setSelected}
                content={
                    <div>
                        Component Goes Here! (Check Pages Folder)
                    </div>
                }
            />
        </div>
    )
}

export default AnalysisInput;