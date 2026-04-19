import { buildIxListeningRoutes } from './listening/routes';
import { buildIxReadingRoutes } from './reading/routes';
import { buildIxWritingRoutes } from './writing/routes';

export const buildIxRoutes = ({ isAuthenticated }) => [
  ...buildIxWritingRoutes({ isAuthenticated }),
  ...buildIxReadingRoutes({ isAuthenticated }),
  ...buildIxListeningRoutes({ isAuthenticated }),
];