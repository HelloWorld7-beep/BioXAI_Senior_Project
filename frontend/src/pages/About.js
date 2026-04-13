import React from 'react';
import Navbar from '../components/Navbar';
import '../styles/About.css';

function About() {
    return (
        <div className='about-page-container'>
            <Navbar />
            <div className='about-content'>
                <h1 className='dash-title'>About the Project</h1>
                
                <div className='dash-card'>
                    <div className='about-section'>
                        <h2>Explainable Protein Mutation Scoring</h2>
                        <p>
                            Protein mutations are central to understanding diseases and therapeutic design. 
                            Our project utilizes <strong>Protein Language Models (PLMs)</strong> like ESM-2 or ProtT5 
                            to score mutation impacts with high accuracy.
                        </p>
                    </div>

                    <div className='about-grid'>
                        <div className='grid-item'>
                            <h3>The Motivation</h3>
                            <p>
                                While modern PLMs are powerful, they often lack interpretability. 
                                We bridge this gap by integrating <strong>Explainable AI (XAI) </strong> 
                                to make predictions biologically interpretable for safety-critical 
                                biomedical contexts.
                            </p>
                        </div>
                        <div className='grid-item'>
                            <h3>Technical Pipeline</h3>
                            <ul>
                                <li>Pre-trained PLM Embeddings</li>
                                <li>Mutation Scoring via ProteinGym</li>
                                <li>Integrated Gradients & Attention Heatmaps</li>
                            </ul>
                        </div>
                    </div>
nbvc;
';
                    <hr className='divider' />

                    <div className='team-section'>
                        <h3>The Team</h3>
                        <p><strong>Team Members:</strong> Nada Elseifi, Abigail Lin, Julian Stennett</p>
                        <p><strong>Advisor:</strong> Dr. Ye Xia</p>
                        <p className='university-tag'>University of Florida | Senior Design Project</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default About;