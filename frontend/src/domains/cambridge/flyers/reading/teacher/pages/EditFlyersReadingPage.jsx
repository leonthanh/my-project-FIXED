import React from 'react';
import EditCambridgeReadingTestPage from '../../../../shared/pages/EditCambridgeReadingTestPage';
import { FLYERS_READING_API_BASE_PATH } from '../../shared/constants';

const EditFlyersReadingPage = () => (
  <EditCambridgeReadingTestPage apiBasePath={FLYERS_READING_API_BASE_PATH} />
);

export default EditFlyersReadingPage;