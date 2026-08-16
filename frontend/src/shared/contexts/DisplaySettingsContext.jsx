import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { apiPath, authFetch } from "../utils/api";

export const DEFAULT_DISPLAY_LABELS = Object.freeze({
  ixDisplayName: "IX",
  orangeDisplayName: "Orange",
  fceDisplayName: "FCE",
});

const MAX_LABEL_LENGTH = 40;
const FCE_WORD_REGEX = /\bFCE\b/g;

const normalizeLabel = (value, fallbackValue) => {
  const normalized = String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) return fallbackValue;
  return normalized.slice(0, MAX_LABEL_LENGTH);
};

export const resolveFceDisplayName = (displayLabels = {}) =>
  normalizeLabel(displayLabels?.fceDisplayName, DEFAULT_DISPLAY_LABELS.fceDisplayName);

export const replaceFceDisplayName = (value, displayLabels = {}) => {
  const raw = String(value ?? "");
  if (!raw) return raw;
  const fceDisplayName = resolveFceDisplayName(displayLabels);
  return raw.replace(FCE_WORD_REGEX, fceDisplayName);
};

const mergeDisplayLabels = (rawLabels = {}) => ({
  ixDisplayName: normalizeLabel(rawLabels.ixDisplayName, DEFAULT_DISPLAY_LABELS.ixDisplayName),
  orangeDisplayName: normalizeLabel(
    rawLabels.orangeDisplayName,
    DEFAULT_DISPLAY_LABELS.orangeDisplayName
  ),
  fceDisplayName: resolveFceDisplayName(rawLabels),
});

const DisplaySettingsContext = createContext({
  displayLabels: DEFAULT_DISPLAY_LABELS,
  loading: false,
  error: "",
  refreshDisplayLabels: async () => DEFAULT_DISPLAY_LABELS,
  saveDisplayLabels: async () => DEFAULT_DISPLAY_LABELS,
});

const fetchDisplayLabels = async (signal) => {
  const res = await authFetch(apiPath("settings/display-labels"), { signal });
  const payload = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(payload?.message || "Could not load display labels.");
  }

  return mergeDisplayLabels(payload?.labels || {});
};

export const DisplaySettingsProvider = ({ children }) => {
  const [displayLabels, setDisplayLabels] = useState(DEFAULT_DISPLAY_LABELS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refreshDisplayLabels = useCallback(async () => {
    try {
      setLoading(true);
      const nextLabels = await fetchDisplayLabels();
      setDisplayLabels(nextLabels);
      setError("");
      return nextLabels;
    } catch (err) {
      setError(err?.message || "Could not load display labels.");
      setDisplayLabels(DEFAULT_DISPLAY_LABELS);
      return DEFAULT_DISPLAY_LABELS;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      try {
        const nextLabels = await fetchDisplayLabels(controller.signal);
        setDisplayLabels(nextLabels);
        setError("");
      } catch (err) {
        if (err?.name === "AbortError") return;
        setError(err?.message || "Could not load display labels.");
        setDisplayLabels(DEFAULT_DISPLAY_LABELS);
      } finally {
        setLoading(false);
      }
    };

    load();

    return () => {
      controller.abort();
    };
  }, []);

  const saveDisplayLabels = useCallback(async (nextLabels = {}) => {
    const res = await authFetch(apiPath("settings/display-labels"), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ labels: nextLabels }),
    });

    const payload = await res.json().catch(() => null);

    if (!res.ok) {
      throw new Error(payload?.message || "Could not save display labels.");
    }

    const merged = mergeDisplayLabels(payload?.labels || {});
    setDisplayLabels(merged);
    setError("");

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("display-labels:updated", { detail: { labels: merged } })
      );
    }

    return merged;
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const onLabelsUpdated = (event) => {
      const labels = event?.detail?.labels;
      if (!labels || typeof labels !== "object") return;
      setDisplayLabels(mergeDisplayLabels(labels));
    };

    window.addEventListener("display-labels:updated", onLabelsUpdated);
    return () => {
      window.removeEventListener("display-labels:updated", onLabelsUpdated);
    };
  }, []);

  const value = useMemo(
    () => ({
      displayLabels,
      loading,
      error,
      refreshDisplayLabels,
      saveDisplayLabels,
    }),
    [displayLabels, loading, error, refreshDisplayLabels, saveDisplayLabels]
  );

  return (
    <DisplaySettingsContext.Provider value={value}>
      {children}
    </DisplaySettingsContext.Provider>
  );
};

export const useDisplaySettings = () => useContext(DisplaySettingsContext);

export default DisplaySettingsContext;
