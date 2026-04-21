import React, { useEffect, useMemo, useState } from "react";
import { API_HOST } from "../utils/api";
import { buildAudioPreviewSources } from "../utils/audioUrls";

const DEFAULT_ERROR_TEXT = "Khong the tai audio preview. Kiem tra file da upload hoac duong dan dang luu.";

const AudioPreviewBlock = ({
  audioUrl,
  emptyText = "Chua co audio.",
  onClear = null,
  openLinkLabel = "Mo file audio",
  clearLabel = "Xoa audio",
  clearButtonContent = null,
  clearButtonTitle = "Xoa audio",
  rootStyle,
  audioStyle,
  actionsStyle,
  linkStyle,
  buttonStyle,
  emptyTextStyle,
  errorStyle,
  errorText = DEFAULT_ERROR_TEXT,
  preload = "none",
}) => {
  const sources = useMemo(() => buildAudioPreviewSources(API_HOST, audioUrl), [audioUrl]);
  const [failedSourceCount, setFailedSourceCount] = useState(0);

  useEffect(() => {
    setFailedSourceCount(0);
  }, [audioUrl]);

  if (!audioUrl) {
    return <div style={emptyTextStyle || { fontSize: "13px", color: "#6b7280" }}>{emptyText}</div>;
  }

  const candidateIndex = sources.length > 0 ? Math.min(failedSourceCount, sources.length - 1) : 0;
  const activeSrc = sources[candidateIndex] || "";
  const openHref = activeSrc || sources[0] || "";
  const exhausted = sources.length > 0 && failedSourceCount >= sources.length;
  const showActions = Boolean(openHref || onClear);

  return (
    <div style={rootStyle || { display: "flex", flexDirection: "column", gap: "10px" }}>
      <audio
        key={activeSrc}
        controls
        preload={preload}
        src={activeSrc}
        onError={() => {
          setFailedSourceCount((current) => (current < sources.length ? current + 1 : current));
        }}
        style={audioStyle || { width: "100%" }}
      >
        Your browser does not support audio.
      </audio>

      {exhausted ? (
        <div style={errorStyle || { fontSize: "12px", color: "#dc2626" }}>{errorText}</div>
      ) : null}

      {showActions ? (
        <div
          style={
            actionsStyle || {
              display: "flex",
              gap: "10px",
              alignItems: "center",
              flexWrap: "wrap",
            }
          }
        >
          {openHref ? (
            <a
              href={openHref}
              target="_blank"
              rel="noreferrer"
              style={linkStyle || { color: "#2563eb", textDecoration: "none", fontSize: "13px" }}
            >
              {openLinkLabel}
            </a>
          ) : null}

          {onClear ? (
            <button
              type="button"
              title={clearButtonTitle}
              onClick={onClear}
              style={
                buttonStyle || {
                  border: "1px solid #ef4444",
                  background: "white",
                  color: "#ef4444",
                  padding: "6px 10px",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "13px",
                }
              }
            >
              {clearButtonContent || clearLabel}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

export default AudioPreviewBlock;