import { buildFlyersReadingRoutes } from './flyers/reading/routes';
import { buildCambridgeKetRoutes } from './ket/routes';
import { buildMoversRoutes } from './movers/routes';
import { buildCambridgePetRoutes } from './pet/routes';
import { buildCambridgeSharedRoutes } from './shared/routes';
import { buildStartersReadingRoutes } from './starters/reading/routes';

export const buildCambridgeRoutes = ({ isAuthenticated }) => [
  ...buildCambridgeKetRoutes(),
  ...buildCambridgePetRoutes({ isAuthenticated }),
  ...buildFlyersReadingRoutes({ isAuthenticated }),
  ...buildMoversRoutes({ isAuthenticated }),
  ...buildStartersReadingRoutes({ isAuthenticated }),
  ...buildCambridgeSharedRoutes({ isAuthenticated }),
];