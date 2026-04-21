import React from 'react';
import CambridgeTestBuilder from '../../../../shared/components/CambridgeTestBuilder';
import {
  FLYERS_READING_API_BASE_PATH,
  FLYERS_READING_TEST_TYPE,
} from '../../shared/constants';

const CreateFlyersReadingPage = () => (
  <CambridgeTestBuilder
    testType={FLYERS_READING_TEST_TYPE}
    apiBasePath={FLYERS_READING_API_BASE_PATH}
    resetDraftOnLoad
  />
);

export default CreateFlyersReadingPage;