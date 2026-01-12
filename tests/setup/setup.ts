/**
 * Global setup for integration tests
 * Configures environment variables and test conditions
 */

import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables from .env.test immediately
const envTestPath = path.resolve(process.cwd(), '.env.test');
if (fs.existsSync(envTestPath)) {
	dotenv.config({
		path: envTestPath,
	});
} else {
	// Fallback if .env.test doesn't exist
	console.warn(`⚠️ .env.test not found at ${envTestPath}`);
}

// Configure environment for testing
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error'; // Minimize logging noise in tests
process.env.LOG_REQUESTS = 'false'; // Disable request logging
process.env.PORT = '0'; // Use random available port
