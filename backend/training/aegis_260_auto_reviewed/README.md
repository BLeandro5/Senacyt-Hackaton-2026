# AEGIS dataset: automatic conservative review

This immutable dataset was produced from `../aegis_260_production_clean` using
`../aegis_260_production_clean/automatic-review-decisions.json`.

It contains only labels automatically classified as explicit, observed, and
fully representable by the current production extraction schema: 35 train, 12
validation, and 8 test examples. It intentionally excludes reported equipment,
uncertainty, quantities, duplicate risk, and explanatory notes because the
current production schema has no structured fields for those facts.

`review_application_report.json` retains the exclusion reason for every label.
The LoRA preflight uses this reviewed dataset by default.
