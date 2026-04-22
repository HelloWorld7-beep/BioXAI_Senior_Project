import React from "react";
import Navbar from "../components/Navbar";
import "../styles/Tensorboard.css";

function TensorboardVisual() {
  return (
    <div className="tensorboard-page-container">
      <Navbar />

      <div className="tensorboard-content">
        <h1 className="dash-title">TensorBoard Visualization</h1>

        <div className="dash-card">
          <p className="tensorboard-description">
            A visualization of the high-dimensional embeddings using TensorBoard. (TODO: add some more explanations later)
          </p>

          <div className="tensorboard-frame-wrapper">
            <iframe
              src="http://localhost:6006"
              title="TensorBoard"
              className="tensorboard-frame"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default TensorboardVisual;
