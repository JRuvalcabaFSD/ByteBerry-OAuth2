import { bootstrap } from '@bootstrap';
import type { IContainer, IHttpServer } from '@interfaces';
import type { GracefulShutdown } from '@infrastructure';

/**
 * Test server helper for integration tests
 * Manages application lifecycle in test environment
 */
export class TestServer {
	private container?: IContainer;
	private server?: IHttpServer;
	private shutdown?: GracefulShutdown;
	private baseUrl: string;
	private assignedPort?: number;

	constructor(private port: number = 0) {
		// Port 0 means assign random available port
		this.baseUrl = `http://localhost:${port}`;
	}

	/**
	 * Start the test server with full bootstrap
	 */
	async start(): Promise<void> {
		try {
			// Set test environment variables
			process.env.NODE_ENV = 'test';
			process.env.PORT = String(this.port);
			process.env.LOG_LEVEL = 'error';
			process.env.LOG_REQUESTS = 'false';

			// Bootstrap the application with real dependencies
			const result = await bootstrap({ skipDbValidation: true });

			this.container = result.container;
			this.shutdown = result.shutdown;
			this.server = this.container.resolve('HttpServer');

			// CRÍTICO: Iniciar el servidor HTTP para que escuche peticiones
			await this.server.start();

			// Get the actual port if it was randomly assigned
			const serverInfo = this.server.getServeInfo();
			this.assignedPort = serverInfo.port;
			this.baseUrl = `http://localhost:${this.assignedPort}`;
		} catch (error) {
			console.error('[TestServer] Failed to start:', error);
			throw error;
		}
	}

	/**
	 * Stop the test server and clean up resources
	 */
	async stop(): Promise<void> {
		if (this.shutdown) {
			await this.shutdown.shutdown();
		}
	}

	/**
	 * Get full URL for a given path
	 */
	getUrl(path: string = ''): string {
		if (!path.startsWith('/')) {
			path = `/${path}`;
		}
		return `${this.baseUrl}${path}`;
	}

	/**
	 * Get the Express application instance directly
	 * Most reliable method for supertest
	 */
	async getApp(): Promise<any> {
		if (!this.server) {
			throw new Error('Server not started. Call start() first.');
		}
		return await this.server.getApp();
	}

	/**
	 * Get the HTTP server instance
	 */
	getServer(): IHttpServer {
		if (!this.server) {
			throw new Error('Server not started. Call start() first.');
		}
		return this.server;
	}

	/**
	 * Get the DI container
	 */
	getContainer(): IContainer {
		if (!this.container) {
			throw new Error('Server not started. Call start() first.');
		}
		return this.container;
	}

	/**
	 * Get the assigned port (useful when using random port)
	 */
	getPort(): number {
		if (!this.assignedPort) {
			throw new Error('Server not started. Call start() first.');
		}
		return this.assignedPort;
	}

	/**
	 * Check if server is running
	 */
	isRunning(): boolean {
		return this.server?.isRunning() ?? false;
	}
}
