# ImmuneVax interview guide

## 30-second version

ImmuneVax is a modular computational research platform I am developing to connect immune-system evidence, external prediction tools, future cell-level simulation, uncertainty reporting, and mandatory human review in one traceable workflow. The web page is a synthetic demonstration; the private repository contains the research infrastructure and is intentionally not shared.

## 2-minute walkthrough

Start with **Workflow**. Explain that each external database or model is treated as a replaceable adapter rather than being mixed directly into the core.

Move to **Candidate workspace**. Explain that the platform should never show a score without provenance, evidence completeness, disagreement, uncertainty, and review status.

Move to **Simulation preview**. State clearly that the visible curves are synthetic. The long-term goal is to support a simplified internal simulator and an external cellular engine behind the same interface.

Move to **AI research assistant**. Explain that the future AI layer should query and orchestrate project records, not bypass human scientific review.

Finish with **Architecture**. Emphasize portability: the same private core can later run locally, in Docker, behind an API, or under a selected AI controller.

## Safe answers to common questions

**Is the demo making a real vaccine recommendation?**  
No. It is intentionally synthetic and non-operational.

**Are AlphaFold or FoldX connected here?**  
No. The demo only shows where replaceable adapters would sit in the architecture.

**Why not publish the full repository?**  
The project is still active research work. The demonstration communicates the architecture and research direction while keeping unpublished implementation separate.

**What is the scientific value of the project?**  
The goal is not to claim a perfect digital human immune system. The goal is to build a traceable computational environment where different evidence sources, prediction tools, simulation outputs, uncertainty, and human review can be compared consistently.

## Things not to claim

Do not claim that ImmuneVax predicts clinical efficacy, reproduces the entire human immune system, or has experimentally validated a vaccine candidate unless future evidence genuinely supports those statements.


## Live micro-demo walkthrough

Open `live-demo.html`.

1. Start with the built-in synthetic structure.
2. Rotate the 3D coordinate model with the mouse.
3. Explain that highlighted points are a deliberately simple geometric surface proxy.
4. Click **Run live analysis** and show the deterministic structural descriptors.
5. Explain the APC encounter panel: it is a transparent heuristic that demonstrates orchestration, not molecular binding prediction.
6. If useful, upload a small local PDB file. The browser parses it locally; nothing is uploaded.
7. Finish with the generated report and its explicit limitations.

A good sentence to use is:

> “The geometry here is computed live. The immune-interaction layer is intentionally simplified so I can demonstrate the architecture and uncertainty handling without presenting a toy model as biological truth.”


## Updated live APC interpretation

The live demo now separates three layers clearly:

1. **Real local parsing** — protein ATOM coordinates from a PDB file are read in the browser. Solvent/ligand HETATM records are excluded from the protein analysis.
2. **Real geometric descriptors** — atom count, chain-aware residue count, chains, surface proxy, compactness, shape spread, and exposed 3D patch count are recalculated from the uploaded structure.
3. **Illustrative immune layer** — an APC-like recognition index and recognition band are calculated from those geometric descriptors using a transparent educational heuristic.

Recommended wording in an interview:

> “The structure parsing and geometric descriptors are computed live from the uploaded PDB. The APC recognition percentage is intentionally a simplified demo index, not a biological probability. My next development step is to replace this heuristic with validated immunological models and evidence-backed predictors while keeping the same traceable interface.”

Do not call the recognition index a probability of vaccine success or a validated antigenicity score.
