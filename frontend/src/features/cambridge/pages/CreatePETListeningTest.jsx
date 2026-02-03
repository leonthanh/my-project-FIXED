import React from "react";
import CambridgeTestBuilder from "../CambridgeTestBuilder";

/**
 * CreatePETListeningTest - Trang tạo đề PET Listening
 */
const CreatePETListeningTest = () => {
  return <CambridgeTestBuilder testType="pet-listening" resetDraftOnLoad />;
};

export default CreatePETListeningTest;