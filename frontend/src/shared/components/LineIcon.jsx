import React from "react";

const baseProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": "true",
  focusable: "false",
};

const LineIcon = ({ name, size = 18, strokeWidth = 1.9, className }) => {
  const props = {
    ...baseProps,
    width: size,
    height: size,
    strokeWidth,
    className,
  };

  switch (name) {
    case "tests":
    case "reading":
      return (
        <svg {...props}>
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
          <path d="M8 7h8" />
          <path d="M8 11h8" />
        </svg>
      );
    case "orange":
      return (
        <svg {...props}>
          <path d="m2 10 10-5 10 5-10 5-10-5Z" />
          <path d="M6 12v4c0 1.5 2.7 3 6 3s6-1.5 6-3v-4" />
          <path d="M22 10v6" />
        </svg>
      );
    case "writing":
    case "edit":
      return (
        <svg {...props}>
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
      );
    case "listening":
      return (
        <svg {...props}>
          <path d="M14 9a5 5 0 0 1 0 6" />
          <path d="M17.5 6.5a9 9 0 0 1 0 11" />
          <path d="M3 10h4l5-4v12l-5-4H3z" />
        </svg>
      );
    case "fill":
      return (
        <svg {...props}>
          <path d="M4 6h16" />
          <path d="M4 11h9" />
          <path d="M4 16h6" />
          <path d="M14 14h6" />
          <path d="M14 18h6" />
        </svg>
      );
    case "form":
      return (
        <svg {...props}>
          <rect x="5" y="3" width="14" height="18" rx="2" />
          <path d="M8 7h8" />
          <path d="M8 11h5" />
          <path d="M8 15h8" />
        </svg>
      );
    case "table":
      return (
        <svg {...props}>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="M3 10h18" />
          <path d="M9 5v14" />
          <path d="M15 5v14" />
        </svg>
      );
    case "choice":
      return (
        <svg {...props}>
          <circle cx="6" cy="7" r="1.5" />
          <circle cx="6" cy="12" r="1.5" />
          <circle cx="6" cy="17" r="1.5" />
          <path d="M10 7h10" />
          <path d="M10 12h10" />
          <path d="M10 17h10" />
        </svg>
      );
    case "matching":
      return (
        <svg {...props}>
          <path d="M4 8h8" />
          <path d="m9 5 3 3-3 3" />
          <path d="M20 16h-8" />
          <path d="m15 13-3 3 3 3" />
        </svg>
      );
    case "multi-select":
      return (
        <svg {...props}>
          <rect x="4" y="5" width="4" height="4" rx="1" />
          <rect x="4" y="15" width="4" height="4" rx="1" />
          <path d="m5 7 1 1 2-2" />
          <path d="m5 17 1 1 2-2" />
          <path d="M11 7h9" />
          <path d="M11 17h9" />
        </svg>
      );
    case "map":
      return (
        <svg {...props}>
          <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z" />
          <path d="M9 4v14" />
          <path d="M15 6v14" />
        </svg>
      );
    case "flowchart":
      return (
        <svg {...props}>
          <rect x="4" y="4" width="6" height="4" rx="1" />
          <rect x="14" y="10" width="6" height="4" rx="1" />
          <rect x="4" y="16" width="6" height="4" rx="1" />
          <path d="M10 6h4" />
          <path d="M17 8v2" />
          <path d="M14 12h-4" />
          <path d="M7 8v8" />
        </svg>
      );
    case "key":
      return (
        <svg {...props}>
          <circle cx="7.5" cy="14.5" r="3.5" />
          <path d="M11 14.5H21" />
          <path d="M18 14.5v3" />
          <path d="M15 14.5v2" />
        </svg>
      );
    case "pet":
      return (
        <svg {...props}>
          <path d="M6 3h12v18l-6-4-6 4V3Z" />
          <path d="M9 7h6" />
        </svg>
      );
    case "flyers":
      return (
        <svg {...props}>
          <path d="m3 11 18-7-7 18-2-8-9-3Z" />
          <path d="m12 14 9-10" />
        </svg>
      );
    case "movers":
      return (
        <svg {...props}>
          <path d="M4 12h16" />
          <path d="m8 8-4 4 4 4" />
          <path d="m16 8 4 4-4 4" />
        </svg>
      );
    case "starters":
      return (
        <svg {...props}>
          <path d="m12 3 2.7 5.5 6 .9-4.4 4.3 1 6L12 17l-5.3 2.8 1-6-4.4-4.3 6-.9L12 3Z" />
        </svg>
      );
    case "class":
      return (
        <svg {...props}>
          <path d="M3 21h18" />
          <path d="M5 21V7l7-4 7 4v14" />
          <path d="M9 11h.01" />
          <path d="M15 11h.01" />
          <path d="M9 15h.01" />
          <path d="M15 15h.01" />
        </svg>
      );
    case "teacher":
    case "student":
    case "user":
      return (
        <svg {...props}>
          <path d="M20 21a8 8 0 0 0-16 0" />
          <circle cx="12" cy="8" r="4" />
        </svg>
      );
    case "questions":
      return (
        <svg {...props}>
          <path d="M8 6h13" />
          <path d="M8 12h13" />
          <path d="M8 18h13" />
          <path d="m3 6 1 1 2-2" />
          <path d="m3 12 1 1 2-2" />
          <path d="m3 18 1 1 2-2" />
        </svg>
      );
    case "clock":
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      );
    case "feedback":
      return (
        <svg {...props}>
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          <path d="M8 9h8" />
          <path d="M8 13h5" />
        </svg>
      );
    case "create":
      return (
        <svg {...props}>
          <path d="M12 5v14" />
          <path d="M5 12h14" />
        </svg>
      );
    case "empty":
      return (
        <svg {...props}>
          <path d="M4 7h16v10H4z" />
          <path d="M4 11h5l2 3h2l2-3h5" />
        </svg>
      );
    case "loading":
      return (
        <svg {...props}>
          <path d="M21 12a9 9 0 1 1-6.22-8.56" />
          <path d="M21 3v6h-6" />
        </svg>
      );
    case "overview":
      return (
        <svg {...props}>
          <path d="M3 3v18h18" />
          <path d="m7 14 3-3 3 2 4-5" />
        </svg>
      );
    case "review":
      return (
        <svg {...props}>
          <path d="M9 4h6" />
          <path d="M10 2h4a1 1 0 0 1 1 1v1H9V3a1 1 0 0 1 1-1Z" />
          <path d="M8 4H6a2 2 0 0 0-2 2v14h16V6a2 2 0 0 0-2-2h-2" />
          <path d="m9 12 2 2 4-4" />
          <path d="M8 17h8" />
        </svg>
      );
    case "selector":
      return (
        <svg {...props}>
          <rect x="4" y="6" width="16" height="12" rx="2" />
          <path d="M8 10h8" />
          <path d="m10 13 2 2 2-2" />
        </svg>
      );
    case "arrow-left":
      return (
        <svg {...props}>
          <path d="M19 12H5" />
          <path d="m12 19-7-7 7-7" />
        </svg>
      );
    case "calendar":
      return (
        <svg {...props}>
          <path d="M8 2v4" />
          <path d="M16 2v4" />
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M3 10h18" />
        </svg>
      );
    case "good":
    case "correct":
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="9" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      );
    case "average":
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v5" />
          <path d="M12 16h.01" />
        </svg>
      );
    case "weak":
    case "wrong":
    case "error":
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="9" />
          <path d="m9 9 6 6" />
          <path d="m15 9-6 6" />
        </svg>
      );
    case "blank":
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="9" />
          <path d="M8 12h8" />
        </svg>
      );
    case "chevron-left":
      return (
        <svg {...props}>
          <path d="m15 18-6-6 6-6" />
        </svg>
      );
    case "chevron-right":
      return (
        <svg {...props}>
          <path d="m9 18 6-6-6-6" />
        </svg>
      );
    case "chevron-down":
      return (
        <svg {...props}>
          <path d="m6 9 6 6 6-6" />
        </svg>
      );
    case "chevron-up":
      return (
        <svg {...props}>
          <path d="m18 15-6-6-6 6" />
        </svg>
      );
    case "retry":
      return (
        <svg {...props}>
          <path d="M3 12a9 9 0 0 1 15.3-6.36L21 8" />
          <path d="M21 3v5h-5" />
          <path d="M21 12a9 9 0 0 1-15.3 6.36L3 16" />
          <path d="M3 21v-5h5" />
        </svg>
      );
    case "home":
      return (
        <svg {...props}>
          <path d="m3 11 9-8 9 8" />
          <path d="M5 10v10h14V10" />
          <path d="M9 20v-6h6v6" />
        </svg>
      );
    case "eye":
      return (
        <svg {...props}>
          <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      );
    case "close":
      return (
        <svg {...props}>
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </svg>
      );
    default:
      return null;
  }
};

export default LineIcon;