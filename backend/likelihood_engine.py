"""
likelihood_engine.py
---------------------
ESM-2 log-likelihood / masked marginal scoring.

Provides two outputs:
  1. LikelihoodScoreResult  — scalar ΔLL summed over all mutated positions.
  2. LikelihoodResidueResult — per-residue ΔLL across the full sequence,
     showing which positions are most affected by the mutation in log-prob space.

The masked marginal score at a position is:
    ΔLL(pos) = log P(mut_aa | masked context) − log P(wt_aa | masked context)

Positive  → model prefers the mutant AA at that position.
Negative  → model prefers the wild-type AA (mutation is penalised).
"""

import torch
from dataclasses import dataclass, field
from typing import List, Optional
import threading


@dataclass
class LikelihoodScoreResult:
    """Scalar ΔLL score summed over all mutated positions."""
    delta_ll: float          # sum of per-position masked marginal scores


@dataclass
class LikelihoodResidueResult:
    """Per-residue ΔLL between WT and mutant."""
    residues: List[dict]     # [{"residue": "A", "position": 1, "score": -0.74}, ...]
    raw_scores: Optional[List[float]] = field(default=None, repr=False)


class LikelihoodEngine:
    """
    Computes masked marginal log-likelihood scores using ESM-2.

    Usage:
        engine = LikelihoodEngine()

        # Scalar score (sum over mutated sites)
        score = engine.score(wt_seq, mut_seq)
        score.delta_ll  # → float

        # Per-residue vector (all positions)
        result = engine.residues(wt_seq, mut_seq)
        result.residues  # → [{"residue": "A", "position": 1, "score": ...}, ...]
    """

    def __init__(self, model_name: str = "esm2_t33_650M_UR50D"):
        self.model_name = model_name
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
    def score(self, wt_seq: str, mut_seq: str) -> LikelihoodScoreResult:
        """
        Returns the total masked marginal ΔLL summed over all positions
        where wt_seq and mut_seq differ.

        Args:
            wt_seq:  Wild-type amino acid sequence.
            mut_seq: Mutant amino acid sequence (same length).

        Returns:
            LikelihoodScoreResult with .delta_ll (float).
        """
        self._load()
        mutations = [
            (i, wt_aa, mut_aa)
            for i, (wt_aa, mut_aa) in enumerate(zip(wt_seq, mut_seq))
            if wt_aa != mut_aa
        ]
        if not mutations:
            return LikelihoodScoreResult(delta_ll=0.0)

        total = sum(
            self._masked_marginal(wt_seq, pos, wt_aa, mut_aa)
            for pos, wt_aa, mut_aa in mutations
        )
        return LikelihoodScoreResult(delta_ll=round(float(total), 6))

    def residues(self, wt_seq: str, mut_seq: str) -> LikelihoodResidueResult:
        """
        Returns per-residue ΔLL for every position in the sequence.

        Uses WT and mutant contexts to capture mutation-induced shifts at all
        positions (including non-mutated residues).

        Args:
            wt_seq:  Wild-type amino acid sequence.
            mut_seq: Mutant amino acid sequence.

        Returns:
            LikelihoodResidueResult with .residues list ready for charting.
        """
        self._load()
        raw_scores = []
        for i, (wt_aa, mut_aa) in enumerate(zip(wt_seq, mut_seq)):
            wt_lp = self._masked_log_prob(wt_seq, i, wt_aa)

            if wt_aa == mut_aa:
                # Contextual effect at unchanged sites.
                mut_lp = self._masked_log_prob(mut_seq, i, wt_aa)
            else:
                # Substitution effect at changed sites.
                mut_lp = self._masked_log_prob(mut_seq, i, mut_aa)

            raw_scores.append(round(float(mut_lp - wt_lp), 6))

        result_residues = [
            {
                "residue": aa,
                "position": i + 1,
                "score": raw_scores[i],
            }
            for i, aa in enumerate(wt_seq)
        ]
        return LikelihoodResidueResult(residues=result_residues, raw_scores=raw_scores)

    def scan(self, wt_seq: str) -> List[dict]:
        """
        Full mutational scan: scores every possible single substitution
        at every position.

        Returns:
            List of dicts: [{"position": 1, "wt": "M", "mut": "A", "delta_ll": -1.2}, ...]
        """
        self._load()
        AA_LIST = list("ACDEFGHIKLMNPQRSTVWY")
        results = []
        for pos, wt_aa in enumerate(wt_seq):
            for mut_aa in AA_LIST:
                if mut_aa == wt_aa:
                    continue
                s = self._masked_marginal(wt_seq, pos, wt_aa, mut_aa)
                results.append({
                    "position": pos + 1,
                    "wt": wt_aa,
                    "mut": mut_aa,
                    "delta_ll": round(float(s), 6),
                })
        return results

    # ------------------------------------------------------------------ #
    #  Internal helpers                                                     #
    # ------------------------------------------------------------------ #
    def _masked_marginal(
        self, sequence: str, pos: int, wt_aa: str, mut_aa: str
    ) -> float:
        """
        Core masked marginal computation.

        Masks `pos`, runs a forward pass, returns:
            log P(mut_aa | masked context) − log P(wt_aa | masked context)
        """
        alphabet = self._alphabet
        model    = self._model

        _, _, tokens = self._batch_converter([("p", sequence)])
        masked = tokens.clone()
        masked[0, pos + 1] = alphabet.mask_idx  # +1 for BOS token

        with torch.no_grad():
            logits = model(masked, repr_layers=[], return_contacts=False)["logits"]

        log_probs = torch.log_softmax(logits[0, pos + 1], dim=-1)

        wt_idx  = alphabet.get_idx(wt_aa)
        mut_idx = alphabet.get_idx(mut_aa)

        return (log_probs[mut_idx] - log_probs[wt_idx]).item()

    def _masked_log_prob(self, sequence: str, pos: int, aa: str) -> float:
        """Returns log P(aa | sequence with pos masked)."""
        alphabet = self._alphabet
        model = self._model

        _, _, tokens = self._batch_converter([("p", sequence)])
        masked = tokens.clone()
        masked[0, pos + 1] = alphabet.mask_idx  # +1 for BOS token

        with torch.no_grad():
            logits = model(masked, repr_layers=[], return_contacts=False)["logits"]

        log_probs = torch.log_softmax(logits[0, pos + 1], dim=-1)
        aa_idx = alphabet.get_idx(aa)
        return float(log_probs[aa_idx].item())
