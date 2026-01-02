import cors, { type CorsOptions } from 'cors';

import { CorsOriginError } from '@shared';
import { IConfig } from '@interfaces';

/**
 * Creates a CORS (Cross-Origin Resource Sharing) middleware with configured options.
 *
 * @param config - The application configuration object containing CORS settings
 * @param config.corsOrigins - Array of allowed origins for CORS requests
 *
 * @returns A configured CORS middleware function
 *
 * @remarks
 * This middleware configures CORS with the following settings:
 * - Origins are validated against the configured allowed origins list
 * - Credentials are enabled for cross-origin requests
 * - Allowed HTTP methods: GET, POST, PUT, DELETE, OPTIONS
 * - Requests without an origin (e.g., same-origin) are automatically allowed
 * - Allowed headers: Content-Type, Authorization, X-Request-ID
 *
 * @throws {CorsOriginError} Throws when a request origin is not in the allowed list
 *
 * @example
 * ```typescript
 * const config = { corsOrigins: ['https://example.com'] };
 * const corsMiddleware = createCORSMiddleware(config);
 * app.use(corsMiddleware);
 * ```
 */

export function createCORSMiddleware(config: IConfig) {
	const corsOptions: CorsOptions = {
		origin: (origin, cb) => {
			if (!origin || config.corsOrigins.includes(origin)) {
				cb(null, true);
			} else cb(new CorsOriginError(origin), false);
		},
		credentials: true,
		optionsSuccessStatus: 200,
		methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
		allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
	};

	return cors(corsOptions);
}
