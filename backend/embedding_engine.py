"""
embedding_engine.py
--------------------
ESM-2 embedding-based scores.

Provides two outputs:
  1. EmbeddingScoreResult  — scalar cosine distance between WT and mutant embeddings.
  2. EmbeddingResidueResult — per-residue L2 norm of embedding difference vector,
     highlighting which positions shift most when the mutation is applied.
"""

import torch
import torch.nn.functional as F
from dataclasses import dataclass, field
from typing import List, Optional
import threading


@dataclass
class EmbeddingScoreResult:
    """Scalar distance between WT and mutant mean-pooled embeddings."""
    cosine_distance: float      # primary metric  (0 = identical, 1 = orthogonal)
    l2_distance: float          # secondary metric


@dataclass
class EmbeddingResidueResult:
    """Per-residue embedding perturbation caused by the mutation."""
    residues: List[dict]        # [{"residue": "A", "position": 1, "score": 0.04}, ...]
    raw_scores: Optional[List[float]] = field(default=None, repr=False)


class EmbeddingEngine:
    """
    Computes embedding-based mutation scores using ESM-2.

    Usage:
        engine = EmbeddingEngine()

        # Scalar score
        score = engine.score(wt_seq, mut_seq)
        score.cosine_distance  # → float

        # Per-residue vector
        residues = engine.residues(wt_seq, mut_seq)
        residues.residues  # → [{"residue": "A", "position": 1, "score": ...}, ...]
    """

    def __init__(self, model_name: str = "esm2_t33_650M_UR50D", layer: int = 33):
        self.model_name = model_name
        self.layer = layer
        self._model = None
        self._alphabet = None
        self._batch_converter = None
        self._load_lock = threading.Lock()

    # ------------------------------------------------------------------ #
    #  Lazy load                                                            #
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
    def score(self, wt_seq: str, mut_seq: str) -> EmbeddingScoreResult:
        """
        Returns a scalar distance between the mean-pooled embeddings of
        the wild-type and mutant sequences.

        Args:
            wt_seq:  Wild-type amino acid sequence.
            mut_seq: Mutant amino acid sequence (same length, one or more AAs differ).

        Returns:
            EmbeddingScoreResult with cosine_distance and l2_distance.
        """
        self._load()
        wt_emb  = self._mean_embedding(wt_seq)
        mut_emb = self._mean_embedding(mut_seq)

        cos_dist = float(
            1 - F.cosine_similarity(wt_emb.unsqueeze(0), mut_emb.unsqueeze(0))
        )
        l2_dist  = float(torch.norm(wt_emb - mut_emb))

        return EmbeddingScoreResult(
            cosine_distance=round(cos_dist, 6),
            l2_distance=round(l2_dist, 6),
        )

    def residues(self, wt_seq: str, mut_seq: str) -> EmbeddingResidueResult:
        """
        Returns the per-residue L2 norm of the embedding difference between
        WT and mutant.  High scores indicate residues whose representation
        shifted most — useful for detecting allosteric effects.

        Args:
            wt_seq:  Wild-type amino acid sequence.
            mut_seq: Mutant amino acid sequence.

        Returns:
            EmbeddingResidueResult with .residues list ready for charting.
        """
        self._load()
        wt_embs  = self._all_residue_embeddings(wt_seq)   # [L, D]
        mut_embs = self._all_residue_embeddings(mut_seq)  # [L, D]

        diff   = torch.norm(wt_embs - mut_embs, dim=-1)   # [L]
        normed = (diff / (diff.sum() + 1e-9)).tolist()

        result_residues = [
            {
                "residue": aa,
                "position": i + 1,
                "score": float(normed[i]),
            }
            for i, aa in enumerate(wt_seq)
        ]
        return EmbeddingResidueResult(residues=result_residues, raw_scores=normed)

    # ------------------------------------------------------------------ #
    #  Internal helpers                                                     #
    # ------------------------------------------------------------------ #
    def _mean_embedding(self, sequence: str) -> torch.Tensor:
        """Returns mean-pooled embedding vector for a sequence. Shape: [D]"""
        all_embs = self._all_residue_embeddings(sequence)
        return all_embs.mean(0)

    def _all_residue_embeddings(self, sequence: str) -> torch.Tensor:
        """Returns per-residue embedding matrix. Shape: [L, D]"""
        _, _, tokens = self._batch_converter([("p", sequence)])
        with torch.no_grad():
            out = self._model(tokens, repr_layers=[self.layer])
        return out["representations"][self.layer][0, 1:-1]  # strip BOS/EOS
