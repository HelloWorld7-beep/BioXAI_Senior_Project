# app.py

import os
import re
import ssl

from flask import Flask, request, jsonify
from flask_cors import CORS
import certifi

from attention_engine import get_attention_matrix
from embedding_engine import EmbeddingEngine
from likelihood_engine import LikelihoodEngine
from lrp_engine import LRPEngine
from mutation_utils import parse_mutation, apply_mutation


def _configure_ssl_cert_bundle():
    """
    Ensure Python/urllib use a known CA bundle so ESM model downloads
    don't fail with CERTIFICATE_VERIFY_FAILED on local macOS setups.
    """
    ca_bundle = certifi.where()
    os.environ.setdefault("SSL_CERT_FILE", ca_bundle)
    os.environ.setdefault("REQUESTS_CA_BUNDLE", ca_bundle)
    os.environ.setdefault("CURL_CA_BUNDLE", ca_bundle)
    ssl._create_default_https_context = lambda: ssl.create_default_context(cafile=ca_bundle)


_configure_ssl_cert_bundle()

app = Flask(__name__)
_ALLOWED_ORIGINS = {"http://localhost:3000", "http://127.0.0.1:3000"}
CORS(
    app,
    resources={r"/*": {"origins": list(_ALLOWED_ORIGINS)}},
    methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)


@app.after_request
def _add_cors_headers(response):
    origin = request.headers.get("Origin")
    if origin in _ALLOWED_ORIGINS:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Vary"] = "Origin"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    return response


@app.route("/", defaults={"_path": ""}, methods=["OPTIONS"])
@app.route("/<path:_path>", methods=["OPTIONS"])
def _handle_preflight(_path):
    return ("", 204)

# ---------------------------------------------------------------------------
# Shared engine instances (lazy-loaded on first request)
# ---------------------------------------------------------------------------
_embed_engine = EmbeddingEngine()
_ll_engine    = LikelihoodEngine()
_lrp_engine   = LRPEngine()

_MUTATION_RE = re.compile(r"^[A-Za-z]\d+[A-Za-z](?:[,;/\s]+[A-Za-z]\d+[A-Za-z])*$")
_SEQUENCE_RE = re.compile(r"^[A-Za-z]+$")


def _clean_input(value):
    """Normalize UI strings; tolerate surrounding quote characters."""
    if value is None:
        return ""
    text = str(value).strip()
    return text.strip("\"'")


def _normalize_sequence_and_mutation(data: dict):
    """
    Accept both split inputs and a "combo paste" where sequence + mutation are in one field.
    Example combo:
        NLYIQWLKDGGPSSGRPPPS
        Q5G
    """
    sequence = _clean_input(data.get("sequence", ""))
    mutation = _clean_input(data.get("mutation", ""))

    if sequence and not mutation:
        tokens = [t for t in re.split(r"\s+", sequence) if t]
        if len(tokens) >= 2:
            maybe_mut = tokens[-1]
            maybe_seq = "".join(tokens[:-1])
            if _SEQUENCE_RE.fullmatch(maybe_seq) and _MUTATION_RE.fullmatch(maybe_mut):
                sequence, mutation = maybe_seq, maybe_mut

    sequence = re.sub(r"\s+", "", sequence).upper()
    mutation = mutation.upper()
    return sequence, mutation


def _get_sequences(data: dict):
    """
    Extract wt_seq and mut_seq from a request payload.

    Accepts either:
      a) {"sequence": "MAKVL...", "mutation": "A123V"}   ← standard form
      b) {"wt_sequence": "...",  "mut_sequence": "..."}  ← explicit form
    """
    if "wt_sequence" in data and "mut_sequence" in data:
        return data["wt_sequence"], data["mut_sequence"]

    sequence, mutation = _normalize_sequence_and_mutation(data)

    if not sequence:
        raise ValueError("No sequence provided.")
    if not _SEQUENCE_RE.fullmatch(sequence):
        raise ValueError("Sequence must contain only amino-acid letters (A-Z).")
    if not mutation:
        # No mutation → wt == mut (zero-distance baseline)
        return sequence, sequence

    mut_seq = apply_mutation(sequence, mutation)
    return sequence, mut_seq


# ---------------------------------------------------------------------------
# Existing attention endpoint (unchanged)
# ---------------------------------------------------------------------------
@app.route('/get-attention', methods=['POST'])
def handle_attention():
    data = request.json
    sequence = data.get("sequence")
    if not sequence:
        return jsonify({"error": "No sequence provided"}), 400

    matrix = get_attention_matrix(sequence)
    return jsonify({"matrix": matrix})


# ---------------------------------------------------------------------------
# Scalar embedding distance
# ---------------------------------------------------------------------------
@app.route('/score-embed', methods=['POST'])
def score_embed():
    data = request.json or {}
    try:
        wt_seq, mut_seq = _get_sequences(data)
    except (ValueError, KeyError) as e:
        return jsonify({"error": str(e)}), 400

    try:
        result = _embed_engine.score(wt_seq, mut_seq)
    except Exception as e:
        return jsonify({"error": f"Embedding scoring failed: {e}"}), 500

    return jsonify({
        "embeddingDistance": result.cosine_distance,
        "l2Distance":        result.l2_distance,
        "sequence":          data.get("sequence"),
        "mutation":          data.get("mutation"),
    })


# ---------------------------------------------------------------------------
# Scalar log-likelihood (masked marginal)
# ---------------------------------------------------------------------------
@app.route('/score-log', methods=['POST'])
def score_log():
    data = request.json or {}
    try:
        wt_seq, mut_seq = _get_sequences(data)
    except (ValueError, KeyError) as e:
        return jsonify({"error": str(e)}), 400

    try:
        result = _ll_engine.score(wt_seq, mut_seq)
    except Exception as e:
        return jsonify({"error": f"Log-likelihood scoring failed: {e}"}), 500

    return jsonify({
        "logLikelihood": result.delta_ll,
        "sequence":      data.get("sequence"),
        "mutation":      data.get("mutation"),
    })


# ---------------------------------------------------------------------------
# Per-residue embedding shift (vector)
# ---------------------------------------------------------------------------
@app.route('/residues-embed', methods=['POST'])
def residues_embed():
    data = request.json or {}
    try:
        wt_seq, mut_seq = _get_sequences(data)
    except (ValueError, KeyError) as e:
        return jsonify({"error": str(e)}), 400

    try:
        result = _embed_engine.residues(wt_seq, mut_seq)
    except Exception as e:
        return jsonify({"error": f"Embedding residue scoring failed: {e}"}), 500

    return jsonify({
        "embedShift": result.residues,   # [{"residue": "A", "position": 1, "score": 0.03}, ...]
        "sequence":   data.get("sequence"),
        "mutation":   data.get("mutation"),
    })


# ---------------------------------------------------------------------------
# Per-residue log-likelihood shift (vector)
# ---------------------------------------------------------------------------
@app.route('/residues-log', methods=['POST'])
def residues_log():
    data = request.json or {}
    try:
        wt_seq, mut_seq = _get_sequences(data)
    except (ValueError, KeyError) as e:
        return jsonify({"error": str(e)}), 400

    try:
        result = _ll_engine.residues(wt_seq, mut_seq)
    except Exception as e:
        return jsonify({"error": f"Log-likelihood residue scoring failed: {e}"}), 500

    return jsonify({
        "logShift": result.residues,   # [{"residue": "A", "position": 1, "score": -1.2}, ...]
        "sequence": data.get("sequence"),
        "mutation": data.get("mutation"),
    })


# ---------------------------------------------------------------------------
# LRP / Integrated Gradients per-residue relevance
# ---------------------------------------------------------------------------
@app.route('/lrp', methods=['POST'])
def lrp():
    """
    Body:
        {
            "sequence": "MAKVL...",
            "mutation": "A123V"       ← used to determine target_pos and target_aa
        }

    Returns:
        {
            "lrp": [{"residue": "A", "position": 1, "score": 0.043}, ...],
            "method": "integrated_gradients",
            "targetPosition": 122,
            "targetAa": "V"
        }
    """
    data = request.json or {}
    sequence, mutation = _normalize_sequence_and_mutation(data)

    if not sequence:
        return jsonify({"error": "No sequence provided."}), 400
    if not mutation:
        return jsonify({"error": "No mutation provided (needed to define target position)."}), 400

    try:
        parsed = parse_mutation(mutation)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    # For multi-mutation, explain w.r.t. the first mutated position
    if parsed["type"] == "multi":
        first = parsed["mutations"][0]
        target_pos, target_aa = first["pos"], first["mut"]
    else:
        target_pos, target_aa = parsed["pos"], parsed["mut"]

    try:
        result = _lrp_engine.compute(sequence, target_pos, target_aa)
    except Exception as e:
        return jsonify({"error": f"LRP computation failed: {e}"}), 500

    return jsonify({
        "lrp":            result.residues,
        "method":         result.method,
        "targetPosition": result.target_position,
        "targetAa":       result.target_aa,
        "sequence":       sequence,
        "mutation":       mutation,
    })


# ---------------------------------------------------------------------------
# Full mutational scan (optional heavy endpoint)
# ---------------------------------------------------------------------------
@app.route('/scan', methods=['POST'])
def scan():
    """
    Scores all 19 possible substitutions at every position.
    Returns a flat list sorted by delta_ll ascending (most damaging first).
    """
    data = request.json or {}
    sequence = data.get("sequence", "")
    if not sequence:
        return jsonify({"error": "No sequence provided."}), 400

    results = _ll_engine.scan(sequence)
    results.sort(key=lambda x: x["delta_ll"])

    return jsonify({"scan": results, "sequence": sequence})


if __name__ == "__main__":
    app.run(port=5000, debug=True)
