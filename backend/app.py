from flask import Flask, request, jsonify
from flask_cors import CORS
from attention_engine import get_attention_matrix
from integrated_gradients_engine import IntegratedGradientsEngine

app = Flask(__name__)
CORS(app) # Allows the React frontend to talk to this Python server

device = "cuda" if torch.cuda.is_available() else "cpu"

#Load the ESM-2 model and alphabet once, to ominimize latency
model_version = "esm2_t33_650M_UR50D"
model, alphabet = esm.pretrained.load_model_and_alphabet(model_version)
model = model.to(device)
model.eval()

@app.route('/get-attention', methods=['POST'])
def handle_attention():
    # 1. Get the protein sequence sent from the React frontend
    data = request.json
    sequence = data.get("sequence")

    if not sequence:
        return jsonify({"error": "No sequence provided"}), 400

    # 2. Call your verified extraction engine to get the real Layer 33 weights
    matrix = get_attention_matrix(sequence)

    # 3. Send the matrix back to React to update the HeatmapGrid
    return jsonify({"matrix": matrix})

ig_engine = IntegratedGradientsEngine(model, alphabet)

@app.route('/get-integrated-gradients', methods=['POST'])
def handle_integrated_gradients():
    data = request.json
    sequence = data.get("sequence")
    position = data.get("position")
    mutant = data.get("mutant")

    if not sequence:
        return jsonify({"error": "No sequence provided"}), 400

    importance = ig_engine.compute(sequence, position, mutant)
    return jsonify({"importance": importance.tolist()})


if __name__ == "__main__":
    app.run(port=5000, debug=True)
