const key="immunevax-demo-history-v1";
let imported={structure:null,stability:null,docking:null,evidence:null};
let privateRun=null;
let activeScenario="balanced";
const scenarios={
  balanced:{antigen:[90,76,61,46,34,25,18,13],apc:[12,28,51,68,61,47,34,24],adaptive:[2,8,20,39,58,66,62,54]},
  uncertain:{antigen:[90,72,64,45,39,24,22,12],apc:[10,35,42,71,48,60,30,28],adaptive:[2,5,24,31,60,48,67,46]},
  weak:{antigen:[90,72,55,39,27,18,12,8],apc:[8,18,30,36,32,25,18,12],adaptive:[1,4,10,17,24,29,27,23]}
};
function toast(m){const e=document.querySelector("#toast");e.textContent=m;e.classList.add("show");setTimeout(()=>e.classList.remove("show"),1500)}
function loadHistory(){try{return JSON.parse(localStorage.getItem(key)||"[]")}catch{return[]}}
function saveHistory(rows){localStorage.setItem(key,JSON.stringify(rows.slice(-20)))}
function renderHistory(){const rows=loadHistory();document.querySelector("#historyList").innerHTML=rows.length?rows.slice().reverse().map(r=>`<div class="history-card"><strong>${r.label}</strong><span>${r.record_id} · ${new Date(r.saved_at).toLocaleString()}</span><span>review: ${r.review.state}</span></div>`).join(""):'<div class="empty">No local demo records saved yet.</div>'}
function renderAdapterSummary(){const parts=[];for(const [k,v] of Object.entries(imported))if(v)parts.push(`${k}: ${v.model||v.method||v.source||"loaded"}`);document.querySelector("#adapterSummary").textContent=parts.length?parts.join(" | "):"No adapter result metadata imported."}
async function importJson(input,keyName,statusId){const f=input.files[0];if(!f)return;try{imported[keyName]=JSON.parse(await f.text());document.querySelector(statusId).textContent="loaded";renderAdapterSummary();renderPreview();toast(keyName+" metadata imported")}catch{document.querySelector(statusId).textContent="invalid JSON";toast("Import failed")}}
document.querySelector("#structureResult").addEventListener("change",e=>importJson(e.target,"structure","#structureStatus"));
document.querySelector("#stabilityResult").addEventListener("change",e=>importJson(e.target,"stability","#stabilityStatus"));
document.querySelector("#dockingResult").addEventListener("change",e=>importJson(e.target,"docking","#dockingStatus"));
document.querySelector("#evidenceResult").addEventListener("change",e=>importJson(e.target,"evidence","#evidenceStatus"));
function draw(){const c=document.querySelector("#scenarioCanvas"),ctx=c.getContext("2d"),d=Math.min(devicePixelRatio||1,2),r=c.getBoundingClientRect();c.width=Math.round(r.width*d);c.height=Math.round(r.height*d);ctx.setTransform(d,0,0,d,0,0);ctx.clearRect(0,0,r.width,r.height);for(let i=1;i<5;i++){ctx.strokeStyle="rgba(130,170,190,.14)";ctx.beginPath();ctx.moveTo(0,r.height*i/5);ctx.lineTo(r.width,r.height*i/5);ctx.stroke()}const s=scenarios[activeScenario],series=[["antigen","#62d5ff"],["apc","#9b8cff"],["adaptive","#66e0ba"]];for(const [k,col] of series){ctx.strokeStyle=col;ctx.lineWidth=2;ctx.beginPath();s[k].forEach((v,i)=>{const x=10+i/(s[k].length-1)*(r.width-20),y=r.height-10-v/100*(r.height-20);if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y)});ctx.stroke()}}
document.querySelectorAll(".tab").forEach(b=>b.addEventListener("click",()=>{document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));b.classList.add("active");activeScenario=b.dataset.scenario;draw();renderPreview()}));
function record(){return{schema_version:"immunevax-dashboard-demo-1.0",record_id:"IVX-"+Math.random().toString(16).slice(2,10).toUpperCase(),saved_at:new Date().toISOString(),label:document.querySelector("#recordLabel").value.trim()||"Demo record",confidence_note:document.querySelector("#confidenceNote").value.trim(),adapter_metadata:imported,synthetic_scenario:activeScenario,private_run:privateRun?{public_run_id:privateRun.public_run_id,model:privateRun.model,source_categories:privateRun.source_categories,scientific_status:privateRun.scientific_status}:null,review:{state:document.querySelector("#reviewState").value,note:document.querySelector("#reviewNote").value.trim()},boundary:"Presentation layer only. Sanitized private-run results may be visualized, but private source records, API payloads, credentials, source code, and clinical claims are excluded."}}
function renderPreview(){const p=record();p.record_id="preview";p.saved_at="not saved";document.querySelector("#recordPreview").textContent=JSON.stringify(p,null,2)}
document.querySelector("#saveRecord").addEventListener("click",()=>{const r=record(),rows=loadHistory();rows.push(r);saveHistory(rows);const b=document.querySelector("#reviewBadge");b.textContent=r.review.state;b.className="status "+(r.review.state==="Reviewed"?"safe":"warning");renderHistory();renderPreview();toast("Demo record saved locally")});
document.querySelector("#exportRecord").addEventListener("click",()=>{const r=record(),blob=new Blob([JSON.stringify(r,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="ImmuneVax_dashboard_record.json";a.click();URL.revokeObjectURL(url);toast("Record exported")});
document.querySelector("#clearHistory").addEventListener("click",()=>{localStorage.removeItem(key);renderHistory();toast("Local history cleared")});
["recordLabel","confidenceNote","reviewState","reviewNote"].forEach(id=>document.querySelector("#"+id).addEventListener("input",renderPreview));
renderHistory();renderAdapterSummary();renderPreview();draw();

function validatePrivateRun(payload){
  if(!payload || payload.schema_version!=="immunevax-public-run-1.0")throw new Error("Unsupported public-run schema");
  if(!payload.public_run_id || !payload.model || !payload.trajectory)throw new Error("Incomplete sanitized run");
  const privacy=payload.privacy||{};
  for(const key of ["raw_private_record_ids_included","raw_external_payloads_included","api_credentials_included","private_source_code_included"]){
    if(privacy[key]!==false)throw new Error("Privacy validation failed: "+key);
  }
  return payload;
}
function privateSeries(name){return Array.isArray(privateRun?.trajectory?.[name])?privateRun.trajectory[name]:[]}
function privatePeak(name){const rows=privateSeries(name);return rows.length?Math.max(...rows.map(x=>Number(x.value)||0)):0}
function renderPrivateRun(){
  const badge=document.querySelector("#privateRunBadge");
  const summary=document.querySelector("#privateRunSummary");
  const metrics=document.querySelector("#privateRunMetrics");
  const limitations=document.querySelector("#privateRunLimitations");
  if(!privateRun){
    badge.textContent="No private run loaded";
    badge.className="status";
    metrics.innerHTML="";
    limitations.innerHTML="";
    drawPrivateRun();
    return;
  }
  badge.textContent="Sanitized private run loaded";
  badge.className="status safe";
  const sources=(privateRun.source_categories||[]).join(", ")||"not disclosed";
  summary.textContent=`${privateRun.public_run_id} · ${privateRun.model.name} v${privateRun.model.version} · calibration: ${privateRun.model.calibration_status} · sources: ${sources}`;
  metrics.innerHTML=[
    ["Peak APC",privatePeak("apc_activated")],
    ["Peak CD4",privatePeak("cd4_effector")],
    ["Peak CD8",privatePeak("cd8_effector")],
    ["Peak antibody",privatePeak("antibodies")],
    ["Peak IFN-γ",privatePeak("ifng")],
    ["Peak IL-6",privatePeak("il6")]
  ].map(([label,value])=>`<div class="private-metric"><span>${label}</span><strong>${(value*100).toFixed(0)}%</strong></div>`).join("");
  limitations.innerHTML=(privateRun.limitations||[]).slice(0,5).map(x=>`<span>${String(x).replace(/[<>&]/g,m=>({"<":"&lt;",">":"&gt;","&":"&amp;"}[m]))}</span>`).join("");
  drawPrivateRun();
}
function drawPrivateRun(){
  const c=document.querySelector("#privateRunCanvas");if(!c)return;
  const ctx=c.getContext("2d"),d=Math.min(devicePixelRatio||1,2),r=c.getBoundingClientRect();
  c.width=Math.round(r.width*d);c.height=Math.round(r.height*d);ctx.setTransform(d,0,0,d,0,0);ctx.clearRect(0,0,r.width,r.height);
  for(let i=1;i<5;i++){ctx.strokeStyle="rgba(130,170,190,.14)";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(0,r.height*i/5);ctx.lineTo(r.width,r.height*i/5);ctx.stroke()}
  if(!privateRun){ctx.fillStyle="rgba(160,190,205,.65)";ctx.font="14px system-ui";ctx.textAlign="center";ctx.fillText("Load a sanitized private run to visualize real private-core output",r.width/2,r.height/2);return}
  const defs=[
    ["antigen","#62d5ff"],
    ["apc_activated","#9b8cff"],
    ["cd4_effector","#66e0ba"],
    ["cd8_effector","#f3c75f"],
    ["antibodies","#ff8eb4"],
    ["ifng","#ff9e66"]
  ];
  const all=defs.flatMap(([name])=>privateSeries(name));
  const maxDay=Math.max(1,...all.map(x=>Number(x.day)||0));
  for(const [name,color] of defs){
    const rows=privateSeries(name);if(!rows.length)continue;
    ctx.strokeStyle=color;ctx.lineWidth=2;ctx.beginPath();
    rows.forEach((row,i)=>{const x=10+(Number(row.day)||0)/maxDay*(r.width-20),y=r.height-10-(Number(row.value)||0)*(r.height-20);if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y)});
    ctx.stroke();
  }
}
document.querySelector("#privateRunFile").addEventListener("change",async e=>{
  const f=e.target.files[0];if(!f)return;
  try{
    privateRun=validatePrivateRun(JSON.parse(await f.text()));
    renderPrivateRun();renderPreview();toast("Sanitized private ImmuneVax run loaded");
  }catch(err){
    privateRun=null;renderPrivateRun();toast("Private-run import failed");
    document.querySelector("#privateRunSummary").textContent=err.message;
  }
});
window.addEventListener("resize",()=>{draw();drawPrivateRun()});
renderPrivateRun();
