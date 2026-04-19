import React from 'react';
import DoCambridgeReadingTestPage from '../../../../shared/pages/DoCambridgeReadingTestPage';
import {
  MOVERS_READING_API_BASE_PATH,
  MOVERS_READING_ROUTE_TEST_TYPE,
} from '../../shared/constants';

const DoMoversReadingTestPage = () => (
  <DoCambridgeReadingTestPage
    defaultTestType={MOVERS_READING_ROUTE_TEST_TYPE}
    fetchBasePath={MOVERS_READING_API_BASE_PATH}
    submitBasePath={MOVERS_READING_API_BASE_PATH}
  />
);

export default DoMoversReadingTestPage;