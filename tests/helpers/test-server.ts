/**
 * Test server helper for integration tests.
 * Manages full application bootstrap and lifecycle.
 */

import type { Application } from 'express';
import type { IContainer, IHttpServer } from '@interfaces';
import { bootstrap } from '@bootstrap';
import type { GracefulShutdown } from '@infrastructure';

/**
 * TestServer manages the full application lifecycle for integration tests.
 *
 * Handles:
 * - Bootstrap with skip DB validation option
 * - Server start/stop
 * - Container access
 * - Port management (supports port 0 for random assignment)
 */
export class TestServer {
	private container: IContainer | null = null;
	private shutdown: GracefulShutdown | null = null;
	private httpServer: IHttpServer | null = null;
	private readonly port: number;

	/**
	 * @param port - Port to listen on (use 0 for random port assignment)
	 */
	constructor(port: number = 0) {
		this.port = port;
	}

	/**
	 * Starts the test server.
	 *
	 * @param skipDbValidation - Skip database connection validation (default: false)
	 * @throws {Error} If server fails to start
	 */
	public async start(skipDbValidation: boolean = false): Promise<void> {
		// Override port in env if specified
		if (this.port !== 0) {
			process.env.PORT = this.port.toString();
		}

		// Bootstrap application
		const result = await bootstrap({ skipDbValidation });

		this.container = result.container;
		this.shutdown = result.shutdown;
		this.httpServer = this.container.resolve('HttpServer');
	}

	/**
	 * Stops the test server gracefully.
	 */
	public async stop(): Promise<void> {
		if (this.shutdown) {
			await this.shutdown.shutdown();
		}

		this.container = null;
		this.shutdown = null;
		this.httpServer = null;
	}

	/**
	 * Gets the Express application instance.
	 * @throws {Error} If server is not started
	 */
	public async getApp(): Promise<Application> {
		if (!this.httpServer) {
			throw new Error('Server not started. Call start() first.');
		}

		return await this.httpServer.getApp();
	}

	/**
	 * Gets the dependency injection container.
	 * @throws {Error} If server is not started
	 */
	public getContainer(): IContainer {
		if (!this.container) {
			throw new Error('Server not started. Call start() first.');
		}

		return this.container;
	}

	/**
	 * Gets the HTTP server instance.
	 * @throws {Error} If server is not started
	 */
	public getServer(): IHttpServer {
		if (!this.httpServer) {
			throw new Error('Server not started. Call start() first.');
		}

		return this.httpServer;
	}

	/**
	 * Gets the actual port the server is listening on.
	 * Useful when port 0 is used (random assignment).
	 *
	 * @throws {Error} If server is not started
	 */
	public getPort(): number {
		if (!this.httpServer) {
			throw new Error('Server not started. Call start() first.');
		}

		const info = this.httpServer.getServeInfo();
		return info.port;
	}

	/**
	 * Constructs a full URL for testing.
	 *
	 * @param path - The path to append to the base URL
	 * @returns Full URL with assigned port
	 *
	 * @example
	 * const url = testServer.getUrl('/auth/login');
	 * // Returns: http://localhost:54321/auth/login
	 */
	public getUrl(path: string): string {
		const port = this.getPort();
		const basePath = path.startsWith('/') ? path : `/${path}`;
		return `http://localhost:${port}${basePath}`;
	}

	/**
	 * Checks if the server is currently running.
	 */
	public isRunning(): boolean {
		return this.httpServer?.isRunning() ?? false;
	}
}
