import React from 'react';
import { useParams } from 'react-router-dom';
import GatewayTestBuilder from '../../../domains/gateway/shared/components/GatewayTestBuilder';
import {
  normalizeGatewaySkill,
} from '../../../domains/gateway/config/skills';

const GatewayCreateTestPage = () => {
  const { skill: rawSkill } = useParams();
  const skill = normalizeGatewaySkill(rawSkill);
  return <GatewayTestBuilder skill={skill} />;
};

export default GatewayCreateTestPage;
