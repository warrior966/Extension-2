import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { getFirestore, collection, doc, getDoc, getDocs, setDoc, addDoc, deleteDoc, query, orderBy, limit, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

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
let user = null, role = "viewer", devices = [], policies = [], audit = [];
const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const canOperate = () => role === "admin" || role === "operator";
function toast(message) { const el = $("toast"); el.textContent = message; el.classList.add("show"); setTimeout(() => el.classList.remove("show"), 2600); }
function fail(message, err) { console.error(message, err); toast(message); }
function stats() {
  $("deviceCount").textContent = devices.length;
  $("activeCount").textContent = devices.filter(d => d.status === "Activo").length;
  $("policyCount").textContent = policies.length;
  $("eventCount").textContent = audit.length;
}
function renderDevices() {
  const term = $("deviceSearch").value.trim().toLocaleLowerCase("es"), status = $("statusFilter").value;
  const filtered = devices.filter(d => (status === "all" || d.status === status) && [d.name,d.room,d.owner,d.platform,d.id].some(v => String(v || "").toLocaleLowerCase("es").includes(term)));
  $("deviceRows").innerHTML = filtered.map(d => `<tr><td>${esc(d.name)}<span class="subcell">${esc(d.id)}</span></td><td>${esc(d.room)}</td><td>${esc(d.owner || "—")}</td><td>${esc(d.platform)}</td><td><span class="state ${esc(d.status)}">${esc(d.status)}</span></td><td><div class="row-actions">${canOperate() ? '<button class="mini-btn" data-edit="'+esc(d.id)+'">Editar</button>' : ''}${role === "admin" ? '<button class="mini-btn danger" data-delete="'+esc(d.id)+'">Eliminar</button>' : ''}</div></td></tr>`).join("");
  $("emptyDevices").hidden = filtered.length > 0;
  stats();
}
function renderPolicies() {
  $("policyList").innerHTML = policies.map(p => `<article class="policy-card"><span class="eyebrow">${esc(p.id)}</span><h3>${esc(p.name)}</h3><div class="group">${esc(p.group)}</div><p>${esc(p.notes || "Sin notas adicionales.")}</p>${role === "admin" ? '<button class="mini-btn danger" data-policy-delete="'+esc(p.id)+'">Eliminar perfil</button>' : ''}</article>`).join("") || '<p class="empty">Aún no hay perfiles. Crea uno para documentar una política.</p>';
  stats();
}
function renderAudit() {
  $("auditList").innerHTML = audit.map(e => `<div class="audit-item"><span class="audit-icon">✓</span><div><strong>${esc(e.action)}</strong><p>${esc(e.detail)} · ${esc(e.actorEmail || "")}</p><time>${e.at?.toDate ? e.at.toDate().toLocaleString("es-ES") : "Fecha no disponible"}</time></div></div>`).join("") || '<p class="empty">No hay eventos registrados.</p>';
  stats();
}
async function loadAudit() {
  const snap = await getDocs(query(collection(db, "audit"), orderBy("at", "desc"), limit(100)));
  audit = snap.docs.map(d => ({id:d.id,...d.data()})); renderAudit();
}
async function log(action, detail) {
  await addDoc(collection(db, "audit"), {action, detail, actorUid:user.uid, actorEmail:user.email || "", at:serverTimestamp()});
  await loadAudit();
}
async function refresh() {
  const [ds, ps] = await Promise.all([
    getDocs(query(collection(db, "devices"), orderBy("name"))),
    getDocs(query(collection(db, "policies"), orderBy("name")))
  ]);
  devices = ds.docs.map(d => ({id:d.id,...d.data()}));
  policies = ps.docs.map(d => ({id:d.id,...d.data()}));
  await loadAudit(); renderDevices(); renderPolicies();
}
function openDevice(d) {
  $("deviceForm").reset(); $("deviceId").value = d?.id || "";
  $("deviceName").value = d?.name || ""; $("deviceRoom").value = d?.room || "";
  $("deviceOwner").value = d?.owner || ""; $("devicePlatform").value = d?.platform || "Windows";
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
  if (!u) { $("loginScreen").hidden = false; $("appShell").hidden = true; return; }
  try {
    const profile = await getDoc(doc(db, "users", u.uid));
    const assignedRole = profile.exists() ? profile.data().role : null;
    if (!["admin","operator","viewer"].includes(assignedRole)) {
      await signOut(auth); $("loginError").textContent = "Cuenta autenticada pero sin rol autorizado. Un administrador debe crear users/"+u.uid+" con role admin, operator o viewer."; return;
    }
    role = assignedRole; $("accountLabel").textContent = (u.email || "Usuario") + " · " + role;
    $("loginScreen").hidden = true; $("appShell").hidden = false;
    $("roleNotice").hidden = canOperate(); $("roleNotice").textContent = "Tu rol es de solo lectura.";
    $("addDeviceBtn").hidden = !canOperate(); $("addPolicyBtn").hidden = !canOperate();
    await refresh();
  } catch (err) { fail("Error leyendo Firestore. Revisa que las reglas estén publicadas y existan los documentos necesarios.", err); }
});
$("addDeviceBtn").addEventListener("click", () => openDevice(null));
$("deviceSearch").addEventListener("input", renderDevices);
$("statusFilter").addEventListener("change", renderDevices);
$("deviceRows").addEventListener("click", async e => {
  const edit = e.target.closest("[data-edit]"), del = e.target.closest("[data-delete]");
  if (edit) { const d = devices.find(x => x.id === edit.dataset.edit); if (d) openDevice(d); }
  if (del) {
    const d = devices.find(x => x.id === del.dataset.delete);
    if (d && confirm("¿Eliminar el registro "+d.name+"? No afecta al equipo real.")) try {
      await deleteDoc(doc(db, "devices", d.id)); await log("Registro de equipo eliminado", d.id+" · "+d.name); await refresh(); toast("Registro eliminado");
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
    await setDoc(doc(db, "devices", id), d);
    $("deviceDialog").close(); await log(oldId ? "Registro de equipo actualizado" : "Equipo registrado", id+" · "+d.name); await refresh(); toast("Equipo guardado");
  } catch (err) { fail(err.message || "No se pudo guardar el equipo.", err); }
});
$("addPolicyBtn").addEventListener("click", () => { $("policyForm").reset(); $("policyDialog").showModal(); });
$("policyForm").addEventListener("submit", async e => {
  e.preventDefault();
  try {
    if (!canOperate()) throw new Error("Tu rol no permite crear perfiles.");
    const p = {name:$("policyName").value.trim(),group:$("policyGroup").value.trim(),notes:$("policyNotes").value.trim(),createdAt:serverTimestamp(),createdBy:user.uid};
    if (!p.name || !p.group) return;
    await addDoc(collection(db, "policies"), p); $("policyDialog").close(); await log("Perfil de política creado", p.name+" · "+p.group); await refresh(); toast("Perfil creado");
  } catch (err) { fail(err.message || "No se pudo crear el perfil.", err); }
});
$("policyList").addEventListener("click", async e => {
  const b = e.target.closest("[data-policy-delete]"); if (!b) return;
  const p = policies.find(x => x.id === b.dataset.policyDelete);
  if (p && confirm("¿Eliminar este perfil?")) try { await deleteDoc(doc(db, "policies", p.id)); await log("Perfil de política eliminado", p.name); await refresh(); toast("Perfil eliminado"); }
  catch (err) { fail("No se pudo eliminar el perfil.", err); }
});
document.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", () => $(b.dataset.close).close()));
$("exportBtn").addEventListener("click", () => {
  const cols = ["id","name","room","owner","platform","status"];
  const csv = [cols.join(","), ...devices.map(d => cols.map(k => '"'+String(d[k] ?? "").replace(/"/g,'""')+'"').join(","))].join("\r\n");
  const url = URL.createObjectURL(new Blob(["\ufeff"+csv], {type:"text/csv;charset=utf-8"}));
  const a = document.createElement("a"); a.href = url; a.download = "focus-guard-inventario.csv"; a.click(); URL.revokeObjectURL(url);
});
