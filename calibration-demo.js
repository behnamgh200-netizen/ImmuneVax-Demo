let run=null;
function $(s){return document.querySelector(s)}
function toast(m){const e=$("#toast");e.textContent=m;e.classList.add("show");setTimeout(()=>e.classList.remove("show"),1600)}
function esc(v){return String(v??"").replace(/[<>&]/g,m=>({"<":"&lt;",">":"&gt;","&":"&amp;"}[m]))}
function validate(payload){
  if(!payload||payload.schema_version!=="immunevax-public-run-1.0")throw new Error("Unsupported sanitized-run schema.");
  if(!payload.public_run_id||!payload.model||!payload.trajectory)throw new Error("Incomplete sanitized run.");
  const privacy=payload.privacy||{};
  for(const key of ["raw_private_record_ids_included","raw_external_payloads_included","api_credentials_included","private_source_code_included","private_parameter_values_included"]){
    if(privacy[key]!==false)throw new Error("Privacy validation failed: "+key);
  }
  return payload;
}
function fmt(v,d=3){const n=Number(v);return Number.isFinite(n)?n.toFixed(d):"—"}
function metric(label,value,note=""){return `<div class="metric"><span>${esc(label)}</span><strong>${esc(value)}</strong><small>${esc(note)}</small></div>`}
function renderSummary(){
  const s=run?.calibration_summary||{};
  if(!run){return}
  $("#statusBadge").textContent="Sanitized calibrated run loaded";
  $("#statusBadge").className="status safe";
  $("#runSummary").textContent=`${run.public_run_id} · ${run.model.name} v${run.model.version} · ${s.calibration_scope||run.model.calibration_status} · sources: ${(run.source_categories||[]).join(", ")||"not disclosed"}`;
  const train=s.calibrated_weighted_log_rmse;
  const hold=s.validation_weighted_log_rmse;
  const coverage=Number(s.parameter_coverage_fraction);
  const hum=s.humoral||{};
  $("#calibrationMetrics").innerHTML=[
    metric("Training log-RMSE",fmt(train),"selected public-human fit cohort"),
    metric("Holdout log-RMSE",fmt(hold),"participants not used for fitting"),
    metric("Core parameter coverage",Number.isFinite(coverage)?(coverage*100).toFixed(1)+"%":"—","fraction calibrated from selected datasets"),
    metric("Humoral IgM/IgG RMSE",fmt(hum.calibrated_combined_rmse),"independent SDY1370 calibration"),
    metric("Humoral temporal holdout",fmt(hum.mean_temporal_holdout_rmse),"leave-one-timepoint-out"),
    metric("Private parameters","Hidden","not included in public export")
  ].join("");
  const trainLayers=Array.isArray(s.layer_metrics)?s.layer_metrics:[];
  const validLayers=Array.isArray(s.validation_layer_metrics)?s.validation_layer_metrics:[];
  const validMap=new Map(validLayers.map(x=>[x.layer,x]));
  $("#layerMetrics").innerHTML=trainLayers.length?trainLayers.map(x=>{
    const v=validMap.get(x.layer);
    return `<div class="layer-row"><strong>${esc(x.layer.replaceAll("_"," "))}</strong><span>train ${fmt(x.weighted_log_rmse)}</span><span>holdout ${fmt(v?.weighted_log_rmse)}</span></div>`
  }).join(""):'<div class="empty">This run contains no layer-specific aggregate metrics.</div>';
  $("#scientificStatus").textContent=run.scientific_status||s.interpretation||"Non-clinical mechanistic research result.";
  $("#limitations").innerHTML=(run.limitations||[]).slice(0,8).map(x=>`<span>${esc(x)}</span>`).join("");
}
function series(name){return Array.isArray(run?.trajectory?.[name])?run.trajectory[name]:[]}
function humoral(name){return Array.isArray(run?.humoral_trajectory?.[name])?run.humoral_trajectory[name]:[]}
function draw(canvasId,defs,getter){
  const c=$(canvasId),ctx=c.getContext("2d"),d=Math.min(devicePixelRatio||1,2),r=c.getBoundingClientRect();
  c.width=Math.round(r.width*d);c.height=Math.round(r.height*d);ctx.setTransform(d,0,0,d,0,0);ctx.clearRect(0,0,r.width,r.height);
  ctx.strokeStyle="rgba(130,170,190,.15)";ctx.lineWidth=1;for(let i=1;i<5;i++){const y=r.height*i/5;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(r.width,y);ctx.stroke()}
  if(!run){ctx.fillStyle="rgba(160,190,205,.65)";ctx.font="14px system-ui";ctx.textAlign="center";ctx.fillText("Load a sanitized calibrated run",r.width/2,r.height/2);return}
  const all=defs.flatMap(([name])=>getter(name));const maxDay=Math.max(1,...all.map(x=>Number(x.day)||0));
  for(const [name,color] of defs){const rows=getter(name);if(!rows.length)continue;ctx.strokeStyle=color;ctx.lineWidth=2;ctx.beginPath();rows.forEach((p,i)=>{const x=10+(Number(p.day)||0)/maxDay*(r.width-20),y=r.height-10-(Number(p.value)||0)*(r.height-20);if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y)});ctx.stroke()}
}
function drawAll(){
  draw("#trajectoryCanvas",[["apc_activated","#9b8cff"],["cd4_effector","#66e0ba"],["cd8_effector","#f3c75f"],["antibodies","#ff8eb4"],["ifng","#ff9e66"],["il6","#62d5ff"]],series);
  draw("#humoralCanvas",[["igm","#62d5ff"],["igg","#ff8eb4"]],humoral);
}
$("#runFile").addEventListener("change",async e=>{
  const f=e.target.files[0];if(!f)return;
  try{run=validate(JSON.parse(await f.text()));renderSummary();drawAll();toast("Sanitized calibration run loaded locally")}catch(err){run=null;$("#statusBadge").textContent="Invalid file";$("#statusBadge").className="status warning";$("#runSummary").textContent=err.message;drawAll();toast("Run import failed")}
});
window.addEventListener("resize",drawAll);drawAll();
