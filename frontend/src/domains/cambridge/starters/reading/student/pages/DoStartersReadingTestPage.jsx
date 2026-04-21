import React from 'react';
import DoCambridgeReadingTestPage from '../../../../shared/pages/DoCambridgeReadingTestPage';
import {
  STARTERS_READING_API_BASE_PATH,
  STARTERS_READING_ROUTE_TEST_TYPE,
} from '../../shared/constants';

const DoStartersReadingTestPage = () => (
  <DoCambridgeReadingTestPage
    defaultTestType={STARTERS_READING_ROUTE_TEST_TYPE}
    fetchBasePath={STARTERS_READING_API_BASE_PATH}
    submitBasePath={STARTERS_READING_API_BASE_PATH}
  />
);

export default DoStartersReadingTestPage;