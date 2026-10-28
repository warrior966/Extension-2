(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const KEY = "focusGuardSchoolAdmin.v1";
  const initial = {
    devices: [
      {id:"FG-001",name:"Portátil Aula 1-01",room:"Aula 1 · 1º ESO",owner:"Departamento TIC",platform:"ChromeOS",status:"Activo"},
      {id:"FG-002",name:"Equipo Biblioteca-03",room:"Biblioteca",owner:"Biblioteca",platform:"Windows",status:"Activo"},
      {id:"FG-003",name:"Portátil Aula 2-04",room:"Aula 2 · 2º ESO",owner:"Departamento TIC",platform:"ChromeOS",status:"Mantenimiento"}
    ],
    policies: [
      {id:"POL-01",name:"Aula de informática",group:"Alumnado · ESO",notes:"Priorizar recursos educativos y limitar distracciones durante las sesiones."},
      {id:"POL-02",name:"Personal docente",group:"Profesorado",notes:"Perfil de trabajo con acceso a recursos pedagógicos y administrativos."}
    ],
    audit: [{action:"Inventario de demostración cargado",detail:"Datos de ejemplo; no representan dispositivos conectados.",at:new Date().toISOString()}]
  };
  let data;
  try { data = JSON.parse(localStorage.getItem(KEY)) || structuredClone(initial); }
  catch { data = structuredClone(initial); }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch {} };
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  let toastTimer;
  function toast(message) { const el=$("toast"); el.textContent=message; el.classList.add("show"); clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.classList.remove("show"),2400); }
  function log(action, detail) { data.audit.unshift({action,detail,at:new Date().toISOString()}); data.audit=data.audit.slice(0,100); save(); renderAudit(); }
  function renderStats() { $("deviceCount").textContent=data.devices.length; $("activeCount").textContent=data.devices.filter(d=>d.status==="Activo").length; $("policyCount").textContent=data.policies.length; $("eventCount").textContent=data.audit.length; }
  function renderDevices() {
    const query=$("deviceSearch").value.trim().toLocaleLowerCase("es");
    const status=$("statusFilter").value;
    const rows=data.devices.filter(d=>(status==="all"||d.status===status)&&[d.name,d.room,d.owner,d.platform,d.id].some(v=>v.toLocaleLowerCase("es").includes(query)));
    $("deviceRows").innerHTML=rows.map(d=>`<tr><td>${escapeHtml(d.name)}<span class="subcell">${escapeHtml(d.id)}</span></td><td>${escapeHtml(d.room)}</td><td>${escapeHtml(d.owner||"—")}</td><td>${escapeHtml(d.platform)}</td><td><span class="state ${escapeHtml(d.status)}">${escapeHtml(d.status)}</span></td><td><div class="row-actions"><button class="mini-btn" data-edit="${escapeHtml(d.id)}">Editar</button><button class="mini-btn danger" data-delete="${escapeHtml(d.id)}">Eliminar</button></div></td></tr>`).join("");
    $("emptyDevices").hidden=rows.length!==0;
    renderStats();
  }
  function renderPolicies() {
    $("policyList").innerHTML=data.policies.map(p=>`<article class="policy-card"><span class="eyebrow">${escapeHtml(p.id)}</span><h3>${escapeHtml(p.name)}</h3><div class="group">${escapeHtml(p.group)}</div><p>${escapeHtml(p.notes||"Sin notas adicionales.")}</p><button class="mini-btn danger" data-policy-delete="${escapeHtml(p.id)}">Eliminar perfil</button></article>`).join("");
    if(!data.policies.length) $("policyList").innerHTML='<p class="empty">Aún no hay perfiles. Crea uno para documentar una política.</p>';
    renderStats();
  }
  function renderAudit() {
    $("auditList").innerHTML=data.audit.map(e=>`<div class="audit-item"><span class="audit-icon">✓</span><div><strong>${escapeHtml(e.action)}</strong><p>${escapeHtml(e.detail)}</p><time datetime="${escapeHtml(e.at)}">${new Date(e.at).toLocaleString("es-ES")}</time></div></div>`).join("");
    if(!data.audit.length) $("auditList").innerHTML='<p class="empty">No hay eventos registrados.</p>';
    renderStats();
  }
  function render() { renderDevices(); renderPolicies(); renderAudit(); }
  function openDevice(device) {
    $("deviceForm").reset();
    $("deviceId").value=device?.id||"";
    $("deviceName").value=device?.name||"";
    $("deviceRoom").value=device?.room||"";
    $("deviceOwner").value=device?.owner||"";
    $("devicePlatform").value=device?.platform||"ChromeOS";
    $("deviceStatus").value=device?.status||"Activo";
    $("deviceDialogTitle").textContent=device?"Editar equipo":"Registrar equipo";
    $("deviceDialog").showModal();
  }
  $("addDeviceBtn").addEventListener("click",()=>openDevice(null));
  $("deviceSearch").addEventListener("input",renderDevices);
  $("statusFilter").addEventListener("change",renderDevices);
  $("deviceRows").addEventListener("click",e=>{
    const edit=e.target.closest("[data-edit]"); const del=e.target.closest("[data-delete]");
    if(edit){const d=data.devices.find(x=>x.id===edit.dataset.edit);if(d)openDevice(d);}
    if(del){const d=data.devices.find(x=>x.id===del.dataset.delete);if(d&&confirm(`¿Eliminar el registro ${d.name}? Esta acción no borra ni modifica el equipo real.`)){data.devices=data.devices.filter(x=>x.id!==d.id);save();log("Registro de equipo eliminado",d.id+" · "+d.name);renderDevices();toast("Registro eliminado");}}
  });
  $("deviceForm").addEventListener("submit",e=>{
    e.preventDefault();
    const id=$("deviceId").value||"FG-"+String(Date.now()).slice(-7);
    const device={id,name:$("deviceName").value.trim(),room:$("deviceRoom").value.trim(),owner:$("deviceOwner").value.trim(),platform:$("devicePlatform").value,status:$("deviceStatus").value};
    if(!device.name||!device.room)return;
    const exists=data.devices.some(d=>d.id===id);
    data.devices=exists?data.devices.map(d=>d.id===id?device:d):[device,...data.devices];
    save();$("deviceDialog").close();log(exists?"Registro de equipo actualizado":"Equipo registrado",device.id+" · "+device.name);renderDevices();toast(exists?"Cambios guardados":"Equipo registrado");
  });
  $("addPolicyBtn").addEventListener("click",()=>{$("policyForm").reset();$("policyDialog").showModal();});
  $("policyForm").addEventListener("submit",e=>{
    e.preventDefault();const p={id:"POL-"+String(Date.now()).slice(-6),name:$("policyName").value.trim(),group:$("policyGroup").value.trim(),notes:$("policyNotes").value.trim()};
    if(!p.name||!p.group)return;data.policies.unshift(p);save();$("policyDialog").close();log("Perfil de política creado",p.name+" · "+p.group);renderPolicies();toast("Perfil creado");
  });
  $("policyList").addEventListener("click",e=>{const b=e.target.closest("[data-policy-delete]");if(!b)return;const p=data.policies.find(x=>x.id===b.dataset.policyDelete);if(p&&confirm("¿Eliminar este perfil documentado?")){data.policies=data.policies.filter(x=>x.id!==p.id);save();log("Perfil de política eliminado",p.name);renderPolicies();toast("Perfil eliminado");}});
  document.querySelectorAll("[data-close]").forEach(b=>b.addEventListener("click",()=>$(b.dataset.close).close()));
  $("clearAuditBtn").addEventListener("click",()=>{if(confirm("¿Vaciar el historial local de esta demo?")){data.audit=[];save();renderAudit();toast("Registro vaciado");}});
  $("exportBtn").addEventListener("click",()=>{
    const cols=["id","name","room","owner","platform","status"];
    const csv=[cols.join(","),...data.devices.map(d=>cols.map(k=>'"'+String(d[k]??"").replace(/"/g,'""')+'"').join(","))].join("\r\n");
    const url=URL.createObjectURL(new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8"}));
    const a=document.createElement("a");a.href=url;a.download="focus-guard-inventario.csv";a.click();URL.revokeObjectURL(url);
    log("Inventario exportado","CSV generado desde los registros locales");toast("Exportación preparada");
  });
  render();
})();