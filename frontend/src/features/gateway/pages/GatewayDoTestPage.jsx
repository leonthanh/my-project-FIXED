import React from "react";
import { useParams } from "react-router-dom";
import GatewayReadingRuntimePage from "../../../domains/exam-core/shared/pages/ExamCoreReadingRuntimePage";
import GatewayListeningRuntimePage from "../../../domains/exam-core/shared/pages/ExamCoreListeningRuntimePage";
import { normalizeGatewaySkill } from "../../../domains/gateway/config/skills";

const GatewayDoTestPage = () => {
  const { skill: rawSkill } = useParams();
  const skill = normalizeGatewaySkill(rawSkill);

  if (skill === "listening") {
    return <GatewayListeningRuntimePage defaultTestType="gateway-listening" />;
  }

  return (
    <GatewayReadingRuntimePage
      defaultTestType="gateway-reading-writing"
      fetchBasePath="cambridge/reading-tests"
      submitBasePath="cambridge/reading-tests"
    />
  );
};

export default GatewayDoTestPage;
