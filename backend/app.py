from flask import Flask, request, jsonify
from flask_cors import CORS
from attention_engine import get_attention_matrix

app = Flask(__name__)
CORS(app) # Allows the React frontend to talk to this Python server

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

if __name__ == "__main__":
    app.run(port=5000, debug=True)