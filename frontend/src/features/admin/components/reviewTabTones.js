export const REVIEW_TAB_TONES = {
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

export const getReviewTabTone = (toneKey) =>
  REVIEW_TAB_TONES[toneKey] || REVIEW_TAB_TONES.reading;
