/**
 * Global setup for integration tests
 * Configures environment variables and test conditions
 */

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.test immediately
dotenv.config({
	path: path.resolve(process.cwd(), '.env.test'),
});

// Configure environment for testing
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error'; // Minimize logging noise in tests
process.env.LOG_REQUESTS = 'false'; // Disable request logging
process.env.PORT = '0'; // Use random available port
