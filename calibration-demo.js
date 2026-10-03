(()=>{
  "use strict";

  const fileInput=document.querySelector("#runFile");
  if(!fileInput)return;

  let run=null;
  const $=s=>document.querySelector(s);
  const esc=v=>String(v??"").replace(/[<>&]/g,m=>({"<":"&lt;",">":"&gt;","&":"&amp;"}[m]));
  const fmt=(v,d=3)=>{const n=Number(v);return Number.isFinite(n)?n.toFixed(d):"—"};
  const pct=v=>{const n=Number(v);return Number.isFinite(n)?(n*100).toFixed(0)+"%":"—"};

  function calToast(message){
    const element=$("#toast");
    if(!element)return;
    element.textContent=message;
    element.classList.add("show");
    setTimeout(()=>element.classList.remove("show"),1600);
  }

  function validate(payload){
    if(!payload||payload.schema_version!=="immunevax-public-run-1.0"){
      throw new Error("Unsupported sanitized-run schema.");
    }
    if(!payload.public_run_id||!payload.model||!payload.trajectory){
      throw new Error("Incomplete sanitized run.");
    }
    const privacy=payload.privacy||{};
    for(const key of [
      "raw_private_record_ids_included",
      "raw_external_payloads_included",
      "api_credentials_included",
      "private_source_code_included",
      "private_parameter_values_included"
    ]){
      if(privacy[key]!==false){
        throw new Error("Privacy validation failed: "+key);
      }
    }
    return payload;
  }

  function metric(label,value,note=""){
    return `<div class="calibration-metric"><span>${esc(label)}</span><strong>${esc(value)}</strong><small>${esc(note)}</small></div>`;
  }

  function renderCrossStudy(summary){
    const cross=summary?.cross_study_validation||null;
    const metricBox=$("#crossStudyMetrics");
    const studyBox=$("#crossStudyStudies");
    const boundary=$("#crossStudyBoundary");
    if(!metricBox||!studyBox)return;

    if(!cross){
      metricBox.innerHTML='<div class="calibration-empty">This export predates external cross-study validation or contains no external-study summary.</div>';
      studyBox.innerHTML='<div class="calibration-empty">No external study metrics loaded.</div>';
      if(boundary)boundary.textContent="External validation is scored only when an approved validation-only dataset is present. It is never used as a vaccine-success probability.";
      return;
    }

    metricBox.innerHTML=[
      metric("External-study log-RMSE",fmt(cross.overall_weighted_log_rmse),"fixed model; no parameter refitting"),
      metric("Direction agreement",pct(cross.overall_direction_agreement_fraction),"increase / decrease / near-baseline agreement"),
      metric("Independent studies",fmt(cross.study_count,0),"separate FluPRINT clinical-study cohorts"),
      metric("External observations",fmt(cross.observation_count,0),"aggregate mapped T-cell/cytokine targets")
    ].join("");

    const rows=Array.isArray(cross.study_metrics)?cross.study_metrics:[];
    studyBox.innerHTML=rows.length?rows.map(item=>
      `<div class="cross-study-row"><strong>${esc(item.study||item.label||"study")}</strong><span>RMSE ${fmt(item.weighted_log_rmse)}</span><span>direction ${pct(item.direction_agreement_fraction)}</span></div>`
    ).join(""):'<div class="calibration-empty">No per-study aggregate metrics in this export.</div>';

    if(boundary){
      boundary.textContent=cross.scientific_boundary||"Independent population-level validation only; not clinical accuracy or vaccine efficacy.";
    }
  }

  function renderSummary(){
    if(!run)return;
    const summary=run.calibration_summary||{};
    const status=$("#statusBadge");
    if(status){
      status.textContent="Sanitized private-core result loaded";
      status.className="status safe";
    }
    const runSummary=$("#runSummary");
    if(runSummary){
      runSummary.textContent=`${run.public_run_id} · ${run.model.name} v${run.model.version} · ${summary.calibration_scope||run.model.calibration_status} · sources: ${(run.source_categories||[]).join(", ")||"not disclosed"}`;
    }

    const train=summary.calibrated_weighted_log_rmse;
    const hold=summary.validation_weighted_log_rmse;
    const coverage=Number(summary.parameter_coverage_fraction);
    const hum=summary.humoral||{};
    const calibrationMetrics=$("#calibrationMetrics");
    if(calibrationMetrics){
      calibrationMetrics.innerHTML=[
        metric("Training log-RMSE",fmt(train),"selected public-human fit cohort"),
        metric("Participant holdout log-RMSE",fmt(hold),"participants excluded from fitting"),
        metric("Core parameter coverage",Number.isFinite(coverage)?(coverage*100).toFixed(1)+"%":"—","identified from selected public datasets"),
        metric("Training participants",fmt(summary.training_participant_count,0),"aggregate cohort count; identifiers hidden"),
        metric("Holdout participants",fmt(summary.validation_participant_count,0),"separate participant holdout"),
        metric("Humoral IgM/IgG RMSE",fmt(hum.calibrated_combined_rmse),"SDY1370 population calibration"),
        metric("Humoral temporal holdout",fmt(hum.mean_temporal_holdout_rmse),"leave-one-timepoint-out"),
        metric("Private parameters","Hidden","never included in the public export")
      ].join("");
    }

    const trainLayers=Array.isArray(summary.layer_metrics)?summary.layer_metrics:[];
    const validLayers=Array.isArray(summary.validation_layer_metrics)?summary.validation_layer_metrics:[];
    const validMap=new Map(validLayers.map(item=>[item.layer,item]));
    const layerMetrics=$("#layerMetrics");
    if(layerMetrics){
      layerMetrics.innerHTML=trainLayers.length?trainLayers.map(item=>{
        const validation=validMap.get(item.layer);
        return `<div class="calibration-layer-row"><strong>${esc(String(item.layer).replaceAll("_"," "))}</strong><span>train ${fmt(item.weighted_log_rmse)}</span><span>holdout ${fmt(validation?.weighted_log_rmse)}</span></div>`;
      }).join(""):'<div class="calibration-empty">No layer-specific aggregate metrics in this export.</div>';
    }

    const scientificStatus=$("#scientificStatus");
    if(scientificStatus){
      scientificStatus.textContent=run.scientific_status||summary.interpretation||"Non-clinical mechanistic research result.";
    }
    const limitations=$("#limitations");
    if(limitations){
      limitations.innerHTML=(run.limitations||[]).slice(0,10).map(item=>`<span>${esc(item)}</span>`).join("");
    }
    renderCrossStudy(summary);
  }

  function series(name){
    return Array.isArray(run?.trajectory?.[name])?run.trajectory[name]:[];
  }
  function humoral(name){
    return Array.isArray(run?.humoral_trajectory?.[name])?run.humoral_trajectory[name]:[];
  }

  function draw(canvasId,defs,getter){
    const canvas=$(canvasId);
    if(!canvas)return;
    const context=canvas.getContext("2d");
    const density=Math.min(devicePixelRatio||1,2);
    const rect=canvas.getBoundingClientRect();
    canvas.width=Math.max(1,Math.round(rect.width*density));
    canvas.height=Math.max(1,Math.round(rect.height*density));
    context.setTransform(density,0,0,density,0,0);
    context.clearRect(0,0,rect.width,rect.height);
    context.strokeStyle="rgba(130,170,190,.15)";
    context.lineWidth=1;
    for(let index=1;index<5;index++){
      const y=rect.height*index/5;
      context.beginPath();context.moveTo(0,y);context.lineTo(rect.width,y);context.stroke();
    }
    if(!run){
      context.fillStyle="rgba(160,190,205,.65)";
      context.font="14px system-ui";
      context.textAlign="center";
      context.fillText("Load a sanitized private-core run",rect.width/2,rect.height/2);
      return;
    }
    const all=defs.flatMap(([name])=>getter(name));
    const maxDay=Math.max(1,...all.map(item=>Number(item.day)||0));
    for(const [name,color] of defs){
      const rows=getter(name);
      if(!rows.length)continue;
      context.strokeStyle=color;
      context.lineWidth=2;
      context.beginPath();
      rows.forEach((point,index)=>{
        const x=10+(Number(point.day)||0)/maxDay*(rect.width-20);
        const y=rect.height-10-(Number(point.value)||0)*(rect.height-20);
        if(index===0)context.moveTo(x,y);else context.lineTo(x,y);
      });
      context.stroke();
    }
  }

  function drawAll(){
    draw("#trajectoryCanvas",[
      ["apc_activated","#9b8cff"],
      ["cd4_effector","#66e0ba"],
      ["cd8_effector","#f3c75f"],
      ["antibodies","#ff8eb4"],
      ["ifng","#ff9e66"],
      ["il6","#62d5ff"]
    ],series);
    draw("#humoralCanvas",[["igm","#62d5ff"],["igg","#ff8eb4"]],humoral);
  }

  fileInput.addEventListener("change",async event=>{
    const file=event.target.files[0];
    if(!file)return;
    try{
      run=validate(JSON.parse(await file.text()));
      renderSummary();
      drawAll();
      calToast("Sanitized ImmuneVax result loaded locally");
    }catch(error){
      run=null;
      const status=$("#statusBadge");
      if(status){status.textContent="Invalid file";status.className="status warning";}
      const summary=$("#runSummary");
      if(summary)summary.textContent=error.message;
      drawAll();
      calToast("Sanitized-run import failed");
    }
  });

  window.addEventListener("resize",drawAll);
  drawAll();
})();
