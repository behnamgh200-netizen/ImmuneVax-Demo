const canvas = document.querySelector("#proteinCanvas");
const ctx = canvas.getContext("2d");

const syntheticStructures = {
  compact: makeSynthetic("compact", 54),
  open: makeSynthetic("open", 66),
  irregular: makeSynthetic("irregular", 60)
};

let atoms = syntheticStructures.compact;
let structureName = "S-12 Compact surface protein";
let surfaceMask = [];
let rotation = {x: -0.32, y: 0.58};
let zoom = 1;
let dragging = false;
let lastPointer = null;
let showSurface = true;
let latestAnalysis = null;

function makeSynthetic(kind, count) {
  const points = [];
  for (let i = 0; i < count; i++) {
    const t = i * 0.62;
    let r = kind === "compact" ? 16 + 2.2 * Math.sin(i * 0.7) :
            kind === "open" ? 18 + 7 * Math.sin(i * 0.41) :
            15 + 9 * Math.sin(i * 0.37) * Math.cos(i * 0.19);
    const x = r * Math.cos(t) + (kind === "open" ? i * 0.17 : 0);
    const y = (r * 0.72) * Math.sin(t) + 4 * Math.sin(i * 0.23);
    const z = (kind === "compact" ? 10 : 15) * Math.sin(i * 0.29) + 2 * Math.cos(i * 0.53);
    points.push({x, y, z, element: ["C","N","O","S"][i % 4], residue: Math.floor(i / 3) + 1});
  }
  return points;
}

function parsePDB(text) {
  const parsed = [];
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    if (!line.startsWith("ATOM") && !line.startsWith("HETATM")) continue;
    const x = Number.parseFloat(line.slice(30, 38));
    const y = Number.parseFloat(line.slice(38, 46));
    const z = Number.parseFloat(line.slice(46, 54));
    if (![x, y, z].every(Number.isFinite)) continue;
    const element = (line.slice(76, 78).trim() || line.slice(12, 14).trim()[0] || "C").toUpperCase();
    const residue = Number.parseInt(line.slice(22, 26).trim(), 10) || parsed.length + 1;
    parsed.push({x, y, z, element, residue});
  }
  if (parsed.length < 8) throw new Error("The file does not contain enough readable ATOM/HETATM coordinates.");
  return parsed.slice(0, 2500);
}

function centroid(points) {
  const sum = points.reduce((acc, p) => ({x:acc.x+p.x,y:acc.y+p.y,z:acc.z+p.z}), {x:0,y:0,z:0});
  return {x:sum.x/points.length,y:sum.y/points.length,z:sum.z/points.length};
}

function analyze(points) {
  const c = centroid(points);
  const radial = points.map(p => Math.hypot(p.x-c.x,p.y-c.y,p.z-c.z));
  const maxR = Math.max(...radial);
  const avgR = radial.reduce((a,b)=>a+b,0)/radial.length;
  const sorted = [...radial].sort((a,b)=>a-b);
  const threshold = sorted[Math.floor(sorted.length * 0.72)];
  const exposed = radial.map(r => r >= threshold);
  const exposedPoints = points.filter((_,i)=>exposed[i]);
  const exposedFraction = exposedPoints.length / points.length;
  const compactness = Math.max(0, Math.min(1, 1 - (maxR - avgR) / Math.max(maxR, 1)));
  const spread = Math.sqrt(radial.reduce((s,r)=>s+(r-avgR)**2,0)/radial.length) / Math.max(avgR,1);
  const patchCount = countPatches(exposedPoints, Math.max(4.5, avgR * 0.42));
  const residueCount = new Set(points.map(p=>p.residue)).size;

  return {
    atomCount: points.length,
    residueCount,
    maxRadius: maxR,
    meanRadius: avgR,
    exposedFraction,
    compactness,
    spread,
    patchCount,
    surfaceMask: exposed
  };
}

function countPatches(points, radius) {
  if (!points.length) return 0;
  const visited = new Set();
  let groups = 0;
  for (let i=0;i<points.length;i++) {
    if (visited.has(i)) continue;
    groups++;
    const queue=[i]; visited.add(i);
    while(queue.length){
      const idx=queue.shift();
      const a=points[idx];
      for(let j=0;j<points.length;j++){
        if(visited.has(j)) continue;
        const b=points[j];
        if(Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z) <= radius){
          visited.add(j); queue.push(j);
        }
      }
    }
  }
  return groups;
}

function engagementHeuristic(result) {
  const exposure = result.exposedFraction;
  const openness = Math.min(1, result.spread * 2.2);
  const patchTerm = Math.min(1, result.patchCount / 5);
  const raw = 0.48 * exposure + 0.32 * openness + 0.20 * patchTerm;
  const score = Math.round(35 + raw * 50);
  const confidence = Math.round(48 + Math.min(1, result.atomCount / 180) * 24);
  return {score:Math.min(92,score),confidence:Math.min(78,confidence)};
}

function rotatePoint(p) {
  const cy=Math.cos(rotation.y), sy=Math.sin(rotation.y);
  const cx=Math.cos(rotation.x), sx=Math.sin(rotation.x);
  let x=p.x*cy + p.z*sy;
  let z=-p.x*sy + p.z*cy;
  let y=p.y*cx - z*sx;
  z=p.y*sx + z*cx;
  return {x,y,z};
}

function render() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const rect = canvas.getBoundingClientRect();
  if (canvas.width !== Math.round(rect.width*dpr) || canvas.height !== Math.round(rect.height*dpr)) {
    canvas.width=Math.round(rect.width*dpr); canvas.height=Math.round(rect.height*dpr);
  }
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.clearRect(0,0,rect.width,rect.height);

  const c=centroid(atoms);
  const centered=atoms.map((p,i)=>({...rotatePoint({x:p.x-c.x,y:p.y-c.y,z:p.z-c.z}),i,element:p.element}));
  const maxR=Math.max(...centered.map(p=>Math.hypot(p.x,p.y,p.z)),1);
  const scale=Math.min(rect.width,rect.height)*0.34/maxR*zoom;
  centered.sort((a,b)=>a.z-b.z);

  ctx.save();
  ctx.translate(rect.width/2,rect.height/2);

  ctx.strokeStyle="rgba(110,160,190,.12)";
  ctx.lineWidth=1;
  for(let i=1;i<centered.length;i++){
    const a=centered[i-1],b=centered[i];
    if(Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z) < maxR*.55){
      ctx.beginPath();ctx.moveTo(a.x*scale,a.y*scale);ctx.lineTo(b.x*scale,b.y*scale);ctx.stroke();
    }
  }

  for(const p of centered){
    const exposed=showSurface && surfaceMask[p.i];
    const depth=(p.z+maxR)/(2*maxR);
    const radius=(exposed?4.3:3.1)*(0.8+depth*.45);
    ctx.beginPath();
    ctx.arc(p.x*scale,p.y*scale,radius,0,Math.PI*2);
    ctx.fillStyle=exposed ? "#68dcff" : elementColor(p.element,depth);
    ctx.globalAlpha=exposed ? .95 : .54+.34*depth;
    ctx.fill();
  }
  ctx.globalAlpha=1;
  ctx.restore();
  requestAnimationFrame(render);
}

function elementColor(element, depth){
  const colors={C:"#8ea8b8",N:"#9b8cff",O:"#ff9b9b",S:"#f2d36c",P:"#f0a765"};
  return colors[element] || "#9fb8c8";
}

canvas.addEventListener("pointerdown",e=>{dragging=true;lastPointer={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId)});
canvas.addEventListener("pointermove",e=>{
  if(!dragging) return;
  rotation.y+=(e.clientX-lastPointer.x)*.008;
  rotation.x+=(e.clientY-lastPointer.y)*.008;
  lastPointer={x:e.clientX,y:e.clientY};
});
canvas.addEventListener("pointerup",()=>dragging=false);
canvas.addEventListener("wheel",e=>{e.preventDefault();zoom=Math.max(.55,Math.min(2.4,zoom*(e.deltaY>0?.92:1.08)))},{passive:false});

document.querySelector("#resetView").addEventListener("click",()=>{rotation={x:-.32,y:.58};zoom=1});
document.querySelector("#toggleSurface").addEventListener("click",e=>{
  showSurface=!showSurface;
  e.currentTarget.classList.toggle("active",showSurface);
  e.currentTarget.textContent=showSurface?"Surface proxy on":"Surface proxy off";
});

const tabs=[...document.querySelectorAll(".tab")];
tabs.forEach(tab=>tab.addEventListener("click",()=>{
  tabs.forEach(x=>x.classList.remove("active")); tab.classList.add("active");
  const upload=tab.dataset.source==="upload";
  document.querySelector("#syntheticSource").hidden=upload;
  document.querySelector("#uploadSource").hidden=!upload;
}));

document.querySelector("#syntheticSelect").addEventListener("change",e=>{
  atoms=syntheticStructures[e.target.value];
  structureName=e.target.options[e.target.selectedIndex].text;
  latestAnalysis=analyze(atoms); surfaceMask=latestAnalysis.surfaceMask;
  updateMiniProtein();
  document.querySelector("#inputStatus").textContent="Synthetic example loaded";
});

document.querySelector("#pdbFile").addEventListener("change", async e=>{
  const file=e.target.files[0];
  if(!file) return;
  try{
    atoms=parsePDB(await file.text());
    structureName=file.name;
    latestAnalysis=analyze(atoms); surfaceMask=latestAnalysis.surfaceMask;
    updateMiniProtein();
    document.querySelector("#uploadMessage").textContent=`Loaded ${atoms.length} coordinate records locally from ${file.name}.`;
    document.querySelector("#inputStatus").textContent="Local PDB loaded";
  }catch(error){
    document.querySelector("#uploadMessage").textContent=error.message;
  }
});

function metricCard(label,value,unit,note){
  return `<article class="metric-card"><span>${label}</span><strong>${value}${unit||""}</strong><small>${note}</small></article>`;
}

function runAnalysis(){
  latestAnalysis=analyze(atoms);
  surfaceMask=latestAnalysis.surfaceMask;
  const heuristic=engagementHeuristic(latestAnalysis);

  document.querySelector("#metricGrid").innerHTML=[
    metricCard("Coordinate points",latestAnalysis.atomCount,"","parsed ATOM/HETATM"),
    metricCard("Residues",latestAnalysis.residueCount,"","unique residue IDs"),
    metricCard("Surface proxy",(latestAnalysis.exposedFraction*100).toFixed(1),"%","outer radial fraction"),
    metricCard("Compactness",latestAnalysis.compactness.toFixed(2),"","geometric proxy"),
    metricCard("Shape spread",latestAnalysis.spread.toFixed(2),"","radial variability"),
    metricCard("Surface patches",latestAnalysis.patchCount,"","simple 3D clusters")
  ].join("");

  const scenario=document.querySelector("#scenarioSelect").value;
  if(scenario==="review"){
    document.querySelector("#engagementScore").textContent="N/A";
    document.querySelector("#confidenceBar").style.width="100%";
    document.querySelector("#confidenceText").textContent="structural review only";
    document.querySelector("#interactionSignal").textContent="review-only mode";
    document.querySelector("#interactionExplanation").textContent="The structure was analyzed geometrically, but no immune-interaction heuristic was applied because Scientific review only is selected.";
  }else{
    document.querySelector("#engagementScore").textContent=heuristic.score+"/100";
    document.querySelector("#confidenceBar").style.width=heuristic.confidence+"%";
    document.querySelector("#confidenceText").textContent=heuristic.confidence+"% demo-model confidence";
    document.querySelector("#interactionSignal").textContent="surface geometry → demo heuristic";
    document.querySelector("#interactionExplanation").textContent=
      `The demo heuristic increased with geometric surface exposure (${(latestAnalysis.exposedFraction*100).toFixed(1)}%), shape openness, and the number of exposed clusters (${latestAnalysis.patchCount}). This is a transparent presentation rule, not a claim about receptor binding or antigen presentation in vivo.`;
  }

  renderTimeline(scenario, heuristic);
  renderReport(scenario, heuristic);
  updateMiniProtein();
}

function renderTimeline(scenario, heuristic){
  const stages=scenario==="review"
    ? [["01","Structure parsed","done"],["02","Geometry analyzed","done"],["03","Uncertainty documented","active"],["04","Human scientific review","pending"]]
    : [["01","Encounter","structure available"],["02","Uptake / processing","illustrative"],["03","Presentation","illustrative"],["04","Recognition","illustrative"],["05","Human review","required"]];
  document.querySelector("#timeline").innerHTML=stages.map((stage,i)=>`
    <div class="timeline-step ${i===2?"active":""}">
      <span class="index">${stage[0]}</span>
      <p>${stage[1]}</p>
      <small>${stage[2]}</small>
    </div>`).join("");
}

function renderReport(scenario, heuristic){
  const a=latestAnalysis;
  const lines=[
    "IMMUNEVAX LIVE MICRO-DEMO REPORT",
    "--------------------------------",
    `Structure: ${structureName}`,
    `Coordinate points parsed: ${a.atomCount}`,
    `Unique residue IDs: ${a.residueCount}`,
    `Geometric surface proxy: ${(a.exposedFraction*100).toFixed(1)}%`,
    `Compactness proxy: ${a.compactness.toFixed(3)}`,
    `Radial shape spread: ${a.spread.toFixed(3)}`,
    `Exposed 3D patch count: ${a.patchCount}`,
    "",
    `Scenario: ${scenario==="apc"?"APC encounter heuristic":"Scientific review only"}`,
    `Illustrative engagement index: ${scenario==="apc"?heuristic.score+"/100":"not calculated"}`,
    "",
    "Interpretation:",
    scenario==="apc"
      ? "The displayed interaction index is derived only from simple geometric proxies. It demonstrates how ImmuneVax can turn versioned structural descriptors into a traceable scenario result."
      : "Only structural descriptors were calculated. No immune-interaction heuristic was applied.",
    "",
    "Limitations:",
    "- not molecular docking",
    "- not solvent-accessibility calculation",
    "- not epitope prediction",
    "- not a vaccine recommendation",
    "- no clinical inference",
    "",
    "Final status: HUMAN SCIENTIFIC REVIEW REQUIRED"
  ];
  document.querySelector("#reportOutput").textContent=lines.join("\n");
}

function updateMiniProtein(){
  const root=document.querySelector("#miniProtein");
  root.innerHTML="";
  const c=centroid(atoms);
  const subset=atoms.filter((_,i)=>i%Math.max(1,Math.floor(atoms.length/28))===0).slice(0,28);
  const maxR=Math.max(...subset.map(p=>Math.hypot(p.x-c.x,p.y-c.y,p.z-c.z)),1);
  for(const p of subset){
    const dot=document.createElement("i");
    dot.style.left=(50+(p.x-c.x)/maxR*38)+"%";
    dot.style.top=(50+(p.y-c.y)/maxR*38)+"%";
    root.appendChild(dot);
  }
  document.querySelector("#proteinLabel").textContent=structureName;
}

document.querySelector("#runAnalysis").addEventListener("click",runAnalysis);
document.querySelector("#copyReport").addEventListener("click",async()=>{
  const text=document.querySelector("#reportOutput").textContent;
  try{await navigator.clipboard.writeText(text);showToast("Report copied");}
  catch{showToast("Copy unavailable");}
});
function showToast(message){
  const toast=document.querySelector("#toast");
  toast.textContent=message;toast.classList.add("show");
  setTimeout(()=>toast.classList.remove("show"),1500);
}

latestAnalysis=analyze(atoms);
surfaceMask=latestAnalysis.surfaceMask;
updateMiniProtein();
runAnalysis();
render();
