import React from "react";
import LineIcon from "./LineIcon.jsx";

const InlineIcon = ({
  name,
  size = 16,
  strokeWidth = 2,
  style,
  className,
}) => (
  <span
    aria-hidden="true"
    className={className}
    style={{
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      lineHeight: 0,
      flex: "0 0 auto",
      ...style,
    }}
  >
    <LineIcon name={name} size={size} strokeWidth={strokeWidth} />
  </span>
);

export default InlineIcon;