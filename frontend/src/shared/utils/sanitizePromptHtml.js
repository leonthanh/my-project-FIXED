const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const sanitizePromptHtml = (rawPrompt = "", resolveAsset = (path) => path) => {
  const prompt = String(rawPrompt || "").trim();
  if (!prompt) return "";

  if (typeof window === "undefined" || typeof DOMParser === "undefined") {
    return escapeHtml(prompt).replace(/\n/g, "<br />");
  }

  try {
    const doc = new DOMParser().parseFromString(prompt, "text/html");

    doc
      .querySelectorAll("script, style, iframe, object, embed, form, link, meta")
      .forEach((node) => node.remove());

    doc.querySelectorAll("*").forEach((element) => {
      Array.from(element.attributes).forEach((attribute) => {
        if (attribute.name.toLowerCase().startsWith("on")) {
          element.removeAttribute(attribute.name);
        }
      });

      if (element.tagName === "IMG") {
        const rawSrc = String(element.getAttribute("src") || "").trim();
        if (!rawSrc) {
          element.remove();
          return;
        }

        const normalizedSrc =
          /^https?:\/\//i.test(rawSrc) || /^data:/i.test(rawSrc) || /^blob:/i.test(rawSrc)
            ? rawSrc
            : resolveAsset(rawSrc);

        element.setAttribute("src", normalizedSrc);
        element.setAttribute("alt", element.getAttribute("alt") || "Prompt illustration");
        element.setAttribute("loading", "lazy");
        element.setAttribute(
          "style",
          "display:block;max-width:100%;height:auto;border-radius:10px;margin:10px 0;border:1px solid #e5e7eb;"
        );
      }

      if (element.tagName === "A") {
        const href = String(element.getAttribute("href") || "").trim();
        if (!href) {
          element.removeAttribute("href");
          return;
        }

        const safeHref = /^(https?:|mailto:|tel:|\/)/i.test(href) ? href : null;
        if (!safeHref) {
          element.removeAttribute("href");
          return;
        }

        element.setAttribute("href", safeHref.startsWith("/") ? resolveAsset(safeHref) : safeHref);
        element.setAttribute("target", "_blank");
        element.setAttribute("rel", "noreferrer noopener");
      }
    });

    doc.querySelectorAll("p").forEach((paragraph) => {
      const text = String(paragraph.textContent || "").replace(/\u00a0/g, " ").trim();
      const hasMedia = paragraph.querySelector("img, video, audio, iframe");
      if (!text && !hasMedia) {
        paragraph.remove();
        return;
      }
      paragraph.setAttribute("style", "margin:0 0 8px;line-height:1.6;");
    });

    const html = String(doc.body.innerHTML || "").trim();
    return html || escapeHtml(prompt).replace(/\n/g, "<br />");
  } catch {
    return escapeHtml(prompt).replace(/\n/g, "<br />");
  }
};

export default sanitizePromptHtml;
