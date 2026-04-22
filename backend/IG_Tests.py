import torch
import numpy as np
import esm

from integrated_gradients_engine import IntegratedGradientsEngine


device = "cpu" #Decided to just do cpu bec it's tests

model_version = "esm2_t33_650M_UR50D"
model, alphabet = esm.pretrained.load_model_and_alphabet(model_version)
model = model.to(device)
model.eval()

prot_seq = "ACDEFGHIKLMNPQRSTVWY" #All AAs alphabet, just as test seq
mut_pos = 5
mut_AA = "A"


#Make sure the output shape is correct, i.e. one attribution per residue.
def test_output_shape():
    engine = IntegratedGradientsEngine(model, alphabet, steps=20)
    ig = engine.compute(prot_seq, mut_pos, mut_AA)

    assert ig.shape[0] == len(prot_seq)

#Make sure when the mutation is wt->wt, there's no attribution. Because there shouldn't be
def test_no_mutation():
    engine = IntegratedGradientsEngine(model, alphabet, steps=20)

    wt = prot_seq[mut_pos]
    ig = engine.compute(prot_seq, mut_pos, wt)

    assert np.max(np.abs(ig)) == 0


#Does the same mutation twice = same results? Bec model in eval mode, not training
def test_deterministic_output():
    engine = IntegratedGradientsEngine(model, alphabet, steps=20)

    ig1 = engine.compute(prot_seq, mut_pos, mut_AA)
    ig2 = engine.compute(prot_seq, mut_pos, mut_AA)

    assert np.allclose(ig1, ig2)


#Check if the current mutation has one of the strongest attributions, because then it's more likely the IG calculation is correct
def test_mutation_position_has_signal():
    engine = IntegratedGradientsEngine(model, alphabet, steps=20)

    ig = engine.compute(prot_seq, mut_pos, mut_AA)

    max_pos = np.argmax(np.abs(ig))

    assert (max_pos - mut_pos) <= 2



#Make sure the mutated residue is at least in the top 3 mutations, for similar reasons as above.
def test_mutation_position_in_top_k():
    engine = IntegratedGradientsEngine(model, alphabet, steps=20)

    ig = engine.compute(prot_seq, mut_pos, mut_AA)

    ranked = np.argsort(-np.abs(ig)) #Descend rank
    top3 = ranked[:3]

    assert mut_pos in top3


#Test for invalid (infinite) results
def test_finite_values():
    engine = IntegratedGradientsEngine(model, alphabet, steps=20)

    ig = engine.compute(prot_seq, mut_pos, mut_AA)

    assert np.all(np.isfinite(ig))


#Make sure 0-th index is working.
def test_position_zero():
    engine = IntegratedGradientsEngine(model, alphabet, steps=20)

    pos = 0
    mut = "G"

    ig = engine.compute(prot_seq, pos, mut)

    assert ig.shape[0] == len(prot_seq)

#Also make sure last position is right
def test_last_position():
    engine = IntegratedGradientsEngine(model, alphabet, steps=20)

    pos = len(prot_seq) - 1
    mut = "G"

    ig = engine.compute(prot_seq, pos, mut)
    assert ig.shape[0] == len(prot_seq)


#Run all the tests
if __name__ == "__main__":
    print("Running IG tests")

    test_output_shape()
    print("Output shape passed")

    test_no_mutation()
    print("Wt-mutation sanity passed")

    test_deterministic_output()
    print("Determinism passed")

    test_mutation_position_has_signal()
    print("Mutation position signal passed")

    test_mutation_position_in_top_k()
    print("Mutation position top-k passed")

    test_finite_values()
    print("No NaNs/Infs passed")

    test_position_zero()
    print("Position 0 passed")

    test_last_position()
    print("Last position passed")

    print("All IG structural tests passed successfully.")