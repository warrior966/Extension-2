const MAX_DOMAINS = 50;
const FIRST_RULE_ID = 1000;
const FIREBASE_API_KEY = "AIzaSyAHpkWaFwwI-QJWd06Dzkt6kc2tJXSkdA0";
const FIREBASE_PROJECT_ID = "fidelazion";
const SESSION_KEY = "fgFirebaseSession";

function normalizeDomain(value) {
  let domain = String(value || "").trim().toLowerCase();
  domain = domain.replace(/^https?:\/\//, "").split(/[/?#]/, 1)[0];
  domain = domain.replace(/^www\./, "").replace(/\.$/, "");
  if (!domain || domain.length > 253 || !domain.includes(".")) return null;
  if (!/^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i.test(domain)) return null;
  return domain;
}

async function applyRules() {
  const { domains = [], enabled = false, remotePolicy = null, offlineLock = false } = await chrome.storage.local.get(["domains", "enabled", "remotePolicy", "offlineLock"]);
  const oldRules = await chrome.declarativeNetRequest.getDynamicRules();
  const blacklist = [...new Set((remotePolicy?.blacklist || []).map(normalizeDomain).filter(Boolean))].slice(0, MAX_DOMAINS);
  let rules = [];
  if (offlineLock) {
    rules = [{
      id: FIRST_RULE_ID, priority: 100, action: { type: "redirect", redirect: { extensionPath: "/blocked.html" } },
      condition: { urlFilter: "|http", resourceTypes: ["main_frame", "sub_frame"] }
    }];
  } else {
    rules = blacklist.map((domain, index) => ({
      id: 3000 + index, priority: 10, action: { type: "redirect", redirect: { extensionPath: "/blocked.html" } },
      condition: { urlFilter: `||${domain}^`, resourceTypes: ["main_frame", "sub_frame"] }
    }));
    if (remotePolicy?.mode === "block_all") {
      rules.push({
        id: FIRST_RULE_ID, priority: 1, action: { type: "redirect", redirect: { extensionPath: "/blocked.html" } },
        condition: { urlFilter: "|http", resourceTypes: ["main_frame", "sub_frame"] }
      });
    } else if (remotePolicy?.mode === "whitelist") {
      const allowed = [...new Set((remotePolicy.whitelist || []).map(normalizeDomain).filter(Boolean))].slice(0, MAX_DOMAINS);
      rules.push({
        id: FIRST_RULE_ID, priority: 1, action: { type: "redirect", redirect: { extensionPath: "/blocked.html" } },
        condition: { urlFilter: "|http", resourceTypes: ["main_frame", "sub_frame"] }
      }, ...allowed.map((domain, index) => ({
        id: 2000 + index, priority: 2, action: { type: "allow" },
        condition: { urlFilter: `||${domain}^`, resourceTypes: ["main_frame", "sub_frame"] }
      })));
    } else if (!remotePolicy && enabled) {
      rules.push(...[...new Set(domains.map(normalizeDomain).filter(Boolean))].slice(0, MAX_DOMAINS).map((domain, index) => ({
        id: FIRST_RULE_ID + index, priority: 1, action: { type: "redirect", redirect: { extensionPath: "/blocked.html" } },
        condition: { urlFilter: `||${domain}^`, resourceTypes: ["main_frame", "sub_frame"] }
      })));
    }
  }
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: oldRules.map(rule => rule.id),
    addRules: rules
  });
  await enforceOpenTabs(offlineLock ? { mode: "block_all" } : remotePolicy, enabled, domains);
}

function isBlockedByPolicy(url, remotePolicy, enabled, domains) {
  let parsed;
  try { parsed = new URL(url); } catch { return false; }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
  const hostname = parsed.hostname.toLowerCase().replace(/^www\./, "");
  const blacklist = (remotePolicy?.blacklist || []).map(normalizeDomain).filter(Boolean);
  if (blacklist.some(domain => hostname === domain || hostname.endsWith("." + domain))) return true;
  if (remotePolicy?.mode === "block_all") return true;
  if (remotePolicy?.mode === "whitelist") {
    const allowed = (remotePolicy.whitelist || []).map(normalizeDomain).filter(Boolean);
    return !allowed.some(domain => hostname === domain || hostname.endsWith("." + domain));
  }
  if (!remotePolicy && enabled) {
    const blocked = [...new Set((domains || []).map(normalizeDomain).filter(Boolean))];
    return blocked.some(domain => hostname === domain || hostname.endsWith("." + domain));
  }
  return false;
}

async function enforceOpenTabs(remotePolicy, enabled, domains) {
  // DNR blocks new navigations, but a tab that was already displaying a page
  // stays open. Re-check all current tabs whenever a policy is refreshed.
  const tabs = await chrome.tabs.query({});
  const blockedPage = chrome.runtime.getURL("blocked.html");
  await Promise.all(tabs.filter(tab =>
    tab.id != null &&
    tab.url &&
    !tab.url.startsWith(blockedPage) &&
    isBlockedByPolicy(tab.url, remotePolicy, enabled, domains)
  ).map(tab => chrome.tabs.update(tab.id, { url: blockedPage }).catch(error => {
    console.warn("Focus Guard could not redirect an already-open blocked tab:", error.message || error);
  })));
}

async function requestJson(url, options = {}) {
  let response;
  try {
    response = await fetch(url, options);
  } catch (error) {
    if (error instanceof TypeError || navigator.onLine === false) {
      await chrome.storage.local.set({ offlineLock: true, syncStatus: "offline", syncError: "Sin conexión: bloqueo total activado." });
      await applyRules();
    }
    throw error;
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data?.error?.message || data?.error?.errors?.[0]?.message || `HTTP ${response.status}`;
    throw new Error(message);
  }
  return data;
}

async function getFirebaseSession() {
  const stored = (await chrome.storage.local.get(SESSION_KEY))[SESSION_KEY];
  if (stored?.idToken && stored?.refreshToken && stored.expiresAt > Date.now() + 60_000) return stored;

  if (stored?.refreshToken) {
    try {
      const body = new URLSearchParams({ grant_type: "refresh_token", refresh_token: stored.refreshToken });
      const refreshed = await requestJson(`https://securetoken.googleapis.com/v1/token?key=${FIREBASE_API_KEY}`, {
        method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body
      });
      const session = {
        uid: refreshed.user_id,
        idToken: refreshed.id_token,
        refreshToken: refreshed.refresh_token,
        expiresAt: Date.now() + Number(refreshed.expires_in || 3600) * 1000
      };
      await chrome.storage.local.set({ [SESSION_KEY]: session });
      return session;
    } catch (error) {
      // A revoked/invalid anonymous session is replaced with a fresh one below.
      console.warn("Firebase session refresh failed; creating a new anonymous session.", error.message);
    }
  }

  const created = await requestJson(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ returnSecureToken: true })
  });
  const session = {
    uid: created.localId, idToken: created.idToken, refreshToken: created.refreshToken,
    expiresAt: Date.now() + Number(created.expiresIn || 3600) * 1000
  };
  await chrome.storage.local.set({ [SESSION_KEY]: session });
  return session;
}

async function syncDevice(overrides = {}) {
  const saved = await chrome.storage.local.get(["deviceName", "deviceRoom"]);
  const session = await getFirebaseSession();
  const documentUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/devices/${session.uid}`;
  let existingFields = null;
  let deviceStatus = "Pendiente";
  try {
    const existing = await requestJson(documentUrl, {
      headers: { "Authorization": `Bearer ${session.idToken}` }
    });
    existingFields = existing.fields || {};
    deviceStatus = existingFields.status?.stringValue || "Pendiente";
  } catch (error) {
    if (!/NOT_FOUND|not found/i.test(String(error.message))) throw error;
  }

  const profileLocked = existingFields?.profileLocked?.booleanValue === true;
  const isUserSave = Object.prototype.hasOwnProperty.call(overrides, "name") ||
    Object.prototype.hasOwnProperty.call(overrides, "room");
  if (profileLocked && isUserSave) {
    throw new Error("Los datos están bloqueados por el centro. Solicita al administrador que los desbloquee desde el panel.");
  }
  const serverName = existingFields?.name?.stringValue || "";
  const serverRoom = existingFields?.room?.stringValue || "";
  const name = serverName && !isUserSave
    ? serverName
    : (String(overrides.name ?? saved.deviceName ?? "").trim().slice(0, 80) || `Chromebook-${session.uid.slice(0, 6)}`);
  const room = serverRoom && !isUserSave
    ? serverRoom
    : (String(overrides.room ?? saved.deviceRoom ?? "Sin asignar").trim().slice(0, 80) || "Sin asignar");
  const lockAfterSave = isUserSave && Boolean(String(overrides.name || "").trim()) && Boolean(String(overrides.room || "").trim());
  const nextProfileLocked = lockAfterSave ? true : profileLocked;
  await chrome.storage.local.set({ deviceName: name, deviceRoom: room, profileLocked: nextProfileLocked });

  const now = new Date().toISOString();
  let currentUrl = "";
  try {
    const [activeTab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (activeTab?.url && /^https?:\/\//i.test(activeTab.url)) currentUrl = activeTab.url.slice(0, 2048);
  } catch (error) {
    console.warn("Focus Guard could not read the active tab URL:", error.message || error);
  }
  const fields = {
    name: { stringValue: name },
    room: { stringValue: room },
    owner: { stringValue: "Perfil Chrome compartido" },
    platform: { stringValue: "ChromeOS" },
    status: { stringValue: deviceStatus },
    updatedAt: { timestampValue: now },
    lastSeen: { timestampValue: now },
    currentUrl: { stringValue: currentUrl },
    updatedBy: { stringValue: session.uid },
    profileLocked: { booleanValue: nextProfileLocked }
  };
  const mask = Object.keys(fields).map(key => `updateMask.fieldPaths=${encodeURIComponent(key)}`).join("&");
  const url = `${documentUrl}?${mask}`;
  await requestJson(url, {
    method: "PATCH",
    headers: { "Authorization": `Bearer ${session.idToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ fields })
  });
  return { uid: session.uid, name, room, lastSeen: now, currentUrl, profileLocked: nextProfileLocked };
}


async function recordRecentUrl(value) {
  const urlValue = String(value || "").slice(0, 2048);
  if (!/^https?:\\/\\//i.test(urlValue)) return;
  const session = await getFirebaseSession();
  const documentUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/devices/${session.uid}`;
  const headers = { "Authorization": `Bearer ${session.idToken}` };
  const existing = await requestJson(documentUrl, { headers });
  const raw = existing.fields?.recentUrls?.arrayValue?.values || [];
  const history = raw.map(item => {
    const fields = item.mapValue?.fields || {};
    return {
      url: fields.url?.stringValue || "",
      visitedAt: fields.visitedAt?.timestampValue || ""
    };
  }).filter(item => /^https?:\\/\\//i.test(item.url));
  const now = new Date().toISOString();
  const next = history.filter(item => item.url !== urlValue);
  next.unshift({ url: urlValue, visitedAt: now });
  const values = next.slice(0, 30).map(item => ({
    mapValue: { fields: {
      url: { stringValue: item.url },
      visitedAt: { timestampValue: item.url === urlValue ? now : item.visitedAt }
    }}
  }));
  await requestJson(`${documentUrl}?updateMask.fieldPaths=recentUrls`, {
    method: "PATCH",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ fields: { recentUrls: { arrayValue: { values } } } })
  });
}

let recentUrlWriteQueue = Promise.resolve();
chrome.webNavigation.onCommitted.addListener(details => {
  if (details.frameId !== 0 || !/^https?:\\/\\//i.test(details.url)) return;
  recentUrlWriteQueue = recentUrlWriteQueue
    .then(() => recordRecentUrl(details.url))
    .catch(error => console.warn("Focus Guard could not save URL history:", error.message || error));
});

async function syncRemotePolicy(deviceRoom = "") {
  const session = await getFirebaseSession();
  const headers = { "Authorization": `Bearer ${session.idToken}` };
  let selectedPolicy = null;
  try {
    const groupsUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/settings/groupPolicies`;
    const groupDoc = await requestJson(groupsUrl, { headers });
    const groupValues = groupDoc.fields?.groups?.arrayValue?.values || [];
    const groups = groupValues.map(item => {
      const f = item.mapValue?.fields || {};
      return {
        name: f.name?.stringValue || "",
        mode: f.mode?.stringValue || "",
        whitelist: (f.whitelist?.arrayValue?.values || []).map(v => v.stringValue).filter(Boolean)
      };
    });
    const match = groups.find(g => g.name.trim().toLocaleLowerCase() === String(deviceRoom).trim().toLocaleLowerCase());
    if (match && ["free","block_all","whitelist"].includes(match.mode)) selectedPolicy = { mode: match.mode, whitelist: match.whitelist.slice(0, MAX_DOMAINS), source: "group", group: match.name };
  } catch (error) {
    if (!/NOT_FOUND|not found/i.test(String(error.message))) console.warn("Focus Guard could not sync group policies:", error.message);
  }
  if (!selectedPolicy) {
    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/settings/globalPolicy`;
    try {
      const document = await requestJson(url, { headers });
      const fields = document.fields || {};
      const mode = fields.mode?.stringValue;
      if (["free", "block_all", "whitelist"].includes(mode)) {
        const whitelist = (fields.whitelist?.arrayValue?.values || []).map(item => item.stringValue).filter(Boolean).slice(0, MAX_DOMAINS);
        const blacklist = (fields.blacklist?.arrayValue?.values || []).map(item => item.stringValue).filter(Boolean).slice(0, MAX_DOMAINS);
        selectedPolicy = { mode, whitelist, blacklist, source: "global" };
      }
    } catch (error) {
      if (/NOT_FOUND|not found/i.test(String(error.message))) {
        await chrome.storage.local.remove("remotePolicy");
        await applyRules();
        return true;
      }
      console.warn("Focus Guard could not sync the global navigation policy:", error.message);
      return false;
    }
  }
  if (selectedPolicy?.source === "group") {
    try {
      const globalUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/settings/globalPolicy`;
      const globalDoc = await requestJson(globalUrl, { headers });
      selectedPolicy.blacklist = (globalDoc.fields?.blacklist?.arrayValue?.values || []).map(item => item.stringValue).filter(Boolean).slice(0, MAX_DOMAINS);
    } catch (error) {
      if (!/NOT_FOUND|not found/i.test(String(error.message))) {
        console.warn("Focus Guard could not sync the global blacklist:", error.message);
        return false;
      }
    }
  }
  if (selectedPolicy) {
    await chrome.storage.local.set({ remotePolicy: selectedPolicy });
    await applyRules();
    return true;
  }
  return false;
}
async function reportSync() {
  if (navigator.onLine === false) {
    await chrome.storage.local.set({ offlineLock: true, syncStatus: "offline", syncError: "Sin conexión: bloqueo total activado." });
    await applyRules();
    return null;
  }
  let device = null;
  try { device = await syncDevice(); }
  catch (error) { console.error("Focus Guard Firebase device sync failed:", error); }
  let policySynced = false;
  try {
    const saved = await chrome.storage.local.get("deviceRoom");
    policySynced = await syncRemotePolicy(device?.room || saved.deviceRoom || "");
  } catch (error) { console.warn("Focus Guard could not refresh the navigation policy:", error.message || error); }
  if (device?.currentUrl) {
    recentUrlWriteQueue = recentUrlWriteQueue.then(() => recordRecentUrl(device.currentUrl))
      .catch(error => console.warn("Focus Guard could not save current URL history:", error.message || error));
  }
  if (device && policySynced) {
    await chrome.storage.local.set({ offlineLock: false, syncStatus: "ok", syncError: "", lastSyncAt: device.lastSeen });
    await applyRules();
    return device;
  }
  await chrome.storage.local.set({ offlineLock: true, syncStatus: "offline", syncError: "No se pudo conectar con Firebase: bloqueo total activado." });
  await applyRules();
  return null;
}
chrome.runtime.onInstalled.addListener(() => {
  applyRules().catch(console.error);
  chrome.alarms.create("fg-heartbeat", { periodInMinutes: 1 });
  reportSync().catch(() => {});
});
chrome.runtime.onStartup.addListener(() => {
  applyRules().catch(console.error);
  chrome.alarms.create("fg-heartbeat", { periodInMinutes: 1 });
  reportSync().catch(() => {});
});
chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === "fg-heartbeat") reportSync().catch(() => {});
});
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && (changes.domains || changes.enabled || changes.remotePolicy)) applyRules().catch(console.error);
});
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "SYNC_DEVICE") return;
  syncDevice({ name: message.name, room: message.room }).then(async device => {
    await chrome.storage.local.set({ syncStatus: "ok", syncError: "", lastSyncAt: device.lastSeen });
    sendResponse({ ok: true, device });
  }).catch(async error => {
    await chrome.storage.local.set({ syncStatus: "error", syncError: String(error.message || error).slice(0, 240) });
    sendResponse({ ok: false, error: String(error.message || error) });
  });
  return true;
});
