import React from "react";
import CambridgeTestBuilder from "../CambridgeTestBuilder";

/**
 * CreatePETReadingTest - Trang tạo đề PET Reading & Writing
 */
const CreatePETReadingTest = () => {
  return <CambridgeTestBuilder testType="pet-reading" resetDraftOnLoad />;
};

export default CreatePETReadingTest;