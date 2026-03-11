import pandas as pd
import numpy as np

def parse_variant(v):
    muts = v.split(":")
    parsed = []
    for m in muts:
        pos = int(m[1:-1]) - 1  # convert to 0-index
        aa = m[-1]
        parsed.append((pos, aa))
    return parsed


# Load dataset
df = pd.read_csv("SPG1_STRSG_Olson_2014.csv")

# Keep only rows with valid fitness scores and double mutants
df = df.dropna(subset=["mutant", "DMS_score"])
df = df[df["mutant"].str.contains(":")]

# Extract mutation pairs
pairs = []
for _, row in df.iterrows():
    muts = parse_variant(row["mutant"])
    if len(muts) == 2:
        (p1, a1), (p2, a2) = muts
        pairs.append((p1, a1, p2, a2, row["DMS_score"]))

pairs = pd.DataFrame(pairs, columns=["pos1", "aa1", "pos2", "aa2", "fitness"])

# Target residue (convert to 0-index)
target = 250 - 1

# Select rows where one mutation is at the target
subset = pairs[(pairs.pos1 == target) | (pairs.pos2 == target)].copy()

# Identify partner mutation
subset["partner_pos"] = np.where(subset.pos1 == target, subset.pos2, subset.pos1)
subset["target_aa"] = np.where(subset.pos1 == target, subset.aa1, subset.aa2)
subset["partner_aa"] = np.where(subset.pos1 == target, subset.aa2, subset.aa1)

# Compute averages needed for epistasis
mean_target = subset.groupby("target_aa")["fitness"].mean()
mean_partner = subset.groupby("partner_aa")["fitness"].mean()
global_mean = subset["fitness"].mean()

# Vectorized epistasis calculation (fast)
subset["epistasis"] = (
    subset["fitness"]
    - subset["target_aa"].map(mean_target)
    - subset["partner_aa"].map(mean_partner)
    + global_mean
)

# Aggregate epistasis by partner position
epistasis_by_partner = (
    subset.groupby("partner_pos")["epistasis"]
    .mean()
    .abs()
    .sort_values(ascending=False)
    .reset_index(name="mean_abs_epistasis")
)

# Save to CSV
epistasis_by_partner.to_csv("epistasis_by_partner.csv", index=False)

print("Saved epistasis_by_partner.csv")
