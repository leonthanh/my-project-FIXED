import React from "react";
import CambridgeTestBuilder from "../CambridgeTestBuilder";

/**
 * CreateMoversReadingTest - Trang tạo đề Cambridge Movers Reading & Writing
 * testType = 'movers' (key trong TEST_CONFIGS)
 * Hỗ trợ các question types: matching-pictures, fill, abc, cloze-mc, word-form, short-message
 */
const CreateMoversReadingTest = () => {
  return <CambridgeTestBuilder testType="movers" resetDraftOnLoad />;
};

export default CreateMoversReadingTest;
