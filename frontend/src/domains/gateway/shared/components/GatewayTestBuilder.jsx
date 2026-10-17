import React from "react";
import GatewayCoreTestBuilder from "../../../exam-core/shared/components/ExamCoreTestBuilder";

const GatewayTestBuilder = ({ skill = "reading-writing", ...props }) => {
  const normalizedSkill = String(skill || "").trim().toLowerCase();
  const testType = normalizedSkill === "listening" ? "gateway-listening" : "gateway-reading-writing";
  const apiBasePath =
    props.apiBasePath ||
    (normalizedSkill === "listening" ? "gateway/listening-tests" : "gateway/reading-tests");

  return <GatewayCoreTestBuilder {...props} apiBasePath={apiBasePath} testType={testType} />;
};

export default GatewayTestBuilder;
