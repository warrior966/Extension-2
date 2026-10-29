const enabledInput = document.querySelector("#enabled");
const statusTitle = document.querySelector("#status-title");
const statusDescription = document.querySelector("#status-description");
const form = document.querySelector("#add-form");
const domainInput = document.querySelector("#domain");
const list = document.querySelector("#domains");
const empty = document.querySelector("#empty");
const message = document.querySelector("#message");
const deviceNameInput = document.querySelector("#device-name");
const deviceRoomInput = document.querySelector("#device-room");
const syncButton = document.querySelector("#sync-device");
const syncStatus = document.querySelector("#sync-status");

function normalizeDomain(value) {
  let domain = String(value || "").trim().toLowerCase();
  domain = domain.replace(/^https?:\/\//, "").split(/[/?#]/, 1)[0];
  domain = domain.replace(/^www\./, "").replace(/\.$/, "");
  if (!/^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i.test(domain)) return null;
  return domain;
}
async function getSettings() {
  return chrome.storage.local.get({ domains: [], enabled: false, deviceName: "", deviceRoom: "Sin asignar", syncStatus: "", syncError: "", lastSyncAt: "" });
}
async function render() {
  const { domains, enabled } = await getSettings();
  enabledInput.checked = enabled;
  statusTitle.textContent = enabled ? "Bloqueo activado" : "Bloqueo desactivado";
  statusDescription.textContent = enabled ? "Los dominios de la lista están bloqueados." : "Los sitios de la lista están permitidos.";
  list.replaceChildren();
  empty.hidden = domains.length > 0;
  for (const domain of domains) {
    const item = document.createElement("li");
    const label = document.createElement("span");
    label.textContent = domain;
    const remove = document.createElement("button");
    remove.type = "button"; remove.textContent = "Quitar";
    remove.setAttribute("aria-label", `Quitar ${domain}`);
    remove.addEventListener("click", async () => {
      const latest = await getSettings();
      await chrome.storage.local.set({ domains: latest.domains.filter(d => d !== domain) });
      message.textContent = ""; await render();
    });
    item.append(label, remove); list.append(item);
  }
}
function renderSyncStatus(settings) {
  if (settings.syncStatus === "ok" && settings.lastSyncAt) {
    syncStatus.textContent = "Sincronizado · " + new Date(settings.lastSyncAt).toLocaleString("es-ES");
    syncStatus.dataset.state = "ok";
  } else if (settings.syncStatus === "error") {
    syncStatus.textContent = "Error de sincronización: " + (settings.syncError || "revisa Firebase");
    syncStatus.dataset.state = "error";
  } else {
    syncStatus.textContent = "Aún no se ha sincronizado.";
    syncStatus.dataset.state = "";
  }
}
enabledInput.addEventListener("change", async () => {
  await chrome.storage.local.set({ enabled: enabledInput.checked }); await render();
});
form.addEventListener("submit", async event => {
  event.preventDefault();
  const domain = normalizeDomain(domainInput.value);
  if (!domain) { message.textContent = "Introduce un dominio válido, como example.com."; return; }
  const { domains } = await getSettings();
  if (domains.includes(domain)) { message.textContent = "Ese dominio ya está en la lista."; return; }
  if (domains.length >= 50) { message.textContent = "Has alcanzado el límite de 50 dominios."; return; }
  await chrome.storage.local.set({ domains: [...domains, domain] });
  domainInput.value = ""; message.textContent = ""; await render();
});
syncButton.addEventListener("click", async () => {
  syncButton.disabled = true; syncStatus.textContent = "Sincronizando…";
  try {
    const response = await chrome.runtime.sendMessage({
      type: "SYNC_DEVICE",
      name: deviceNameInput.value.trim(),
      room: deviceRoomInput.value.trim()
    });
    if (!response?.ok) throw new Error(response?.error || "No se pudo sincronizar");
    syncStatus.textContent = "Sincronizado correctamente.";
    syncStatus.dataset.state = "ok";
  } catch (error) {
    syncStatus.textContent = "No se pudo sincronizar: " + String(error.message || error);
    syncStatus.dataset.state = "error";
  } finally {
    syncButton.disabled = false;
    const settings = await getSettings();
    renderSyncStatus(settings);
  }
});
async function init() {
  await render();
  const settings = await getSettings();
  deviceNameInput.value = settings.deviceName;
  deviceRoomInput.value = settings.deviceRoom;
  renderSyncStatus(settings);
  if (!settings.syncStatus) {
    try { chrome.runtime.sendMessage({type:"SYNC_DEVICE"}).then(async response => {
      const latest = await getSettings(); renderSyncStatus(latest);
      if (!response?.ok) syncStatus.textContent = "Sincronización pendiente: " + (response?.error || "revisa la configuración de Firebase");
    }).catch(() => {}); } catch {}
  }
}
init().catch(error => { message.textContent = "No se pudo cargar la configuración."; console.error(error); });
