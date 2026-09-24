const candidates = [
  {
    id: "CAND-A",
    label: "Candidate A",
    status: "Higher evidence",
    filter: "strong",
    score: 78,
    evidence: "0.82",
    agreement: "0.76",
    uncertainty: "Moderate",
    review: "Pending",
    evidenceNote: "Synthetic evidence is comparatively complete, but simulated evidence has not been experimentally validated.",
    limitations: "No clinical inference. Structural and population-level assumptions are intentionally omitted from this demo.",
    provenance: [
      ["EV-0142", "Curated source record · synthetic metadata"],
      ["MD-0031", "Prediction adapter output · mock model v0.3"],
      ["SM-0008", "Simulation scenario · illustrative only"]
    ]
  },
  {
    id: "CAND-B",
    label: "Candidate B",
    status: "Needs review",
    filter: "review",
    score: 69,
    evidence: "0.71",
    agreement: "0.64",
    uncertainty: "Moderate–high",
    review: "Revise",
    evidenceNote: "Synthetic sources disagree more strongly. The review state indicates that the interpretation should be revised before acceptance.",
    limitations: "Cross-source disagreement is unresolved and the synthetic simulation contributes little confidence.",
    provenance: [
      ["EV-0147", "Curated source record · synthetic metadata"],
      ["MD-0035", "Prediction adapter output · mock model v0.3"],
      ["RV-0012", "Human review · revision requested"]
    ]
  },
  {
    id: "CAND-C",
    label: "Candidate C",
    status: "Exploratory",
    filter: "review",
    score: 57,
    evidence: "0.59",
    agreement: "0.52",
    uncertainty: "High",
    review: "Pending",
    evidenceNote: "This candidate exists to demonstrate how ImmuneVax can keep exploratory records visible without overstating confidence.",
    limitations: "Sparse synthetic evidence and low agreement. It should not be treated as a recommendation.",
    provenance: [
      ["EV-0151", "Sparse source record · synthetic metadata"],
      ["MD-0038", "Prediction adapter output · mock model v0.3"],
      ["SM-0010", "Simulation scenario · high spread"]
    ]
  }
];

const scenarios = {
  balanced: [
    [12,18,28,43,61,72,67,58,48,42],
    [4,7,12,24,39,55,68,74,70,62],
    [1,2,5,10,19,31,46,58,68,73]
  ],
  uncertain: [
    [11,21,25,49,45,69,55,64,42,51],
    [3,8,10,31,29,58,49,72,59,66],
    [1,2,7,8,24,25,49,45,66,61]
  ],
  weak: [
    [9,13,18,25,32,38,35,31,26,22],
    [2,4,7,12,18,24,28,30,27,23],
    [1,1,3,5,8,12,18,23,27,29]
  ]
};

const assistantReplies = {
  compare: "Candidate A has the highest synthetic evidence completeness and cross-source agreement in this demo. That does not make it a real biological recommendation: all three records are fictional, and the production system would show the underlying evidence and review state before any conclusion.",
  uncertainty: "The highest uncertainty in the synthetic workspace is attached to Candidate C. Its evidence completeness and cross-source agreement are both lower, so the interface keeps it in an exploratory state instead of hiding that uncertainty.",
  architecture: "AlphaFold would sit behind a replaceable integration adapter. The ImmuneVax core would store the input reference, adapter version, model metadata, output provenance, and uncertainty context rather than coupling the project directly to one external provider.",
  review: "Human review is a final governance layer. A model can aggregate evidence or produce a simulation, but a researcher still needs to inspect limitations, provenance, disagreement, and whether the evidence supports the stated interpretation."
};

const candidateContainer = document.querySelector("#candidateCards");
const inspector = document.querySelector("#candidateInspector");
const chips = [...document.querySelectorAll(".chip")];
const scenarioButtons = [...document.querySelectorAll(".scenario")];
const chart = document.querySelector("#simulationChart");
const conversation = document.querySelector("#assistantConversation");
const promptChips = [...document.querySelectorAll(".prompt-chip")];

let activeCandidate = null;

function renderCandidates(filter = "all") {
  const visible = candidates.filter(candidate => filter === "all" || candidate.filter === filter);
  candidateContainer.innerHTML = visible.map(candidate => `
    <article class="candidate ${activeCandidate === candidate.id ? "selected" : ""}" data-id="${candidate.id}" tabindex="0" role="button" aria-label="Inspect ${candidate.label}">
      <span class="status">${candidate.status}</span>
      <h3>${candidate.label}</h3>
      <p>Illustrative candidate record built from synthetic evidence summaries.</p>
      <div class="score">${candidate.score}<small>/100 demo index</small></div>
      <div class="metric"><span>Evidence completeness</span><b>${candidate.evidence}</b></div>
      <div class="metric"><span>Cross-source agreement</span><b>${candidate.agreement}</b></div>
      <div class="metric"><span>Uncertainty</span><b>${candidate.uncertainty}</b></div>
      <div class="metric"><span>Human review</span><b>${candidate.review}</b></div>
    </article>
  `).join("");

  [...candidateContainer.querySelectorAll(".candidate")].forEach(card => {
    const open = () => inspectCandidate(card.dataset.id);
    card.addEventListener("click", open);
    card.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        open();
      }
    });
  });
}

function inspectCandidate(id) {
  const candidate = candidates.find(item => item.id === id);
  if (!candidate) return;
  activeCandidate = id;
  renderCandidates(document.querySelector(".chip.active")?.dataset.filter || "all");

  inspector.innerHTML = `
    <span class="workspace-label">Evidence inspector</span>
    <h3>${candidate.label}</h3>
    <p class="muted">${candidate.evidenceNote}</p>
    <div class="inspector-section">
      <h4>Current state</h4>
      <div class="inspector-row"><span>Demo index</span><b>${candidate.score}/100</b></div>
      <div class="inspector-row"><span>Uncertainty</span><b>${candidate.uncertainty}</b></div>
      <div class="inspector-row"><span>Human review</span><b>${candidate.review}</b></div>
    </div>
    <div class="inspector-section">
      <h4>Provenance chain</h4>
      <div class="provenance">
        ${candidate.provenance.map(([id, label]) => `<div><b>${id}</b><br>${label}</div>`).join("")}
      </div>
    </div>
    <div class="inspector-section">
      <h4>Limitations</h4>
      <p class="muted small">${candidate.limitations}</p>
    </div>
  `;
}

chips.forEach(chip => {
  chip.addEventListener("click", () => {
    chips.forEach(item => item.classList.remove("active"));
    chip.classList.add("active");
    activeCandidate = null;
    renderCandidates(chip.dataset.filter);
    inspector.innerHTML = `
      <div class="inspector-empty">
        <span class="inspector-icon">↗</span>
        <h3>Select a candidate</h3>
        <p>Inspect provenance, uncertainty notes, and reviewer state.</p>
      </div>`;
  });
});

function points(values) {
  return values.map((value, index) => {
    const x = (index / (values.length - 1)) * 100;
    const y = 100 - value;
    return `${x},${y}`;
  }).join(" ");
}

function renderChart(name = "balanced") {
  const [a, b, c] = scenarios[name];
  chart.innerHTML = `
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <polyline points="${points(a)}" fill="none" stroke="#62d5ff" stroke-width="1.4" vector-effect="non-scaling-stroke"/>
      <polyline points="${points(b)}" fill="none" stroke="#9b8cff" stroke-width="1.4" vector-effect="non-scaling-stroke"/>
      <polyline points="${points(c)}" fill="none" stroke="#66e0ba" stroke-width="1.4" vector-effect="non-scaling-stroke"/>
    </svg>
  `;
}

scenarioButtons.forEach(button => {
  button.addEventListener("click", () => {
    scenarioButtons.forEach(item => item.classList.remove("active"));
    button.classList.add("active");
    renderChart(button.dataset.scenario);
  });
});

function addMessage(role, text) {
  const message = document.createElement("div");
  message.className = `message ${role === "You" ? "user-message" : "assistant-message"}`;
  const label = document.createElement("span");
  label.textContent = role;
  const paragraph = document.createElement("p");
  paragraph.textContent = text;
  message.append(label, paragraph);
  conversation.appendChild(message);
  message.scrollIntoView({behavior: "smooth", block: "nearest"});
}

promptChips.forEach(button => {
  button.addEventListener("click", () => {
    addMessage("You", button.textContent);
    window.setTimeout(() => addMessage("ImmuneVax AI", assistantReplies[button.dataset.prompt]), 180);
  });
});

const tourStops = [...document.querySelectorAll(".tour-stop")];
const overlay = document.querySelector("#tourOverlay");
const tourTitle = document.querySelector("#tourTitle");
const tourText = document.querySelector("#tourText");
const tourCounter = document.querySelector("#tourCounter");
const tourPrevious = document.querySelector("#tourPrevious");
const tourNext = document.querySelector("#tourNext");
const tourClose = document.querySelector("#tourClose");
let tourIndex = 0;

function showTourStep(index) {
  tourStops.forEach(stop => stop.classList.remove("tour-highlight"));
  tourIndex = Math.max(0, Math.min(index, tourStops.length - 1));
  const stop = tourStops[tourIndex];
  stop.classList.add("tour-highlight");
  stop.scrollIntoView({behavior: "smooth", block: "center"});
  tourTitle.textContent = stop.dataset.tourTitle;
  tourText.textContent = stop.dataset.tourText;
  tourCounter.textContent = `${tourIndex + 1} / ${tourStops.length}`;
  tourPrevious.disabled = tourIndex === 0;
  tourNext.textContent = tourIndex === tourStops.length - 1 ? "Finish" : "Next";
}

function openTour() {
  overlay.hidden = false;
  showTourStep(0);
  tourNext.focus();
}

function closeTour() {
  overlay.hidden = true;
  tourStops.forEach(stop => stop.classList.remove("tour-highlight"));
}

document.querySelector("#tourButton").addEventListener("click", openTour);
document.querySelector("#heroTourButton").addEventListener("click", openTour);
tourClose.addEventListener("click", closeTour);
tourPrevious.addEventListener("click", () => showTourStep(tourIndex - 1));
tourNext.addEventListener("click", () => {
  if (tourIndex === tourStops.length - 1) closeTour();
  else showTourStep(tourIndex + 1);
});
overlay.addEventListener("click", event => {
  if (event.target === overlay) closeTour();
});
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && !overlay.hidden) closeTour();
});

const pitch = "ImmuneVax is a modular computational research platform I am developing to connect scientific immune data, prediction tools, future cell-level simulation, explicit uncertainty, and human review in one traceable workflow. This demo is intentionally synthetic; the private repository contains the research infrastructure and remains separate from the application-facing demonstration.";
const copyPitchButton = document.querySelector("#copyPitch");
const toast = document.querySelector("#toast");

copyPitchButton.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(pitch);
    toast.textContent = "Interview pitch copied";
  } catch {
    toast.textContent = "Copy unavailable — pitch is visible above";
  }
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 1800);
});

renderCandidates();
renderChart();
