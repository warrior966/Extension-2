(() => {
  "use strict";

  const INLINE_HTML = /^\\s*(?:<!doctype\\s+html|<html(?:\\s|>)|<(?:script|iframe|body|head|div|form|svg|section|article)(?:\\s|>|\\/))/i;

  function isInlineHtmlFrame(frame) {
    if (frame.hasAttribute("srcdoc")) return true;
    const src = (frame.getAttribute("src") || "").trim();
    return /^data:text\\/html(?:[;,]|$)/i.test(src) || INLINE_HTML.test(src);
  }

  function blockInlineHtmlFrame(frame) {
    if (!frame.isConnected || frame.dataset.focusGuardBlocked === "true") return;
    frame.dataset.focusGuardBlocked = "true";
    frame.removeAttribute("srcdoc");
    frame.removeAttribute("src");
    frame.setAttribute("sandbox", "");
    frame.src = "about:blank";
    frame.setAttribute("aria-label", "Contenido HTML insertado bloqueado por Focus Guard");
  }

  function inspect(node) {
    if (!(node instanceof Element)) return;
    if (node.matches("iframe") && isInlineHtmlFrame(node)) blockInlineHtmlFrame(node);
    node.querySelectorAll?.("iframe").forEach(frame => {
      if (isInlineHtmlFrame(frame)) blockInlineHtmlFrame(frame);
    });
  }

  document.querySelectorAll("iframe").forEach(frame => {
    if (isInlineHtmlFrame(frame)) blockInlineHtmlFrame(frame);
  });

  const observer = new MutationObserver(records => {
    for (const record of records) {
      if (record.type === "attributes") inspect(record.target);
      for (const node of record.addedNodes || []) inspect(node);
    }
  });
  observer.observe(document.documentElement || document, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["src", "srcdoc"]
  });
})();
