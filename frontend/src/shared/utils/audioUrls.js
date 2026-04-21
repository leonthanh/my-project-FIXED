import { normalizeUrlLike, resolveHostPath } from "./assetUrls";

const uploadPathVariants = [
  (path) => path.replace(/^\/uploads\//i, "/upload/"),
  (path) => path.replace(/^\/upload\//i, "/uploads/"),
  (path) => path.replace(/^\/uploads\//i, "/backend/uploads/"),
  (path) => path.replace(/^\/backend\/uploads\//i, "/uploads/"),
  (path) => path.replace(/^\/uploads\//i, "/backend/upload/"),
  (path) => path.replace(/^\/backend\/upload\//i, "/uploads/"),
];

function normalizeAudioReference(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^data:/i.test(raw) || /^blob:/i.test(raw)) return raw;
  return normalizeUrlLike(raw);
}

function normalizeListeningPartsAudio(parts) {
  if (!Array.isArray(parts)) return parts;

  return parts.map((part) => {
    const normalizedAudioUrl = normalizeAudioReference(part?.audioUrl || "");
    return normalizedAudioUrl === (part?.audioUrl || "")
      ? part
      : { ...part, audioUrl: normalizedAudioUrl };
  });
}

function joinApiHostPath(apiHost, path) {
  const rawPath = String(path || "").trim();
  if (!rawPath) return "";
  if (/^https?:\/\//i.test(rawPath) || /^data:/i.test(rawPath) || /^blob:/i.test(rawPath)) {
    return rawPath;
  }

  const base = String(apiHost || "").replace(/\/+$/g, "");
  const withLeadingSlash = rawPath.startsWith("/") ? rawPath : `/${rawPath}`;
  return base ? `${base}${withLeadingSlash}` : withLeadingSlash;
}

function parseNormalizedValue(value) {
  if (/^https?:\/\//i.test(value)) {
    const url = new URL(value);
    return { path: url.pathname, suffix: `${url.search}${url.hash}` };
  }

  const [pathAndQuery, hash = ""] = String(value || "").split("#");
  const [path, query = ""] = pathAndQuery.split("?");
  return {
    path,
    suffix: `${query ? `?${query}` : ""}${hash ? `#${hash}` : ""}`,
  };
}

function buildAudioPreviewSources(apiHost, value) {
  const raw = String(value || "").trim();
  const normalized = normalizeAudioReference(raw);
  if (!normalized) return [];
  if (/^data:/i.test(normalized) || /^blob:/i.test(normalized)) return [normalized];

  const candidates = new Set();
  const addCandidate = (candidate) => {
    const next = String(candidate || "").trim();
    if (next) candidates.add(next);
  };

  addCandidate(resolveHostPath(apiHost, normalized));
  if (/^https?:\/\//i.test(raw)) addCandidate(raw);

  let parsed;
  try {
    parsed = parseNormalizedValue(normalized);
  } catch {
    return Array.from(candidates);
  }

  if (!/^\/(?:backend\/)?uploads?(?:\/|$)/i.test(parsed.path)) {
    return Array.from(candidates);
  }

  const pathCandidates = new Set([parsed.path]);
  for (const toVariant of uploadPathVariants) {
    const nextPath = toVariant(parsed.path);
    if (nextPath && nextPath !== parsed.path) {
      pathCandidates.add(nextPath);
    }
  }

  pathCandidates.forEach((path) => {
    addCandidate(joinApiHostPath(apiHost, `${path}${parsed.suffix}`));
  });

  return Array.from(candidates);
}

export {
  normalizeAudioReference,
  normalizeListeningPartsAudio,
  buildAudioPreviewSources,
};