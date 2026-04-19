import React from 'react';
import CambridgeTestBuilder from '../../../../shared/components/CambridgeTestBuilder';
import {
  MOVERS_READING_API_BASE_PATH,
  MOVERS_READING_TEST_TYPE,
} from '../../shared/constants';

const CreateMoversReadingPage = () => (
  <CambridgeTestBuilder
    testType={MOVERS_READING_TEST_TYPE}
    apiBasePath={MOVERS_READING_API_BASE_PATH}
    resetDraftOnLoad
  />
);

export default CreateMoversReadingPage;