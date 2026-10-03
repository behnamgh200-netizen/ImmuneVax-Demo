# ImmuneVax Demo

Public, presentation-only demonstration of the **ImmuneVax** research-software concept.

This repository intentionally contains only a public demo/presentation layer. Private ImmuneVax research code, fitted parameter values, internal records, credentials, unpublished implementation details, and raw external payloads are not included.

## Canonical live demo

Use one scientific-demo URL:

https://behnamgh200-netizen.github.io/ImmuneVax-Demo/live-demo.html

`calibration-demo.html` is retained only as a backward-compatible redirect to the **Human-data calibration & external validation** section inside `live-demo.html`. It is not a separate product or scientific engine.

## One integrated workflow

The live demo now presents the project as one connected workflow:

```text
Structure / evidence input
    ↓
Local structure parsing + geometric descriptors
    ↓
Transparent educational APC-like heuristic
    ↓
Private mechanistic immune model (represented only by sanitized exports)
    ↓
Public-human calibration + participant holdout
    ↓
Independent cross-study T-cell / cytokine validation
    ↓
Provenance + uncertainty + human scientific review
    ↓
Traceable report / export
```

### What is computed locally in the browser

- local PDB parsing without uploading the file;
- protein-ATOM analysis with solvent/ligand HETATM exclusion;
- chain-aware residue counts;
- deterministic geometric descriptors and a simple surface-exposure proxy;
- an explicitly educational APC-interaction / recognition heuristic;
- provenance, comparison snapshots, human-review notes, and JSON demo-record export.

### What the human-validation panel displays

The same page can also load an allowlisted **sanitized private-run JSON** and display aggregate research outputs such as:

- calibration train / participant-holdout metrics;
- layer-specific cell/cytokine error summaries;
- external cross-study validation summaries;
- normalized mechanistic trajectories;
- calibrated humoral IgM/IgG trajectories when present;
- source categories, limitations, and scientific status.

The public viewer rejects a sanitized run unless its privacy contract states that private record IDs, raw external payloads, credentials, private source code, and private parameter values are excluded.

## Scientific boundary

The geometric calculations are real and local. The APC-like recognition score and related timeline are deliberately simplified educational heuristics and are **not biological probabilities**.

Sanitized mechanistic/calibration outputs are population-level research results. They are not clinical validation, patient-specific predictions, vaccine-efficacy probabilities, or vaccine recommendations.

## Repository separation

- `ImmuneVax` — private research repository.
- `ImmuneVax-Demo` — public presentation repository.

Do not copy private research files into this repository.

## Other presentation surfaces

`index.html` and `research-dashboard.html` remain optional presentation/navigation surfaces. The canonical scientific walkthrough for an interview is `live-demo.html`, which now includes the human-calibration and cross-study validation viewer directly.
