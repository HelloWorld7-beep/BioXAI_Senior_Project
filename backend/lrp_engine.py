"""
lrp_engine.py
-------------
Layer-wise Relevance Propagation (LRP) on ESM-2.

Returns per-residue relevance scores suitable for graphing, formatted as:
  [{"residue": "A", "position": 1, "score": 0.043}, ...]

Approach: Integrated Gradients via captum as a principled LRP proxy,
with a fallback to gradient × input saliency when captum is unavailable.
"""

import torch
import torch.nn.functional as F
from dataclasses import dataclass, field
from typing import List, Optional
import threading


@dataclass
class LRPResult:
    """Output of a single LRP run."""
    residues: List[dict]              # [{"residue": "A", "position": 1, "score": 0.04}, ...]
    target_position: int              # 0-indexed mutation site
    target_aa: str                    # mutant amino acid
    method: str = "integrated_gradients"
    raw_scores: Optional[List[float]] = field(default=None, repr=False)


class LRPEngine:
    """
    Computes per-residue relevance for a target mutation position on ESM-2.

    Usage:
        engine = LRPEngine()
        result = engine.compute(wt_sequence, target_pos=41, target_aa="G")
        # result.residues -> [{"residue": "A", "position": 1, "score": 0.04}, ...]
    """

    def __init__(self, model_name: str = "esm2_t33_650M_UR50D"):
        self.model_name = model_name
        self._model = None
        self._alphabet = None
        self._batch_converter = None
        self._load_lock = threading.Lock()

    # ------------------------------------------------------------------ #
    #  Lazy load — avoids importing ESM at module level                    #
    # ------------------------------------------------------------------ #
    def _load(self):
        if self._model is not None and self._alphabet is not None and self._batch_converter is not None:
            return
        with self._load_lock:
            if self._model is not None and self._alphabet is not None and self._batch_converter is not None:
                return
            import esm
            loader = getattr(esm.pretrained, self.model_name)
            model, alphabet = loader()
            batch_converter = alphabet.get_batch_converter()
            model.eval()
            # Publish all runtime objects atomically after successful load.
            self._model = model
            self._alphabet = alphabet
            self._batch_converter = batch_converter

    # ------------------------------------------------------------------ #
    #  Public API                                                           #
    # ------------------------------------------------------------------ #
    def compute(
        self,
        sequence: str,
        target_pos: int,        # 0-indexed position of the mutation in sequence
        target_aa: str,         # mutant amino acid (single letter)
        n_steps: int = 50,      # IG steps (higher = more accurate, slower)
    ) -> LRPResult:
        """
        Run LRP / Integrated Gradients and return per-residue relevance.

        Args:
            sequence:   Wild-type (or mutant) protein sequence string.
            target_pos: 0-indexed position of the residue to explain.
            target_aa:  The amino acid whose logit we differentiate w.r.t.
            n_steps:    Number of interpolation steps for Integrated Gradients.

        Returns:
            LRPResult with .residues list ready for frontend charting.
        """
        self._load()

        # Use a model-agnostic token occlusion relevance method that works
        # across ESM API variants without relying on internal encoder methods.
        return self._occlusion_relevance(sequence, target_pos, target_aa)

    # ------------------------------------------------------------------ #
    #  Method 1: Integrated Gradients (preferred)                          #
    # ------------------------------------------------------------------ #
    def _occlusion_relevance(self, sequence: str, target_pos: int, target_aa: str) -> LRPResult:
        model = self._model
        alphabet = self._alphabet
        _, _, tokens = self._batch_converter([("p", sequence)])

        token_pos = target_pos + 1  # +1 for BOS
        target_idx = alphabet.get_idx(target_aa)

        with torch.no_grad():
            base_logits = model(tokens, repr_layers=[], return_contacts=False)["logits"]
            base_target_logit = base_logits[0, token_pos, target_idx]

        scores = []
        for i in range(len(sequence)):
            masked = tokens.clone()
            masked[0, i + 1] = alphabet.mask_idx
            with torch.no_grad():
                masked_logits = model(masked, repr_layers=[], return_contacts=False)["logits"]
                masked_target_logit = masked_logits[0, token_pos, target_idx]

            # Positive score => masking position i hurts target prediction.
            scores.append(float((base_target_logit - masked_target_logit).abs().item()))

        raw = torch.tensor(scores, dtype=torch.float32)
        raw = raw / (raw.sum() + 1e-9)
        normed_scores = raw.tolist()

        residues = self._format_residues(sequence, normed_scores)
        return LRPResult(
            residues=residues,
            target_position=target_pos,
            target_aa=target_aa,
            method="occlusion_logit_drop",
            raw_scores=normed_scores,
        )

    # ------------------------------------------------------------------ #
    #  Helpers                                                              #
    # ------------------------------------------------------------------ #
    @staticmethod
    def _format_residues(sequence: str, scores: list) -> List[dict]:
        return [
            {
                "residue": aa,
                "position": i + 1,
                "score": round(float(s), 6),
            }
            for i, (aa, s) in enumerate(zip(sequence, scores))
        ]
