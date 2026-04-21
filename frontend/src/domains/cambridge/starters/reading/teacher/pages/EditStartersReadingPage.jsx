import React from 'react';
import EditCambridgeReadingTestPage from '../../../../shared/pages/EditCambridgeReadingTestPage';
import { STARTERS_READING_API_BASE_PATH } from '../../shared/constants';

const EditStartersReadingPage = () => (
  <EditCambridgeReadingTestPage apiBasePath={STARTERS_READING_API_BASE_PATH} />
);

export default EditStartersReadingPage;