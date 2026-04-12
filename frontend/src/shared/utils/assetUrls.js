function normalizePathSegments(path) {
  const rawParts = String(path || "")
    .replace(/\\/g, "/")
    .split("/")
    .filter(Boolean);

  const out = [];
  const dedupeWhitelist = new Set(["backend", "upload", "uploads"]);

  for (const part of rawParts) {
    if (part === ".") continue;
    if (part === "..") {
      out.pop();
      continue;
    }

    const prev = out[out.length - 1];
    if (prev && prev === part && dedupeWhitelist.has(part)) continue;
    out.push(part);
  }

  return `/${out.join("/")}`;
}

function rewriteKnownUploadPaths(path) {
  let normalized = String(path || "");

  normalized = normalized.replace(/^\/+backend\/+upload\//i, "/uploads/");
  normalized = normalized.replace(/^\/+backend\/+upload$/i, "/uploads");
  normalized = normalized.replace(/^\/+backend\/+uploads\//i, "/uploads/");
  normalized = normalized.replace(/^\/+backend\/+uploads$/i, "/uploads");
  normalized = normalized.replace(/^\/+upload\//i, "/uploads/");
  normalized = normalized.replace(/^\/+upload$/i, "/uploads");
  normalized = normalized.replace(/^\/+uploads\/+uploads\//i, "/uploads/");
  normalized = normalized.replace(/^\/+uploads\/+uploads$/i, "/uploads");

  return normalized;
}

function normalizeUrlLike(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  const cleaned = raw.replace(/\\/g, "/").replace(/^\.\//, "").replace(/^(\.\.\/)+/, "");
  const [baseAndPath, hash = ""] = cleaned.split("#");
  const [base, query = ""] = baseAndPath.split("?");

  if (/^https?:\/\//i.test(base)) {
    try {
      const url = new URL(cleaned);
      url.pathname = rewriteKnownUploadPaths(normalizePathSegments(url.pathname));
      return url.toString();
    } catch {
      return cleaned;
    }
  }

  const normalizedPath = rewriteKnownUploadPaths(normalizePathSegments(base));
  return `${normalizedPath}${query ? `?${query}` : ""}${hash ? `#${hash}` : ""}`;
}

function resolveHostPath(apiHost, value) {
  if (value == null) return "";

  let resolved = String(value).trim();
  if (!resolved) return "";
  if (/^data:/i.test(resolved) || /^blob:/i.test(resolved)) return resolved;

  if (/^\/\//.test(resolved)) {
    const protocol = typeof window !== "undefined" && window.location?.protocol
      ? window.location.protocol
      : "https:";
    resolved = `${protocol}${resolved}`;
  }

  resolved = normalizeUrlLike(resolved);

  const baseHost = String(apiHost || "").replace(/\/+$/g, "");

  if (/^https?:\/\//i.test(resolved)) {
    try {
      const url = new URL(resolved);
      const normalizedPath = rewriteKnownUploadPaths(normalizePathSegments(url.pathname));
      const isBackendUpload = /^\/uploads(\/|$)/i.test(normalizedPath);

      if (isBackendUpload) {
        return baseHost
          ? `${baseHost}${normalizedPath}${url.search}${url.hash}`
          : `${normalizedPath}${url.search}${url.hash}`;
      }

      url.pathname = normalizedPath;
      return url.toString();
    } catch {
      return resolved;
    }
  }

  const normalizedRelative = resolved.startsWith("/") ? resolved : `/${resolved}`;
  return baseHost ? `${baseHost}${normalizedRelative}` : normalizedRelative;
}

export {
  normalizePathSegments,
  rewriteKnownUploadPaths,
  normalizeUrlLike,
  resolveHostPath,
};

export default resolveHostPath;