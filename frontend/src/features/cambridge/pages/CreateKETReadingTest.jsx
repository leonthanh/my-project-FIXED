import React from "react";
import CambridgeTestBuilder from "../CambridgeTestBuilder";

/**
 * CreateKETReadingTest - Trang tạo đề KET Reading & Writing
 */
const CreateKETReadingTest = () => {
  return <CambridgeTestBuilder testType="ket-reading" resetDraftOnLoad />;
};

export default CreateKETReadingTest;
