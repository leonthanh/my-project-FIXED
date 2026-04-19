import { buildCambridgePetListeningRoutes } from './listening/routes';
import { buildCambridgePetReadingRoutes } from './reading/routes';
import { buildCambridgePetWritingRoutes } from './writing/routes';

export const buildCambridgePetRoutes = ({ isAuthenticated }) => [
  ...buildCambridgePetListeningRoutes(),
  ...buildCambridgePetReadingRoutes(),
  ...buildCambridgePetWritingRoutes({ isAuthenticated }),
];