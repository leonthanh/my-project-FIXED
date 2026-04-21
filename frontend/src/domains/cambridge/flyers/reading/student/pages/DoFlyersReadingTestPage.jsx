import React from 'react';
import DoCambridgeReadingTestPage from '../../../../shared/pages/DoCambridgeReadingTestPage';
import {
  FLYERS_READING_API_BASE_PATH,
  FLYERS_READING_ROUTE_TEST_TYPE,
} from '../../shared/constants';

const DoFlyersReadingTestPage = () => (
  <DoCambridgeReadingTestPage
    defaultTestType={FLYERS_READING_ROUTE_TEST_TYPE}
    fetchBasePath={FLYERS_READING_API_BASE_PATH}
    submitBasePath={FLYERS_READING_API_BASE_PATH}
  />
);

export default DoFlyersReadingTestPage;