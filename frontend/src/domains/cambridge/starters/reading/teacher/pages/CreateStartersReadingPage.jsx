import React from 'react';
import CambridgeTestBuilder from '../../../../shared/components/CambridgeTestBuilder';
import {
  STARTERS_READING_API_BASE_PATH,
  STARTERS_READING_TEST_TYPE,
} from '../../shared/constants';

const CreateStartersReadingPage = () => (
  <CambridgeTestBuilder
    testType={STARTERS_READING_TEST_TYPE}
    apiBasePath={STARTERS_READING_API_BASE_PATH}
    resetDraftOnLoad
  />
);

export default CreateStartersReadingPage;