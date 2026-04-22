"""
mutation_utils.py
------------------
Helpers for parsing mutation notation and applying mutations to sequences.
"""

import re


def parse_mutation(mutation_str: str) -> dict:
    """
    Parse a mutation string like "A123V" or "A123V,G45E" into components.

    Returns:
        For single mutation:
            {"type": "single", "pos": 122, "wt": "A", "mut": "V"}  (0-indexed pos)
        For multi:
            {"type": "multi", "mutations": [{"pos": ..., "wt": ..., "mut": ...}, ...]}
    """
    mutation_str = mutation_str.strip()
    singles = [m.strip() for m in re.split(r'[,;/\s]+', mutation_str) if m.strip()]

    parsed = []
    for m in singles:
        match = re.fullmatch(r'([A-Za-z])(\d+)([A-Za-z])', m)
        if not match:
            raise ValueError(
                f"Cannot parse mutation '{m}'. Expected format: <WT_AA><1-indexed_position><MUT_AA>, e.g. A123V"
            )
        wt_aa  = match.group(1).upper()
        pos_1  = int(match.group(2))       # 1-indexed
        mut_aa = match.group(3).upper()
        parsed.append({"pos": pos_1 - 1, "wt": wt_aa, "mut": mut_aa})  # convert to 0-indexed

    if len(parsed) == 1:
        return {"type": "single", **parsed[0]}
    return {"type": "multi", "mutations": parsed}


def apply_mutation(sequence: str, mutation_str: str) -> str:
    """
    Apply one or more mutations to a sequence string.

    Args:
        sequence:      WT amino acid sequence (1-letter codes).
        mutation_str:  Mutation string, e.g. "A123V" or "A123V,G45E".

    Returns:
        Mutant sequence string.

    Raises:
        ValueError: if the WT amino acid in mutation_str doesn't match the sequence.
    """
    parsed = parse_mutation(mutation_str)
    seq_list = list(sequence)

    mutations = (
        [{"pos": parsed["pos"], "wt": parsed["wt"], "mut": parsed["mut"]}]
        if parsed["type"] == "single"
        else parsed["mutations"]
    )

    for m in mutations:
        pos, wt_aa, mut_aa = m["pos"], m["wt"], m["mut"]
        if pos >= len(seq_list):
            raise ValueError(
                f"Position {pos + 1} is out of range for sequence of length {len(seq_list)}."
            )
        actual = seq_list[pos].upper()
        if actual != wt_aa:
            raise ValueError(
                f"Mismatch at position {pos + 1}: expected '{wt_aa}' but sequence has '{actual}'."
            )
        seq_list[pos] = mut_aa

    return "".join(seq_list)
