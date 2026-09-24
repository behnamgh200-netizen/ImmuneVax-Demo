# ImmuneVax Demo

Public, presentation-only demonstration of the **ImmuneVax** research software concept.

This repository intentionally contains **only the demo layer**. The private ImmuneVax research code, internal services, unpublished implementation, datasets, credentials, and experimental logic are not included.

## Live site

Once GitHub Pages finishes deploying:

https://behnamgh200-netizen.github.io/ImmuneVax-Demo/

## What this demo does

- renders a synthetic 3D protein coordinate set;
- accepts a local PDB file in the browser without uploading it;
- computes deterministic geometric descriptors from the coordinates;
- analyzes protein ATOM records while excluding solvent/ligand HETATM records;
- reports chain-aware protein residue counts;
- visualizes a simple surface-exposure proxy;
- runs a transparent, educational APC-interaction heuristic;
- shows an APC-like recognition index, recognition band, and demo-model confidence;
- records provenance such as source type, structure name, model version, scenario, and record ID;
- can save two local analysis snapshots and compare them side by side;
- includes a human scientific review gate with reviewer notes;
- exports a structured JSON demo record for portability and auditability;
- generates an interview-ready report with explicit limitations.

## Scientific boundary

The geometric calculations are real and local.

The immune-interaction score, APC-like recognition index, presentation/recognition timeline, and response interpretation are deliberately simplified educational heuristics. The displayed recognition percentage is **not a biological probability**. These outputs are **not** molecular docking, antigenicity prediction, epitope prediction, clinical efficacy estimates, or vaccine recommendations.

## Separation from the private project

- `ImmuneVax` — private research repository
- `ImmuneVax-Demo` — public presentation repository

Do not copy private research files into this repository.


_Last updated automatically from the presentation-only demo branch._

