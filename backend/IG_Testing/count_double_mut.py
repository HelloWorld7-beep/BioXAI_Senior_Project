import pandas as pd
from collections import Counter

def parse_variant(v):
    if v == "WT":
        return []
    muts = v.split(":")
    parsed = []
    for m in muts:
        pos = int(m[1:-1]) - 1
        parsed.append(pos)
    return parsed

df = pd.read_csv("SPG1_STRSG_Olson_2014.csv")

pos_counter = Counter()

for v in df.mutant:
    muts = parse_variant(v)
    if len(muts) == 2:
        for pos in muts:
            pos_counter[pos] += 1

top_positions = pos_counter.most_common(20)

print(top_positions)
