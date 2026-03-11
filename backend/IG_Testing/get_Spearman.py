import pandas as pd
from scipy.stats import spearmanr

# Load files
ig = pd.read_csv("ig_results_sorted_non_abs.csv")
epi = pd.read_csv("epistasis_by_partner.csv")

# Create rank columns
ig["ig_rank"] = ig["importance"].rank(ascending=False, method="average")
epi["epi_rank"] = epi["mean_abs_epistasis"].rank(ascending=False, method="average")

# Keep only position + rank
ig_ranks = ig[["position", "ig_rank"]]
epi_ranks = epi[["partner_pos", "epi_rank"]].rename(columns={"partner_pos": "position"})

# Merge on positions that appear in both datasets
merged = pd.merge(ig_ranks, epi_ranks, on="position")

# Compute Spearman correlation
corr, pval = spearmanr(merged["ig_rank"], merged["epi_rank"])

print("Spearman correlation:", corr)
print("p-value:", pval)
print("Number of shared positions:", len(merged))
