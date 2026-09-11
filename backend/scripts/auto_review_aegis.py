"""Create conservative automatic review decisions for projected AEGIS labels.

This does not claim a clinical/human approval.  It retains only examples whose
meaning is explicit and whose important facts fit the current production JSON.
Every other example is excluded rather than guessed at.
"""
import argparse
import json
from collections import Counter
from pathlib import Path


BLOCKED_TAGS = {
    "ambiguous_modality", "condition_uncertain", "conflict", "conflicting_counts",
    "contradiction", "duplicate_risk", "human_review", "inventory_conflict",
    "mobile_assets", "multi_site", "open_count", "reported", "reported_vs_observed",
    "observed_vs_reported", "uncertain", "uncertain_manufacturer",
}


def read_jsonl(path):
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def automatic_decision(row):
    """Return (decision, deterministic exclusion reasons)."""
    reasons = []
    source = row["source_expected"]
    metadata = row["metadata"]
    tags = set(row.get("tags", []))

    if source.get("needs_human_review"):
        reasons.append("source_requires_human_review")
    for tag in sorted(tags & BLOCKED_TAGS):
        reasons.append(f"ambiguous_tag:{tag}")
    for correction in metadata.get("corrections", []):
        # Location defaulting is already corrected in the production label. Any
        # other correction means the source label made an unsafe inference.
        if correction.get("field") != "country":
            reasons.append(f"unsafe_source_inference:{correction.get('field')}")
    for equipment in source.get("equipment", []):
        if equipment.get("observation_status") != "observed":
            reasons.append("reported_or_uninspected_equipment")
        if equipment.get("condition_status") not in ("confirmed", "unknown"):
            reasons.append("uncertain_or_reported_condition")
        if equipment.get("quantity_statement") is not None:
            reasons.append("quantity_statement_not_in_production_schema")
        if equipment.get("notes") is not None:
            reasons.append("important_note_not_in_production_schema")
        if equipment.get("modality") == "Unknown":
            reasons.append("unknown_modality")
    for equipment in row["expected"].get("equipment", []):
        condition = equipment.get("condition") or ""
        if condition.startswith(("Reportado:", "Posible:")):
            reasons.append("nonconfirmed_condition_in_production_projection")

    reasons = sorted(set(reasons))
    if reasons:
        return "exclude", reasons
    return "approved", ["explicit_observed_facts_representable_by_production_schema"]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("dataset", type=Path)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    if args.output.exists():
        raise SystemExit(f"Output already exists: {args.output}")

    decisions, summary, split_summary = {}, Counter(), {}
    for split in ("train", "validation", "test"):
        rows = read_jsonl(args.dataset / f"{split}_raw.jsonl")
        counts = Counter()
        for row in rows:
            decision, reasons = automatic_decision(row)
            decisions[row["id"]] = {"decision": decision, "note": "; ".join(reasons)}
            counts[decision] += 1
            summary.update(reasons)
        split_summary[split] = dict(counts)

    result = {
        "format": "aegis-label-review-v1",
        "reviewer": "conservative-automatic-policy-v1",
        "warning": "Automated triage, not a human or clinical approval.",
        "policy": "Approve only explicit, observed, unambiguous records fully representable by the current production schema.",
        "decisions": decisions,
        "summary": {"splits": split_summary, "exclusion_reasons": dict(summary)},
    }
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result["summary"], ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
