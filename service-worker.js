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
  const { domains = [], enabled = false, remotePolicy = null } = await chrome.storage.local.get(["domains", "enabled", "remotePolicy"]);
  const oldRules = await chrome.declarativeNetRequest.getDynamicRules();
  let rules = [];
  if (remotePolicy?.mode === "block_all") {
    rules = [{
      id: FIRST_RULE_ID, priority: 1, action: { type: "block" },
      condition: { urlFilter: "|http", resourceTypes: ["main_frame"] }
    }];
  } else if (remotePolicy?.mode === "whitelist") {
    const allowed = [...new Set((remotePolicy.whitelist || []).map(normalizeDomain).filter(Boolean))].slice(0, MAX_DOMAINS);
    rules = [{
      id: FIRST_RULE_ID, priority: 1, action: { type: "block" },
      condition: { urlFilter: "|http", resourceTypes: ["main_frame"] }
    }, ...allowed.map((domain, index) => ({
      id: 2000 + index, priority: 2, action: { type: "allow" },
      condition: { urlFilter: `||${domain}^`, resourceTypes: ["main_frame"] }
    }))];
  } else if (!remotePolicy && enabled) {
    rules = [...new Set(domains.map(normalizeDomain).filter(Boolean))].slice(0, MAX_DOMAINS).map((domain, index) => ({
      id: FIRST_RULE_ID + index, priority: 1, action: { type: "block" },
      condition: { urlFilter: `||${domain}^`, resourceTypes: ["main_frame"] }
    }));
  }
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: oldRules.map(rule => rule.id),
    addRules: rules
  });
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
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
  const name = String(overrides.name ?? saved.deviceName ?? "").trim().slice(0, 80) || `Chromebook-${session.uid.slice(0, 6)}`;
  const room = String(overrides.room ?? saved.deviceRoom ?? "Sin asignar").trim().slice(0, 80) || "Sin asignar";
  await chrome.storage.local.set({ deviceName: name, deviceRoom: room });

  const now = new Date().toISOString();
  const documentUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/devices/${session.uid}`;
  let deviceStatus = "Pendiente";
  try {
    const existing = await requestJson(documentUrl, {
      headers: { "Authorization": `Bearer ${session.idToken}` }
    });
    deviceStatus = existing?.fields?.status?.stringValue || "Pendiente";
  } catch (error) {
    if (!/NOT_FOUND|not found/i.test(String(error.message))) throw error;
  }

  const fields = {
    name: { stringValue: name },
    room: { stringValue: room },
    owner: { stringValue: "Perfil Chrome compartido" },
    platform: { stringValue: "ChromeOS" },
    status: { stringValue: deviceStatus },
    updatedAt: { timestampValue: now },
    lastSeen: { timestampValue: now },
    updatedBy: { stringValue: session.uid }
  };
  const mask = Object.keys(fields).map(key => `updateMask.fieldPaths=${encodeURIComponent(key)}`).join("&");
  const url = `${documentUrl}?${mask}`;
  await requestJson(url, {
    method: "PATCH",
    headers: { "Authorization": `Bearer ${session.idToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ fields })
  });
  return { uid: session.uid, name, room, lastSeen: now };
}

async function syncRemotePolicy() {
  const session = await getFirebaseSession();
  const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/settings/globalPolicy`;
  try {
    const document = await requestJson(url, { headers: { "Authorization": `Bearer ${session.idToken}` } });
    const fields = document.fields || {};
    const mode = fields.mode?.stringValue;
    if (!["free", "block_all", "whitelist"].includes(mode)) return;
    const whitelist = (fields.whitelist?.arrayValue?.values || []).map(item => item.stringValue).filter(Boolean).slice(0, MAX_DOMAINS);
    await chrome.storage.local.set({ remotePolicy: { mode, whitelist } });
    await applyRules();
  } catch (error) {
    if (/NOT_FOUND|not found/i.test(String(error.message))) {
      await chrome.storage.local.remove("remotePolicy");
      await applyRules();
      return;
    }
    // A missing Firestore rule must not stop the device heartbeat or erase its last known policy.
    console.warn("Focus Guard could not sync the remote navigation policy:", error.message);
  }
}

async function reportSync() {
  // Sync the global navigation policy independently: device registration errors must
  // not prevent the extension from receiving/applying the administrator's block rules.
  try {
    await syncRemotePolicy();
  } catch (error) {
    console.warn("Focus Guard could not refresh the global navigation policy:", error.message || error);
  }
  try {
    const device = await syncDevice();
    await chrome.storage.local.set({ syncStatus: "ok", syncError: "", lastSyncAt: device.lastSeen });
    return device;
  } catch (error) {
    await chrome.storage.local.set({ syncStatus: "error", syncError: String(error.message || error).slice(0, 240) });
    console.error("Focus Guard Firebase sync failed:", error);
    throw error;
  }
}

chrome.runtime.onInstalled.addListener(() => {
  applyRules().catch(console.error);
  chrome.alarms.create("fg-heartbeat", { periodInMinutes: 5 });
  reportSync().catch(() => {});
});
chrome.runtime.onStartup.addListener(() => {
  applyRules().catch(console.error);
  chrome.alarms.create("fg-heartbeat", { periodInMinutes: 5 });
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
