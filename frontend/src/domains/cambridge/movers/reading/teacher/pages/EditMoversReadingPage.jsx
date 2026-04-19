import React from 'react';
import EditCambridgeReadingTestPage from '../../../../shared/pages/EditCambridgeReadingTestPage';
import { MOVERS_READING_API_BASE_PATH } from '../../shared/constants';

const EditMoversReadingPage = () => (
  <EditCambridgeReadingTestPage apiBasePath={MOVERS_READING_API_BASE_PATH} />
);

export default EditMoversReadingPage;