import { useState } from 'react';
import '../styles/AnalysisResult.css';
import Navbar from '../components/Navbar';
import DashboardBody from '../components/DashboardBody';
import { PiVectorThreeBold } from "react-icons/pi"
import { MdGraphicEq } from "react-icons/md";
import { FaArrowDownLong, FaArrowUpLong, FaArrowRightLong  } from "react-icons/fa6";

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
            <DashboardBody
                title="Results Dashboard"
                subTitle="Summary"
            >
                <div className="results-container">
                    <div className="distance-container">

                        <div className="distance-container-entry">
                            <div className="distance-container-title"><PiVectorThreeBold size={16}/>Embedding Distance</div>
                            <div className="distance-container-stats">
                                <div className="main-distance-score">
                                    10.4
                                </div>
                                <div className="distance-compare-score">
                                    <div className="percent-change-num"><FaArrowDownLong size={11}/>32.7%</div>
                                    <div className="percent-change-name">vs last mutation</div>
                                </div>
                            </div>
                        </div>

                        <div className="distance-container-entry-2">
                            <div className="distance-container-title"><MdGraphicEq size={16}/>Log-Likelihood Impact</div>
                            <div className="distance-container-stats">
                                <div className="main-distance-score">
                                    5.80
                                </div>
                                <div className="distance-compare-score">
                                    <div className="percent-change-num"><FaArrowUpLong size={11}/>12.7%</div>
                                    <div className="percent-change-name">vs last mutation</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="summary-title-container">
                        <div className="summary-title">Explanation Summary</div>
                        <div className="summary-subtitle">Key Residues Highlighted</div>
                    </div>
                    <div className="residue-container">
                        <div className="entry">
                            <div className="entry-title">C</div>
                            <div className="entry-score">0.82</div>
                        </div>
                        <div className="entry">
                            <div className="entry-title">A</div>
                            <div className="entry-score">0.81</div>
                        </div>
                        <div className="entry">
                            <div className="entry-title">G</div>
                            <div className="entry-score">0.72</div>
                        </div>
                        <div className="entry">
                            <div className="entry-title">T</div>
                            <div className="entry-score">0.67</div>
                        </div>
                        <div className="entry">
                            <div className="entry-next"><FaArrowRightLong size={17}/></div>
                            <div className="entry-score">View all</div>
                        </div>
                    </div>
                </div>
            </DashboardBody>
        </div>
    )
}

export default AnalysisResult;