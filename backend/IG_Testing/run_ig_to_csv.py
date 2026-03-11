import torch
import esm
import csv

from integrated_gradients_engine import IntegratedGradientsEngine


sequence = "MEKEKKVKYFLRKSAFGLASVSAAFLVGSTVFAVDSPIEDTPIIRNGGELTNLLGNSETTLALRNEESATADLTAAAVADTVAAAAAENAGAAAWEAAAAADALAKAKADALKEFNKYGVSDYYKNLINNAKTVEGIKDLQAQVVESAKKARISEATDGLSDFLKSQTPAEDTVKSIELAEAKVLANRELDKYGVSDYHKNLINNAKTVEGVKELIDEILAALPKTDQYKLILNGKTLKGETTTEAVDAATAEKVFKQYANDNGVDGEWTYDDATKTFTVTEKPEVIDASELTPAVTTYKLVINGKTLKGETTTKAVDAETAEKAFKQYANDNGVDGVWTYDDATKTFTVTEMVTEVPGDAPTEPEKPEASIPLVPLTPATPIAKDDAKKDDTKKEDAKKPEAKKDDAKKAETLPTTGEGSNPFFTAAALAVMAGAGALAVASKRKED"

position = 250
mutant = "A"

device = "cuda" if torch.cuda.is_available() else "cpu"


print("Loading model...")
model, alphabet = esm.pretrained.load_model_and_alphabet("esm2_t33_650M_UR50D")
model = model.to(device)
model.eval()

ig_engine = IntegratedGradientsEngine(model, alphabet, steps=10)


print("Running IG...")
importance = ig_engine.compute(sequence, position, mutant)

# Remove BOS/EOS tokens
importance = importance[1:-1]

print("Sequence length:", len(sequence))
print("Importance length:", len(importance))


# Build rows
rows = []

for i, (aa, score) in enumerate(zip(sequence, importance)):
    rows.append((i, aa, float(score)))


# Sort by importance (highest → lowest)
rows_sorted = sorted(rows, key=lambda x: x[2], reverse=True)


print("Writing CSV...")
with open("ig_results_sorted_non_abs.csv", "w", newline="") as f:
    writer = csv.writer(f)

    writer.writerow(["rank", "position", "residue", "importance"])

    for rank, (pos, aa, score) in enumerate(rows_sorted, start=1):
        writer.writerow([rank, pos, aa, score])


print("Done!")
