const enabledInput = document.querySelector("#enabled");
const statusTitle = document.querySelector("#status-title");
const statusDescription = document.querySelector("#status-description");
const form = document.querySelector("#add-form");
const domainInput = document.querySelector("#domain");
const list = document.querySelector("#domains");
const empty = document.querySelector("#empty");
const message = document.querySelector("#message");

function normalizeDomain(value) {
  let domain = String(value || "").trim().toLowerCase();
  domain = domain.replace(/^https?:\/\//, "").split(/[/?#]/, 1)[0];
  domain = domain.replace(/^www\./, "").replace(/\.$/, "");
  if (!/^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i.test(domain)) return null;
  return domain;
}

async function getSettings() {
  return chrome.storage.local.get({ domains: [], enabled: false });
}

async function render() {
  const { domains, enabled } = await getSettings();
  enabledInput.checked = enabled;
  statusTitle.textContent = enabled ? "Bloqueo activado" : "Bloqueo desactivado";
  statusDescription.textContent = enabled
    ? "Los dominios de la lista están bloqueados."
    : "Los sitios de la lista están permitidos.";
  list.replaceChildren();
  empty.hidden = domains.length > 0;

  for (const domain of domains) {
    const item = document.createElement("li");
    const label = document.createElement("span");
    label.textContent = domain;
    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "Quitar";
    remove.setAttribute("aria-label", `Quitar ${domain}`);
    remove.addEventListener("click", async () => {
      const latest = await getSettings();
      await chrome.storage.local.set({ domains: latest.domains.filter(d => d !== domain) });
      message.textContent = "";
      await render();
    });
    item.append(label, remove);
    list.append(item);
  }
}

enabledInput.addEventListener("change", async () => {
  await chrome.storage.local.set({ enabled: enabledInput.checked });
  await render();
});

form.addEventListener("submit", async event => {
  event.preventDefault();
  const domain = normalizeDomain(domainInput.value);
  if (!domain) {
    message.textContent = "Introduce un dominio válido, como example.com.";
    return;
  }
  const { domains } = await getSettings();
  if (domains.includes(domain)) {
    message.textContent = "Ese dominio ya está en la lista.";
    return;
  }
  if (domains.length >= 50) {
    message.textContent = "Has alcanzado el límite de 50 dominios.";
    return;
  }
  await chrome.storage.local.set({ domains: [...domains, domain] });
  domainInput.value = "";
  message.textContent = "";
  await render();
});

render().catch(error => {
  message.textContent = "No se pudo cargar la configuración. Recarga la extensión.";
  console.error(error);
});