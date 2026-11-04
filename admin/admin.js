import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { getFirestore, collection, doc, getDoc, getDocs, setDoc, addDoc, deleteDoc, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAHpkWaFwwI-QJWd06Dzkt6kc2tJXSkdA0",
  authDomain: "fidelazion.firebaseapp.com",
  projectId: "fidelazion",
  storageBucket: "fidelazion.firebasestorage.app",
  messagingSenderId: "999441586006",
  appId: "1:999441586006:web:bf8a81faa36c045741a8f7"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const $ = id => document.getElementById(id);
let user = null, role = "viewer", accessExpiresAt = null, accessExpiryTimer = null, devices = [], policies = [], managedUsers = [], groupPolicies = [], navigationPolicy = { mode: "free", whitelist: [], blacklist: [] }, navigationPolicyError = false, groupPolicyError = false, deviceRefreshTimer = null;
const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const canOperate = () => ["owner","admin","operator"].includes(role);
const isOwner = () => role === "owner";
function remainingLabel(date) { const ms=date-Date.now(); if(ms<=0)return "Caducado"; const d=Math.floor(ms/86400000),h=Math.floor(ms%86400000/3600000),m=Math.floor(ms%3600000/60000); return [d?d+" d":null,h?h+" h":null,(!d&&!h)||m?m+" min":null].filter(Boolean).join(" "); }
function enforceExpiry(){ if(accessExpiresAt && accessExpiresAt.toMillis()<=Date.now()){ if(accessExpiryTimer)clearInterval(accessExpiryTimer); signOut(auth); $("loginError").textContent="Tu tiempo de acceso al panel ha finalizado. Contacta con el owner del panel."; return true;} return false; }
function updateAccessSummary(){ const card=$("accessTimeCard"); if(!card)return; card.hidden=!accessExpiresAt; if(accessExpiresAt){$("accessTimeRemaining").textContent=remainingLabel(accessExpiresAt.toDate()); if(enforceExpiry())return;} }
function toast(message) { const el = $("toast"); el.textContent = message; el.classList.add("show"); setTimeout(() => el.classList.remove("show"), 2600); }
function fail(message, err) { console.error(message, err); toast(message); }
function stats() {
  $("deviceCount").textContent = devices.length;
  $("activeCount").textContent = devices.filter(d => d.status === "Activo" && d.lastSeen?.toDate && (Date.now() - d.lastSeen.toDate().getTime()) < 15 * 60 * 1000).length;
  $("policyCount").textContent = policies.length;
}
async function refreshDeviceLocations() {
  try {
    const snap = await getDocs(query(collection(db, "devices"), orderBy("name")));
    devices = snap.docs.map(d => ({id:d.id,...d.data()}));
    renderDevices();
  } catch (err) { console.warn("No se pudieron actualizar las URL de los dispositivos:", err); }
}
function showDeviceUrl(id) {
  const device = devices.find(d => d.id === id);
  const value = String(device?.currentUrl || "");
  const output = $("currentDeviceUrl"), link = $("openCurrentDeviceUrl");
  let parsed;
  try { parsed = new URL(value); } catch {}
  output.textContent = parsed && ["http:", "https:"].includes(parsed.protocol)
    ? value : "No hay una URL web disponible. El dispositivo puede estar sin una pestaña web activa o aún no haber sincronizado.";
  if (parsed && ["http:", "https:"].includes(parsed.protocol)) {
    link.href = value; link.hidden = false;
  } else { link.removeAttribute("href"); link.hidden = true; }
  $("urlDialog").showModal();
}
function lastSeenLabel(d) {
  if (!d.lastSeen?.toDate) return "Sin comunicación";
  return d.lastSeen.toDate().toLocaleString("es-ES");
}
function renderDevices() {
  const term = $("deviceSearch").value.trim().toLocaleLowerCase("es"), status = $("statusFilter").value;
  const filtered = devices.filter(d => (status === "all" || d.status === status) && [d.name,d.room,d.owner,d.platform,d.id].some(v => String(v || "").toLocaleLowerCase("es").includes(term)));
  $("deviceRows").innerHTML = filtered.map(d => `<tr><td>${esc(d.name)}<span class="subcell">${esc(d.id)}</span></td><td>${esc(d.room)}</td><td>${esc(d.owner || "—")}</td><td>${esc(d.platform)}</td><td>${esc(lastSeenLabel(d))}</td><td><span class="state ${esc(d.status)}">${esc(d.status)}</span></td><td>${d.profileLocked === true ? "Bloqueados" : "Desbloqueados"}</td><td><div class="row-actions"><button class="mini-btn" data-view-url="${esc(d.id)}">Ver URL</button>${canOperate() ? '<button class="mini-btn" data-toggle-profile-lock="'+esc(d.id)+'">'+(d.profileLocked === true ? "Desbloquear datos" : "Bloquear datos")+'</button><button class="mini-btn" data-edit="'+esc(d.id)+'">Editar</button>' : ''}${role === "admin" ? '<button class="mini-btn danger" data-delete="'+esc(d.id)+'">Eliminar</button>' : ''}</div></td></tr>`).join("");
  $("emptyDevices").hidden = filtered.length > 0;
  stats();
}
function renderPolicies() {
  $("policyList").innerHTML = policies.map(p => `<article class="policy-card"><span class="eyebrow">${esc(p.id)}</span><h3>${esc(p.name)}</h3><div class="group">${esc(p.group)}</div><p>${esc(p.notes || "Sin notas adicionales.")}</p>${role === "admin" ? '<button class="mini-btn danger" data-policy-delete="'+esc(p.id)+'">Eliminar perfil</button>' : ''}</article>`).join("") || '<p class="empty">Aún no hay perfiles. Crea uno para documentar una política.</p>';
  stats();
}
async function refresh() {
  const [ds, ps, policySnap, groupSnap] = await Promise.all([
    getDocs(query(collection(db, "devices"), orderBy("name"))),
    getDocs(query(collection(db, "policies"), orderBy("name"))),
    getDoc(doc(db, "settings", "globalPolicy")).catch(err => { console.warn("No se pudo leer la política global; comprueba las reglas de Firestore.", err); return null; }),
    getDoc(doc(db, "settings", "groupPolicies")).catch(err => { console.warn("No se pudieron leer las políticas por grupo.", err); return null; })
  ]);
  devices = ds.docs.map(d => ({id:d.id,...d.data()}));
  policies = ps.docs.map(d => ({id:d.id,...d.data()}));
  navigationPolicyError = !policySnap;
  if (policySnap?.exists()) {
    const data = policySnap.data();
    navigationPolicy = {
      mode: ["free", "block_all", "whitelist"].includes(data.mode) ? data.mode : "free",
      whitelist: Array.isArray(data.whitelist) ? data.whitelist.filter(v => typeof v === "string").slice(0, 50) : [],
      blacklist: Array.isArray(data.blacklist) ? data.blacklist.filter(v => typeof v === "string").slice(0, 50) : []
    };
  } else navigationPolicy = { mode: "free", whitelist: [], blacklist: [] };
  renderNavigationPolicy();
  groupPolicyError = !groupSnap;
  groupPolicies = groupSnap?.exists() && Array.isArray(groupSnap.data().groups) ? groupSnap.data().groups.filter(g => g && typeof g.name === "string" && ["free","block_all","whitelist"].includes(g.mode)).map(g => ({name:g.name, mode:g.mode, whitelist:Array.isArray(g.whitelist) ? g.whitelist.filter(v => typeof v === "string").slice(0,50) : []})) : [];
  renderGroupPolicies();
  renderDevices(); renderPolicies();
}
function renderNavigationPolicy() {
  const mode = $("navigationMode"), list = $("whitelistDomains"), black = $("blacklistDomains"), save = $("saveNavigationPolicyBtn");
  if (!mode || !list || !save) return;
  mode.value = navigationPolicy.mode;
  list.value = navigationPolicy.whitelist.join("\n");
  black.value = navigationPolicy.blacklist.join("\n");
  const canEdit = canOperate();
  mode.disabled = !canEdit; list.disabled = !canEdit; black.disabled = !canEdit; save.hidden = !canEdit;
  $("navigationPolicyStatus").textContent = navigationPolicyError
    ? "No se pudo leer settings/globalPolicy. Publica las reglas actualizadas de firestore.rules antes de guardar o sincronizar la política."
    : (!canEdit
      ? "Modo actual: " + navigationModeLabel(navigationPolicy.mode) + ". Tu rol es de solo lectura."
      : "Modo actual: " + navigationModeLabel(navigationPolicy.mode) + ". La política se sincroniza con las extensiones cuando se conectan.");
}
function navigationModeLabel(mode) {
  return ({free:"Libertad total",block_all:"Bloqueo total",whitelist:"Lista blanca"})[mode] || "Libertad total";
}
function normalizePolicyDomain(value) {
  let domain = String(value || "").trim().toLowerCase().replace(/^https?:\/\//, "").split(/[/?#]/, 1)[0].replace(/^www\./, "").replace(/\.$/, "");
  return /^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i.test(domain) ? domain : null;
}
function openDevice(d) {
  $("deviceForm").reset(); $("deviceId").value = d?.id || "";
  $("deviceName").value = d?.name || ""; $("deviceRoom").value = d?.room || "";
  $("deviceOwner").value = d?.owner || ""; $("devicePlatform").value = d?.platform || "ChromeOS";
  $("deviceStatus").value = d?.status || "Activo"; $("deviceDialogTitle").textContent = d ? "Editar equipo" : "Registrar equipo";
  $("deviceDialog").showModal();
}
$("loginForm").addEventListener("submit", async e => {
  e.preventDefault(); $("loginError").textContent = "";
  try { await signInWithEmailAndPassword(auth, $("loginEmail").value.trim(), $("loginPassword").value); }
  catch (err) { console.error(err); $("loginError").textContent = "No se pudo iniciar sesión. Comprueba las credenciales y que Email/Password esté activado en Firebase."; }
});
$("logoutBtn").addEventListener("click", () => signOut(auth));
onAuthStateChanged(auth, async u => {
  user = u;
  if (!u) { if(accessExpiryTimer){clearInterval(accessExpiryTimer);accessExpiryTimer=null;} accessExpiresAt=null; if (deviceRefreshTimer) { clearInterval(deviceRefreshTimer); deviceRefreshTimer = null; } $("loginScreen").hidden = false; $("appShell").hidden = true; return; }
  try {
    const profile = await getDoc(doc(db, "users", u.uid));
    const profileData = profile.exists() ? profile.data() : {};
    const assignedRole = profileData.role || null;
    accessExpiresAt = profileData.expiresAt || null;
    if (!["owner","admin","operator","viewer"].includes(assignedRole) || (accessExpiresAt && accessExpiresAt.toMillis() <= Date.now())) {
      await signOut(auth); $("loginError").textContent = "Cuenta autenticada pero sin rol autorizado. El owner debe autorizar users/"+u.uid+" con role admin, operator o viewer."; return;
    }
    role = assignedRole; $("usersNav").hidden = !isOwner(); $("users").hidden = !isOwner(); updateAccessSummary(); if(accessExpiryTimer)clearInterval(accessExpiryTimer); if(accessExpiresAt)accessExpiryTimer=setInterval(updateAccessSummary,30000); $("accountLabel").textContent = (u.email || "Usuario") + " · " + role;
    $("loginScreen").hidden = true; $("appShell").hidden = false;
    $("roleNotice").hidden = canOperate(); $("roleNotice").textContent = "Tu rol es de solo lectura.";
    $("addDeviceBtn").hidden = !canOperate(); $("addPolicyBtn").hidden = !canOperate(); if(isOwner()) await loadManagedUsers();
    await refresh();
    if (deviceRefreshTimer) clearInterval(deviceRefreshTimer);
    deviceRefreshTimer = setInterval(refreshDeviceLocations, 60_000);
  } catch (err) {
    console.error("No se pudo verificar el perfil o cargar el panel:", err);
    $("loginScreen").hidden = false;
    $("appShell").hidden = true;
    const detail = err?.code === "permission-denied"
      ? "Firebase ha bloqueado la lectura. Comprueba que las reglas de Firestore estén publicadas en el proyecto fidelazion."
      : "No se pudo leer tu perfil de administrador en Firestore. Comprueba la conexión y las reglas de Firestore.";
    $("loginError").textContent = detail + (err?.code ? " (" + err.code + ")" : "");
    await signOut(auth).catch(() => {});
  }
});
$("navigationPolicyForm").addEventListener("submit", async e => {
  e.preventDefault();
  const status = $("navigationPolicyStatus");
  try {
    if (!canOperate()) throw new Error("Tu rol no permite cambiar la política de navegación.");
    const raw = $("whitelistDomains").value.split(/[\r\n,;]+/).map(v => v.trim()).filter(Boolean);
    const normalized = [...new Set(raw.map(normalizePolicyDomain))];
    if (normalized.includes(null)) throw new Error("Hay un dominio no válido. Usa un dominio como example.com, sin rutas.");
    if (normalized.length > 50) throw new Error("La lista blanca admite un máximo de 50 dominios.");
    const blackRaw = $("blacklistDomains").value.split(/[\r\n,;]+/).map(v => v.trim()).filter(Boolean);
    const blacklist = [...new Set(blackRaw.map(normalizePolicyDomain))];
    if (blacklist.includes(null)) throw new Error("Hay un dominio no válido en la lista negra.");
    if (blacklist.length > 50) throw new Error("La lista negra admite un máximo de 50 dominios.");
    const mode = $("navigationMode").value;
    if (mode === "whitelist" && normalized.length === 0) throw new Error("Añade al menos un dominio antes de activar la lista blanca.");
    const payload = { mode, whitelist: normalized, blacklist, updatedAt: serverTimestamp(), updatedBy: user.uid };
    await setDoc(doc(db, "settings", "globalPolicy"), payload);
    navigationPolicy = { mode, whitelist: normalized, blacklist };
    status.textContent = "Política guardada. Las extensiones conectadas la recogerán automáticamente en un máximo aproximado de 1 minuto; también se cerrará la navegación ya abierta que quede bloqueada.";
    toast("Política de navegación guardada");
    renderNavigationPolicy();
    status.textContent = "Política guardada: " + navigationModeLabel(mode) + ". Las extensiones conectadas la recogerán automáticamente en un máximo aproximado de 1 minuto.";
  } catch (err) {
    console.error(err);
    status.textContent = err.message || "No se pudo guardar la política. Comprueba las reglas de Firestore.";
  }
});

function renderGroupPolicies() {
  const list = $("groupPolicyList"), status = $("groupPolicyStatus"), form = $("groupPolicyForm");
  if (!list || !status || !form) return;
  const canEdit = canOperate();
  ["groupPolicyName","groupPolicyMode","groupPolicyWhitelist","saveGroupPolicyBtn"].forEach(id => { $(id).disabled = !canEdit; });
  status.textContent = groupPolicyError
    ? "No se pudieron leer las políticas de grupo. Publica las reglas actualizadas de firestore.rules en Firebase Console."
    : (canEdit ? "Las políticas guardadas se aplicarán a los dispositivos cuyo aula/grupo coincida con el nombre." : "Tu rol es de solo lectura.");
  list.innerHTML = groupPolicies.map(g => `<article class="policy-card"><span class="eyebrow">AULA / GRUPO</span><h3>${esc(g.name)}</h3><div class="group">${esc(navigationModeLabel(g.mode))}</div><p>${g.mode === "whitelist" ? esc(g.whitelist.join(", ")) : (g.mode === "block_all" ? "Bloquea toda navegación HTTP/HTTPS." : "Permite la navegación web.")}</p>${canEdit ? '<button class="mini-btn" data-group-edit="'+esc(g.name)+'">Editar</button> ' : ''}${role === "admin" ? '<button class="mini-btn danger" data-group-delete="'+esc(g.name)+'">Eliminar</button>' : ''}</article>`).join("") || '<p class="empty">Todavía no hay políticas por grupo.</p>';
}
async function saveGroupPolicies() {
  await setDoc(doc(db, "settings", "groupPolicies"), {groups:groupPolicies, updatedAt:serverTimestamp(), updatedBy:user.uid});
}
$("groupPolicyForm").addEventListener("submit", async e => {
  e.preventDefault();
  try {
    if (!canOperate()) throw new Error("Tu rol no permite modificar políticas de grupo.");
    const name = $("groupPolicyName").value.trim();
    const mode = $("groupPolicyMode").value;
    const raw = $("groupPolicyWhitelist").value.split(/[\r\n,;]+/).map(v => v.trim()).filter(Boolean);
    const normalized = [...new Set(raw.map(normalizePolicyDomain))];
    if (!name) throw new Error("Escribe el nombre del aula o grupo.");
    if (normalized.includes(null)) throw new Error("Hay un dominio no válido. Usa example.com, sin rutas.");
    if (normalized.length > 50) throw new Error("La lista blanca admite un máximo de 50 dominios.");
    if (mode === "whitelist" && !normalized.length) throw new Error("Añade al menos un dominio para la lista blanca.");
    const existing = groupPolicies.findIndex(g => g.name.toLocaleLowerCase("es") === name.toLocaleLowerCase("es"));
    const group = {name, mode, whitelist:normalized};
    if (existing >= 0) groupPolicies[existing] = group; else groupPolicies.push(group);
    await saveGroupPolicies();
    renderGroupPolicies();
    $("groupPolicyStatus").textContent = "Política del grupo guardada. Los dispositivos la recibirán en su próxima sincronización.";
    $("groupPolicyForm").reset();
    toast("Política del grupo guardada");
  } catch (err) { console.error(err); $("groupPolicyStatus").textContent = err.message || "No se pudo guardar la política del grupo."; }
});
$("groupPolicyList").addEventListener("click", async e => {
  const edit = e.target.closest("[data-group-edit]"), del = e.target.closest("[data-group-delete]");
  if (edit) {
    const g = groupPolicies.find(x => x.name === edit.dataset.groupEdit);
    if (g) { $("groupPolicyName").value = g.name; $("groupPolicyMode").value = g.mode; $("groupPolicyWhitelist").value = g.whitelist.join("\n"); $("groupPolicyForm").scrollIntoView({behavior:"smooth",block:"center"}); }
  }
  if (del) {
    const name = del.dataset.groupDelete;
    if (role !== "admin" || !confirm("¿Eliminar la política del grupo " + name + "?")) return;
    try { groupPolicies = groupPolicies.filter(g => g.name !== name); await saveGroupPolicies(); renderGroupPolicies(); toast("Política de grupo eliminada"); }
    catch (err) { fail("No se pudo eliminar la política del grupo.", err); }
  }
});

$("addDeviceBtn").addEventListener("click", () => openDevice(null));
$("deviceSearch").addEventListener("input", renderDevices);
$("statusFilter").addEventListener("change", renderDevices);
$("deviceRows").addEventListener("click", async e => {
  const viewUrl = e.target.closest("[data-view-url]");
  if (viewUrl) { showDeviceUrl(viewUrl.dataset.viewUrl); return; }
  const toggleLock = e.target.closest("[data-toggle-profile-lock]");
  if (toggleLock) {
    const d = devices.find(x => x.id === toggleLock.dataset.toggleProfileLock);
    if (!d || !canOperate()) return;
    const nextLocked = d.profileLocked !== true;
    const action = nextLocked ? "bloquear" : "desbloquear";
    if (!confirm("¿Quieres "+action+" el nombre y aula/grupo de este perfil?")) return;
    try {
      await setDoc(doc(db, "devices", d.id), {profileLocked:nextLocked,updatedAt:serverTimestamp(),updatedBy:user.uid}, {merge:true});
      await refresh(); toast(nextLocked ? "Datos bloqueados" : "Datos desbloqueados");
    } catch (err) { fail("No se pudieron cambiar los permisos de edición del perfil.", err); }
    return;
  }
  const edit = e.target.closest("[data-edit]"), del = e.target.closest("[data-delete]");
  if (edit) { const d = devices.find(x => x.id === edit.dataset.edit); if (d) openDevice(d); }
  if (del) {
    const d = devices.find(x => x.id === del.dataset.delete);
    if (d && confirm("¿Eliminar el registro "+d.name+"? No afecta al equipo real.")) try {
      await deleteDoc(doc(db, "devices", d.id)); await refresh(); toast("Registro eliminado");
    } catch (err) { fail("No se pudo eliminar el registro. Comprueba los permisos.", err); }
  }
});
$("deviceForm").addEventListener("submit", async e => {
  e.preventDefault();
  try {
    if (!canOperate()) throw new Error("Tu rol no permite modificar equipos.");
    const oldId = $("deviceId").value, id = oldId || "FG-"+crypto.randomUUID().slice(0,8).toUpperCase();
    const d = {name:$("deviceName").value.trim(),room:$("deviceRoom").value.trim(),owner:$("deviceOwner").value.trim(),platform:$("devicePlatform").value,status:$("deviceStatus").value,updatedAt:serverTimestamp(),updatedBy:user.uid};
    if (!d.name || !d.room) return;
    await setDoc(doc(db, "devices", id), d, {merge:true});
    $("deviceDialog").close(); await refresh(); toast("Equipo guardado");
  } catch (err) { fail(err.message || "No se pudo guardar el equipo.", err); }
});
$("addPolicyBtn").addEventListener("click", () => { $("policyForm").reset(); $("policyDialog").showModal(); });
$("policyForm").addEventListener("submit", async e => {
  e.preventDefault();
  try {
    if (!canOperate()) throw new Error("Tu rol no permite crear perfiles.");
    const p = {name:$("policyName").value.trim(),group:$("policyGroup").value.trim(),notes:$("policyNotes").value.trim(),createdAt:serverTimestamp(),createdBy:user.uid};
    if (!p.name || !p.group) return;
    await addDoc(collection(db, "policies"), p); $("policyDialog").close(); await refresh(); toast("Perfil creado");
  } catch (err) { fail(err.message || "No se pudo crear el perfil.", err); }
});
$("policyList").addEventListener("click", async e => {
  const b = e.target.closest("[data-policy-delete]"); if (!b) return;
  const p = policies.find(x => x.id === b.dataset.policyDelete);
  if (p && confirm("¿Eliminar este perfil?")) try { await deleteDoc(doc(db, "policies", p.id)); await refresh(); toast("Perfil eliminado"); }
  catch (err) { fail("No se pudo eliminar el perfil.", err); }
});
document.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", () => $(b.dataset.close).close()));
$("exportBtn").addEventListener("click", () => {
  const cols = ["id","name","room","owner","platform","status"];
  const csv = [cols.join(","), ...devices.map(d => cols.map(k => '"'+String(d[k] ?? "").replace(/"/g,'""')+'"').join(","))].join("\r\n");
  const url = URL.createObjectURL(new Blob(["\ufeff"+csv], {type:"text/csv;charset=utf-8"}));
  const a = document.createElement("a"); a.href = url; a.download = "focus-guard-inventario.csv"; a.click(); URL.revokeObjectURL(url);
});

async function loadManagedUsers(){
 const snap=await getDocs(collection(db,"users"));
 managedUsers=snap.docs.map(d=>({uid:d.id,...d.data()})).filter(x=>x.role!=="owner");
 $("managedUsersList").innerHTML=managedUsers.map(x=>'<article class="policy-card"><span class="eyebrow">'+esc(x.uid)+'</span><h3>'+esc(x.email||"Usuario")+'</h3><div class="group">'+esc(x.role||"Sin rol")+'</div><p>'+(x.expiresAt?.toDate?"Acceso hasta: "+esc(x.expiresAt.toDate().toLocaleString("es-ES")):"Sin fecha de caducidad")+'</p></article>').join("")||'<p class="empty">No hay usuarios gestionables.</p>';
}
$("userAccessForm").addEventListener("submit",async e=>{
 e.preventDefault();const status=$("userAccessStatus");try{
 if(!isOwner())throw new Error("Solo el owner puede gestionar usuarios.");
 const uid=$("managedUserUid").value.trim(),newRole=$("managedUserRole").value,raw=$("managedUserExpires").value;
 if(!uid||uid===user.uid)throw new Error("Indica el UID de otra cuenta.");
 const ref=doc(db,"users",uid),snap=await getDoc(ref);
 if(!snap.exists())throw new Error("No existe users/"+uid+". Crea primero la cuenta y su documento de usuario.");
 if(snap.data().role==="owner")throw new Error("No puedes modificar ni asignar el rol owner.");
 const expiresAt=raw?new Date(raw):null;
 if(raw&&(!Number.isFinite(expiresAt.getTime())||expiresAt.getTime()<=Date.now()))throw new Error("La fecha debe estar en el futuro.");
 await setDoc(ref,{role:newRole,expiresAt:expiresAt?expiresAt:null,updatedAt:serverTimestamp(),updatedBy:user.uid},{merge:true});
 status.textContent="Acceso actualizado correctamente."; $("userAccessForm").reset();await loadManagedUsers();
 }catch(err){status.textContent=err.message||"No se pudo actualizar el usuario.";}
});
$("accessTimeInfoBtn").addEventListener("click",()=>$("accessInfoDialog").showModal());
