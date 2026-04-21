import { buildCambridgeKetListeningRoutes } from './listening/routes';
import { buildCambridgeKetReadingRoutes } from './reading/routes';

export const buildCambridgeKetRoutes = () => [
  ...buildCambridgeKetListeningRoutes(),
  ...buildCambridgeKetReadingRoutes(),
];