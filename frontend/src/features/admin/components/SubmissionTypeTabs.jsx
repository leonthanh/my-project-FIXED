import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../../../shared/contexts/ThemeContext";
import { apiPath } from "../../../shared/utils/api";

const SUBMISSION_PAGES = [
  {
    key: "writing",
    shortLabel: "Writing",
    label: "Writing Submissions",
    path: "/admin/writing-submissions",
    tone: "writing",
  },
  {
    key: "reading",
    shortLabel: "Reading",
    label: "Reading Submissions",
    path: "/admin/reading-submissions",
    tone: "reading",
  },
  {
    key: "listening",
    shortLabel: "Listening",
    label: "Listening Submissions",
    path: "/admin/listening-submissions",
    tone: "listening",
  },
];

const TAB_TONES = {
  writing: {
    activeBackground: "linear-gradient(135deg, #7c3aed 0%, #9f67ff 100%)",
    activeBorder: "#7c3aed",
    softBackground: "#f5f3ff",
    softBorder: "#ddd6fe",
    softText: "#6d28d9",
    softBadgeBackground: "rgba(124, 58, 237, 0.12)",
  },
  reading: {
    activeBackground: "linear-gradient(135deg, #0f3f94 0%, #2563eb 100%)",
    activeBorder: "#0f3f94",
    softBackground: "#eff6ff",
    softBorder: "#bfdbfe",
    softText: "#1d4ed8",
    softBadgeBackground: "rgba(37, 99, 235, 0.12)",
  },
  listening: {
    activeBackground: "linear-gradient(135deg, #0f8c4b 0%, #22c55e 100%)",
    activeBorder: "#0f8c4b",
    softBackground: "#f0fdf4",
    softBorder: "#bbf7d0",
    softText: "#15803d",
    softBadgeBackground: "rgba(34, 197, 94, 0.14)",
  },
  cambridge: {
    activeBackground: "linear-gradient(135deg, #d45512 0%, #fb923c 100%)",
    activeBorder: "#d45512",
    softBackground: "#fff7ed",
    softBorder: "#fed7aa",
    softText: "#c2410c",
    softBadgeBackground: "rgba(251, 146, 60, 0.16)",
  },
};

const getTabTone = (toneKey) => TAB_TONES[toneKey] || TAB_TONES.reading;

const SubmissionTypeTabs = ({
  activeKey,
  items = SUBMISSION_PAGES,
  title = "IX Submissions",
  onSelect,
  allowMobileWrap = false,
  buttonFlex = "0 0 auto",
  showZeroBadge = false,
  countMode = null,
}) => {
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();
  const [countMap, setCountMap] = useState({});

  useEffect(() => {
    let isCancelled = false;

    const loadCounts = async () => {
      try {
        if (countMode === "ix") {
          const [writingRes, readingRes, listeningRes] = await Promise.all([
            fetch(apiPath("writing/list?includeDrafts=1")),
            fetch(apiPath("reading-submissions/admin/list")),
            fetch(apiPath("listening-submissions/admin/list")),
          ]);

          if (!writingRes.ok || !readingRes.ok || !listeningRes.ok) {
            throw new Error("Failed to load IX submission counts");
          }

          const [writingData, readingData, listeningData] = await Promise.all([
            writingRes.json(),
            readingRes.json(),
            listeningRes.json(),
          ]);

          if (!isCancelled) {
            setCountMap({
              writing: Array.isArray(writingData) ? writingData.length : 0,
              reading: Array.isArray(readingData) ? readingData.length : 0,
              listening: Array.isArray(listeningData) ? listeningData.length : 0,
            });
          }

          return;
        }

        if (countMode === "cambridge") {
          const [allRes, listeningRes, readingRes] = await Promise.all([
            fetch(apiPath("cambridge/submissions?page=1&limit=1&includeActive=1")),
            fetch(apiPath("cambridge/submissions?page=1&limit=1&includeActive=1&testType=listening")),
            fetch(apiPath("cambridge/submissions?page=1&limit=1&includeActive=1&testType=reading")),
          ]);

          if (!allRes.ok || !listeningRes.ok || !readingRes.ok) {
            throw new Error("Failed to load Cambridge submission counts");
          }

          const [allData, listeningData, readingData] = await Promise.all([
            allRes.json(),
            listeningRes.json(),
            readingRes.json(),
          ]);

          if (!isCancelled) {
            setCountMap({
              all: Number(allData?.pagination?.total) || 0,
              listening: Number(listeningData?.pagination?.total) || 0,
              reading: Number(readingData?.pagination?.total) || 0,
            });
          }

          return;
        }

        if (!isCancelled) {
          setCountMap({});
        }
      } catch (error) {
        if (!isCancelled) {
          setCountMap({});
        }
      }
    };

    loadCounts();

    return () => {
      isCancelled = true;
    };
  }, [countMode]);

  const resolvedItems = useMemo(
    () =>
      items.map((item) => (
        Object.prototype.hasOwnProperty.call(countMap, item.key)
          ? { ...item, badge: countMap[item.key] }
          : item
      )),
    [countMap, items]
  );

  return (
    <div style={{ width: "100%", display: "grid", gap: title ? 8 : 0, marginBottom: 0 }}>
      {title ? (
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: isDarkMode ? "#cbd5e1" : "#374151",
            whiteSpace: "nowrap",
          }}
        >
          {title}
        </div>
      ) : null}
      <div
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          flexWrap: allowMobileWrap ? "wrap" : "nowrap",
          gap: 6,
          minWidth: 0,
        }}
      >
        {resolvedItems.map((item) => {
          const isActive = item.key === activeKey;
          const badgeValue = Number(item.badge);
          const hasBadge = Number.isFinite(badgeValue) && (showZeroBadge ? badgeValue >= 0 : badgeValue > 0);
          const tone = getTabTone(item.tone || item.key);

          return (
            <button
              key={item.key}
              type="button"
              aria-current={isActive ? "page" : undefined}
              aria-label={item.label}
              title={item.label}
              onClick={() => {
                if (isActive) return;

                if (typeof onSelect === "function") {
                  onSelect(item.key);
                  return;
                }

                if (item.path) {
                  navigate(item.path);
                }
              }}
              style={{
                flex: buttonFlex,
                width: "auto",
                maxWidth: "100%",
                minWidth: 0,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                padding: "6px 11px",
                borderRadius: 999,
                border: `1px solid ${isActive ? tone.activeBorder : tone.softBorder}`,
                background: isActive
                  ? tone.activeBackground
                  : isDarkMode
                  ? "rgba(15, 23, 42, 0.88)"
                  : tone.softBackground,
                color: isActive ? "#ffffff" : tone.softText,
                boxShadow: isActive
                  ? `0 8px 16px ${tone.softBadgeBackground}`
                  : "none",
                cursor: isActive ? "default" : "pointer",
                fontSize: 12.5,
                fontWeight: 700,
                lineHeight: 1,
                textAlign: "center",
                whiteSpace: "nowrap",
                opacity: 1,
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  maxWidth: "100%",
                }}
              >
                <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                  {item.shortLabel || item.label}
                </span>
                {hasBadge ? (
                  <span
                    style={{
                      minWidth: 22,
                      padding: "2px 7px",
                      borderRadius: 999,
                      fontSize: 11,
                      fontWeight: 800,
                      background: isActive
                        ? "rgba(255, 255, 255, 0.18)"
                        : isDarkMode
                        ? tone.softBadgeBackground
                        : "rgba(255, 255, 255, 0.78)",
                      color: isActive ? "#ffffff" : tone.softText,
                      textAlign: "center",
                    }}
                  >
                    {badgeValue}
                  </span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default SubmissionTypeTabs;