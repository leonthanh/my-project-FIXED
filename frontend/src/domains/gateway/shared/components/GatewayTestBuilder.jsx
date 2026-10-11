import React from "react";
import GatewayCoreTestBuilder from "../../../exam-core/shared/components/ExamCoreTestBuilder";

const GatewayTestBuilder = ({ skill = "reading-writing", ...props }) => {
  const normalizedSkill = String(skill || "").trim().toLowerCase();
  const testType = normalizedSkill === "listening" ? "gateway-listening" : "gateway-reading-writing";

  return <GatewayCoreTestBuilder {...props} testType={testType} />;
};

export default GatewayTestBuilder;
