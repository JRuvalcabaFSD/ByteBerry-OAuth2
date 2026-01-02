// ======================================
// import modules for implements decorators
// ======================================
import './services/clock.service.js';
import './services/health.service.js';
import './services/uuid.service.js';
import './services/winston-logger.service.js';
import './http/http.server.js';
import './lifecycle/shutdown.js';
import './repositories/inMemory.repository.js';

// ======================================
// Export modules
// ======================================

//Http
export * from './http/http.server.js';

//Http - Middlewares
export * from './http/middlewares/core.middleware.js';
export * from './http/middlewares/error.middleware.js';
export * from './http/middlewares/logger.middleware.js';
export * from './http/middlewares/requestId.middleware.js';
export * from './http/middlewares/security.middleware.js';

//Lifecycle
export * from './lifecycle/shutdown.js';
export * from './lifecycle/shutdown-config.js';

//Repositories
export * from './repositories/inMemory.repository.js';

//Services
export * from './services/clock.service.js';
export * from './services/health-register.service.js';
export * from './services/health.service.js';
export * from './services/uuid.service.js';
export * from './services/winston-logger.service.js';
