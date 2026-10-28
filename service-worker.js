const MAX_DOMAINS = 50;
const FIRST_RULE_ID = 1000;

function normalizeDomain(value) {
  let domain = String(value || "").trim().toLowerCase();
  domain = domain.replace(/^https?:\/\//, "").split(/[/?#]/, 1)[0];
  domain = domain.replace(/^www\./, "").replace(/\.$/, "");
  if (!domain || domain.length > 253 || !domain.includes(".")) return null;
  if (!/^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i.test(domain)) return null;
  return domain;
}

async function applyRules() {
  const { domains = [], enabled = false } = await chrome.storage.local.get(["domains", "enabled"]);
  const oldRules = await chrome.declarativeNetRequest.getDynamicRules();
  const rules = enabled
    ? [...new Set(domains.map(normalizeDomain).filter(Boolean))].slice(0, MAX_DOMAINS).map((domain, index) => ({
        id: FIRST_RULE_ID + index,
        priority: 1,
        action: { type: "block" },
        condition: {
          urlFilter: `||${domain}^`,
          resourceTypes: ["main_frame"]
        }
      }))
    : [];
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: oldRules.map(rule => rule.id),
    addRules: rules
  });
}

chrome.runtime.onInstalled.addListener(() => {
  applyRules().catch(console.error);
});

chrome.runtime.onStartup.addListener(() => {
  applyRules().catch(console.error);
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && (changes.domains || changes.enabled)) {
    applyRules().catch(console.error);
  }
});