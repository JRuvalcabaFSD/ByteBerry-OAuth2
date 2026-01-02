import { randomBytes } from 'crypto';
import { NextFunction, Request, Response } from 'express';

import type { IConfig, ILogger } from '@interfaces';
import { Injectable } from '@shared';

/**
 * Extends the global ServiceMap interface to include the IConfig interface.
 * This allows for type-safe access to configuration settings throughout the application.
 * @module @ServiceMap
 * @interface ServiceMap
 */

declare module '@ServiceMap' {
	interface ServiceMap {
		LoginController: LoginController;
	}
}

//TODO documentar
@Injectable({ name: 'LoginController', depends: ['Logger', 'Config'] })
export class LoginController {
	private readonly COOKIE_NAME = 'session_id';
	private readonly COOKIE_MAX_AGE = 3600000; // 1 hour in milliseconds
	private readonly COOKIE_MAX_AGE_EXTENDED = 30 * 24 * 3600000; // 30 days in milliseconds

	constructor(
		private readonly logger: ILogger,
		private readonly config: IConfig
	) {}

	public getLoginForm = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		try {
			const existingSessionId = req.cookies[this.COOKIE_NAME];

			if (existingSessionId) {
				this.logger.debug('User already has session cookie', { sessionId: existingSessionId });
			}

			const nonce = randomBytes(16).toString('base64');
			res.set('Content-Security-Policy', `script-src 'self' 'nonce-${nonce}';`);
			res.render('login', {
				version: this.config.version || '0.0.0',
				nonce,
				// returnUrl: returnUrl || '',
			});

			this.logger.debug('Login form rendered successfully');
		} catch (error) {
			this.logger.error('Error rendering login form', { error });
			next(error);
		}
	};
}
