import React from "react";
import CambridgeSubmissionsPage from "../../admin/pages/CambridgeSubmissionsPage";

const GatewaySubmissionsPage = () => (
  <CambridgeSubmissionsPage
    platformFilter="gateway"
    platformLabel="Gateway"
    platformLabelLower="Gateway"
    submissionsApiBase="gateway/submissions"
  />
);

export default GatewaySubmissionsPage;
