# lrp_engine.py
import threading
from dataclasses import dataclass, field
from typing import List, Optional

import torch


@dataclass
class LRPResult:
    residues: List[dict]
    target_position: int
    target_aa: str
    method: str = "layerwise_lrp"
    raw_scores: Optional[List[float]] = field(default=None, repr=False)


class LRPEngine:
    def __init__(self, model_name: str = "esm2_t33_650M_UR50D"):
        self.model_name = model_name
        self._model = None
        self._alphabet = None
        self._batch_converter = None
        self._load_lock = threading.Lock()

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
            self._model = model
            self._alphabet = alphabet
            self._batch_converter = batch_converter

    # ---------------- Public API ---------------- #
    def compute(self, sequence: str, target_pos: int, target_aa: str) -> LRPResult:
        """
        Layer-wise LRP implementation that propagates token relevance from the
        LM head back to the input embeddings.
        """
        self._load()
        model = self._model
        alphabet = self._alphabet
        batch_converter = self._batch_converter

        if not isinstance(sequence, str) or len(sequence) == 0:
            raise ValueError("sequence must be a non-empty string")
        seq_len = len(sequence)
        if not (0 <= target_pos < seq_len):
            raise ValueError(f"target_pos {target_pos} out of range for sequence length {seq_len}")
        try:
            target_idx = alphabet.get_idx(target_aa)
        except Exception as e:
            raise ValueError(f"target_aa '{target_aa}' not found in alphabet: {e}")

        _, _, tokens = batch_converter([("p", sequence)])  # [1, T]
        device = next(model.parameters()).device if any(True for _ in model.parameters()) else torch.device("cpu")
        tokens = tokens.to(device)

        token_pos = target_pos + 1  # account for BOS

        # 1) compute embeddings (as in earlier approach) and forward while saving per-layer activations
        with torch.no_grad():
            emb = model.embed_tokens(tokens)  # [1, T, D]

        emb = emb.detach()
        logits, saved_acts = self._forward_from_embeddings_and_save(emb.requires_grad_(False), tokens)

        # Safety
        if token_pos >= logits.shape[1]:
            raise RuntimeError(f"token_pos {token_pos} out of range for logits (len {logits.shape[1]})")

        # 2) initialize token relevance from LM head contributions
        # logits shape [B, T, V]; pick target logit value (scalar)
        target_logit_val = float(logits[0, token_pos, target_idx].detach().cpu().item())

        # lm_head weight shape: [vocab, embed_dim]
        lm_w = model.lm_head.weight  # parameter tensor on device
        w = lm_w[target_idx].detach()  # [E]

        # x_final: last saved activation (B, T, E)
        x_final = saved_acts[-1]  # [1, T, E]
        # contribution z_i for each token i to target logit: dot(x_i, w)
        z = (x_final[0] * w).sum(dim=-1)  # [T]
        # make positive-contribution magnitudes for proportional split (use abs to handle sign)
        z_pos = z.abs()
        denom = z_pos.sum().clamp_min(1e-12)
        # initial token relevance (conserves to target_logit_val approximately)
        R = (z_pos / denom) * target_logit_val  # [T] tensor on device

        # 3) backward propagate relevance through saved activations (layerwise)
        # saved_acts is list of tensors [B,T,E]: saved_acts[0]=embeddings, saved_acts[1]=after layer0, ..., saved_acts[-1]=after last layer
        eps = 1e-6
        # Iterate layers in reverse: for layer index L-1 down to 0
        # At each step we use x_before = saved_acts[layer_idx], x_after = saved_acts[layer_idx+1]
        num_layers = len(saved_acts) - 1  # because saved_acts length = layers + 1
        # Keep R as shape [T]
        for layer_idx in range(num_layers - 1, -1, -1):
            x_before = saved_acts[layer_idx][0]  # [T, E]
            x_after = saved_acts[layer_idx + 1][0]  # [T, E]

            T_len, E = x_before.shape
            # Prepare next-layer relevance accumulator
            R_in = torch.zeros_like(R)

            # For each output token j, split its relevance into identity vs delta
            # and distribute delta across input tokens
            # Vectorize across tokens for performance
            delta = x_after - x_before  # [T, E]
            # Compute scalar magnitudes for identity and delta path per token
            c_id = x_before.abs().sum(dim=-1).clamp_min(eps)   # [T]
            c_delta = delta.abs().sum(dim=-1).clamp_min(eps)   # [T]

            # Split proportions
            total_c = c_id + c_delta
            p_id = c_id / total_c    # [T]
            p_delta = c_delta / total_c

            # Identity contribution: token j's id path mostly maps back to same token j
            R_id = R * p_id  # [T]
            R_in = R_in + R_id  # add the identity share back to the same token

            # Delta contribution: for each output token j, distribute R_delta_j across input tokens k
            R_delta = R * p_delta  # [T]

            # To compute proportional contributions from input token k to delta_j,
            # use abs(dot(x_before_k, delta_j)) as a proxy for the contribution.
            # Build matrix of shape [T_out, T_in] with z[k -> j] = |x_before_k · delta_j|
            # Compute (x_before @ delta^T) and take abs.
            # x_before: [T_in, E], delta: [T_out, E] (here T_in==T_out but conceptually this works)
            # z_mat[j,k] = | x_before[k] · delta[j] |
            # compute dot: (x_before) @ (delta.T) -> [T_in, T_out] then transpose -> [T_out, T_in]
            dot_mat = torch.matmul(x_before, delta.t()).t().abs()  # [T_out, T_in]
            # For numerical safety, add eps to sums
            zsum = dot_mat.sum(dim=1).clamp_min(eps)  # [T_out]

            # normalize and distribute
            # normalized weights w_jk = dot_mat[j,k] / zsum[j]
            # R_in[k] += sum_j R_delta[j] * w_jk
            # compute contribution matrix: (R_delta / zsum)[:, None] * dot_mat  -> [T_out, T_in]
            coeff = (R_delta / zsum).unsqueeze(1)  # [T_out, 1]
            contrib = coeff * dot_mat  # [T_out, T_in]
            # sum over j (rows) to get per-input-token accumulation
            R_from_delta_to_inputs = contrib.sum(dim=0)  # [T_in]
            R_in = R_in + R_from_delta_to_inputs

            # Next iteration: set R = R_in
            R = R_in

        # Now R is relevance for tokens including BOS/EOS positions; tokens length equals T (includes BOS/EOS)
        # strip BOS and EOS, which are at positions 0 and -1
        # The saved_acts shape matched tokens shape, so we can index accordingly
        # Typically tokens length = seq_len + 2 (BOS, EOS)
        # Remove index 0 and -1 to get residues
        # Ensure R is on cpu for result formatting
        R_no_special = R[1:-1]  # [L]
        # For presentation: absolute value + L1-normalize
        rel_abs = R_no_special.abs()
        denom = rel_abs.sum().clamp_min(1e-12)
        rel_norm = (rel_abs / denom).cpu().tolist()

        return LRPResult(
            residues=self._format_residues(sequence, rel_norm),
            target_position=target_pos,
            target_aa=target_aa,
            method="layerwise_lrp",
            raw_scores=[float(r) for r in rel_norm],
        )

    # ---------------- Forward with saving activations ---------------- #
    def _forward_from_embeddings_and_save(self, emb_input: torch.Tensor, tokens: torch.Tensor):
        """
        Forward pass from embeddings, saving per-layer activations for LRP.
        Returns (logits, saved_acts) where saved_acts is a list of [B,T,E] tensors:
          saved_acts[0] = embeddings (input to first transformer layer)
          saved_acts[1] = output after layer 0
          ...
          saved_acts[-1] = output after last layer (before lm_head)
        """
        model = self._model
        device = emb_input.device
        saved_acts = []

        # Copy embeddings -> [B, T, E]
        x = emb_input  # [B, T, E]
        saved_acts.append(x.detach().clone())

        # apply padding mask & transpose to [T, B, E] as model.layers expect
        padding_mask = tokens.eq(model.padding_idx)
        x_work = x * (1 - padding_mask.unsqueeze(-1).type_as(x))
        x_work = x_work.transpose(0, 1)  # [T, B, E]

        pad_mask = None if not padding_mask.any() else padding_mask
        # iterate layers and save activations after each layer
        for layer in model.layers:
            # call layer and capture output; ask for head weights if available but ignore them
            x_work, _ = layer(
                x_work,
                self_attn_padding_mask=pad_mask,
                need_head_weights=False,
            )
            # after layer, apply layernorm_after later; but layer returns x as in model.forward
            # bring back to [B, T, E] for saving
            x_batched = x_work.transpose(0, 1).detach().clone()  # [B, T, E]
            saved_acts.append(x_batched)

            # convert back to [T,B,E] for next iteration
            x_work = x_batched.transpose(0, 1)

        # after loop apply final emb_layer_norm_after (as in model)
        x_work = model.emb_layer_norm_after(x_work)
        x_batched = x_work.transpose(0, 1)
        # replace last saved_acts item with the normalized one (final)
        saved_acts[-1] = x_batched.detach().clone()

        logits = model.lm_head(x_batched)  # [B, T, V]
        return logits, saved_acts

    # ---------------- Helpers ---------------- #
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