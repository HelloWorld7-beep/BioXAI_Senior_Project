import torch
import torch.nn.functional as F
import numpy as np


#Main engine behind my IG implementation
class IntegratedGradientsEngine:
    def __init__(self, model, alphabet, steps=10):
        self.model = model #ESM (650M?)
        self.alphabet = alphabet #AA vocab i.e. token mappings
        self.steps = steps #steps = "interpolation" steps between x -> x'
        self.model.eval() #Set model to eval mode, disable layer dropout, makes output deterministic
        self.device = next(model.parameters()).device #CPU/GPU set

    #Computing the integrated gradients for one mutation
    def compute(self, sequence, position, mutant_aa):

        batch_converter = self.alphabet.get_batch_converter()
        aa_to_idx = self.alphabet.tok_to_idx

        #Convert raw AA string sequence to tokens
        data = [("protein", sequence)]
        _, _, tokens = batch_converter(data)
        tokens = tokens.to(self.device)

        #Get wild-type amino acid at that position
        wt_aa = sequence[position] #0-indexed pos from string seq
        wt_idx = aa_to_idx[wt_aa] #W-t integer token num ID
        mut_idx = aa_to_idx[mutant_aa] #Mut integer token num ID

        #Adjust pos for CSL token @ 0 index
        token_position = position + 1

        #Get embeddings as 3-d vector (1, seq_lin, embed_dim)
        embeddings = self.model.embed_tokens(tokens)

        #Baseline - zero vector
        baseline = torch.zeros_like(embeddings)

        #Compute the integrated gradients using the func
        integrated_grads = self.integrated_gradient_func(
            embeddings, baseline, tokens, token_position, wt_idx, mut_idx
        )

        residue_importance = integrated_grads.sum(dim=-1).squeeze(0) #Squeeze to remove 1st batch dim

        return residue_importance.detach().cpu().numpy()


    def integrated_gradient_func(self, embeddings, baseline, tokens, token_position, wt_idx, mut_idx):

        scaled_embeddings = [
            baseline + (float(i) / self.steps) * (embeddings - baseline) #From the paper, this is the (x’ _ alpha x (x - x’)) part
            for i in range(self.steps + 1) #For steps = 50, this creates 51 scaled embeddings from baseline to input embedding
        ]

        grads = [] #List to store gradients from each scaled embedding, (batch, seq_len, embed_dim)

        ##Compute gradient at each step
        embed_module = self.model.embed_tokens  # Save embedding module reference

        for scaled in scaled_embeddings:
            scaled = scaled.clone().detach().requires_grad_(True) #Clone and set requires_grad to True to compute gradients

            #We need gradients in embeddding space, i.e. not discrete
            #Bec tokens themselves are category labels, embeddings = data pts in R^d i.e. embedding dim space
            #Need numerical vectors of model weights, not mere labels that only represent semantically what token "is" as humans interpret it e.g. A = alanine/1
            #Instead of replacing the module, we override its forward output using a hook

            def hook(module, input, output):
                if output.shape == scaled.shape:
                    return scaled
                return output

            hook_handle = embed_module.register_forward_hook(hook)

            outputs = self.model(tokens)
            logits = outputs["logits"]

            log_probs = F.log_softmax(logits, dim=-1) #Convert raw logits (vector) to log prob (same length vect), normalize them across 20 AA

            mut_lp = log_probs[:, token_position, mut_idx] #Get log prob of mut AA at that position
            wt_lp = log_probs[:, token_position, wt_idx] #Get log prob of wt AA at that position

            mutation_score = (mut_lp - wt_lp).sum() #Log ratio of mut vs wt, sum over batch dim (if using >1 batxh size) bec NEED scalar

            self.model.zero_grad() #Reset prev computed grads from prev steps
            mutation_score.backward() #Get grad, PARTIAL derivative of dF/df_xi like in paper

            grads.append(scaled.grad.detach()) #Change shape to (steps+1, batch, seq_len, embed_dim)

            hook_handle.remove()  # Remove hook after this step

        grads = torch.stack(grads)

        #Reimann sum time
        grads = (grads[:-1] + grads[1:]) / 2.0
        avg_grads = grads.mean(dim=0) #Average over alpha dim, now (batch, seq_len, embed_dim)

        integrated_grads = (embeddings - baseline) * avg_grads #Entire IG math formula

        return integrated_grads #(batch, seq_len, embed_dim)
