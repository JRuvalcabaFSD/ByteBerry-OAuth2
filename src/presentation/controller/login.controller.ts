import { randomBytes } from 'crypto';
import { NextFunction, Request, Response } from 'express';

import type { IConfig, ILogger, ILoginUseCase } from '@interfaces';
import { Injectable } from '@shared';
import { LoginRequestDTO } from '@application';

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
@Injectable({ name: 'LoginController', depends: ['Logger', 'Config', 'LoginUseCase'] })
export class LoginController {
	// TODO Pasar por env
	private readonly COOKIE_NAME: string = 'session_id';
	private readonly COOKIE_MAX_AGE: number = 3600000; // 1 hour in milliseconds
	private readonly COOKIE_MAX_AGE_EXTENDED: number = 30 * 24 * 3600000; // 30 days in milliseconds

	constructor(
		private readonly logger: ILogger,
		private readonly config: IConfig,
		private readonly useCase: ILoginUseCase
	) {
		this.COOKIE_NAME = this.config.sessionCookieName;
		this.COOKIE_MAX_AGE = this.config.cookieMaxAge;
		this.COOKIE_MAX_AGE_EXTENDED = 30 * 24 * this.config.cookieMaxAge;
	}

	public getLoginForm = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		try {
			const existingSessionId = req.cookies[this.COOKIE_NAME];

			if (existingSessionId) {
				this.logger.debug('User already has session cookie', { sessionId: existingSessionId });
			}

			const returnUrl = typeof req.query.return_url === 'string' ? req.query.return_url : '';

			const nonce = randomBytes(16).toString('base64');
			res.set('Content-Security-Policy', `script-src 'self' 'nonce-${nonce}';`);
			res.render('login', {
				version: this.config.version || '0.0.0',
				nonce,
				returnUrl: returnUrl || '',
			});

			this.logger.debug('Login form rendered successfully');
		} catch (error) {
			this.logger.error('Error rendering login form', { error });
			next(error);
		}
	};

	public login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		try {
			const request = LoginRequestDTO.fromBody(req.body, req.ip);
			const response = await this.useCase.execute(request);

			const cookieMaxAge = request.rememberMe ? this.COOKIE_MAX_AGE_EXTENDED : this.COOKIE_MAX_AGE;

			res.cookie(this.COOKIE_NAME, response.sessionId, {
				httpOnly: this.config.cookieHttpOnly,
				secure: this.config.isProduction(),
				sameSite: this.config.cookieSameSite,
				maxAge: cookieMaxAge,
				path: '/',
			});

			const returnUrl = typeof req.body.return_url === 'string' ? req.body.return_url : undefined;

			if (returnUrl) {
				// Validate return_url is internal (security: prevent open redirect)
				if (this.isInternalUrl(returnUrl)) {
					this.logger.info('Redirecting after login', { returnUrl, userId: response.user.id });
					return res.redirect(returnUrl);
				} else {
					this.logger.warn('Invalid return_url detected, ignoring', { returnUrl });
					// Fall through to JSON response
				}
			}

			res.status(200).json(response.toJson());
		} catch (error) {
			next(error);
		}
	};

	private isInternalUrl(url: string): boolean {
		// Block protocol-relative URLs and javascript: URLs
		if (url.startsWith('//') || url.toLowerCase().startsWith('javascript:')) {
			return false;
		}

		// Allow relative URLs
		if (url.startsWith('/')) {
			return true;
		}

		// For absolute URLs, check if same origin
		try {
			const urlObj = new URL(url);
			const serviceUrl = new URL(this.config.serviceUrl);

			// Compare protocol, hostname, and port
			return urlObj.protocol === serviceUrl.protocol && urlObj.hostname === serviceUrl.hostname && urlObj.port === serviceUrl.port;
		} catch {
			// Invalid URL format
			return false;
		}
	}
}
