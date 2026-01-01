import env from 'env-var';
import pkg from '../../package.json' with { type: 'json' };

import { IConfig, NodeEnv } from '@interfaces';
import { ConfigError, getErrMessage } from '@shared';
import { Injectable } from 'src/shared/decorators/injectable.decorator.js';

//TODO documentar
@Injectable({ name: 'Config' })
export class Config implements IConfig {
	//Code environments
	public readonly nodeEnv: NodeEnv;
	public readonly port: number;
	public readonly version: string;
	public readonly serviceName: string;
	public readonly serviceUrl: string;

	constructor() {
		try {
			// ========================================
			// Core environments
			// ========================================
			this.nodeEnv = env.get('NODE_ENV').default('development').asEnum(['development', 'production', 'test']) as NodeEnv;
			this.port = env.get('PORT').default('4000').asPortNumber();
			this.version = pkg.version ?? '0.0.0';
			this.serviceName = env.get('SERVICE_NAME').default('ByteBerry-OAuth2').asString();
			this.serviceUrl = this.normalizeUrls(env.get('SERVICE_URL').default('http://localhost').asUrlString());
		} catch (error) {
			throw new ConfigError(`Failed to validate environment variables ${getErrMessage(error)}}`, this.generateContext());
		}
	}

	/**
	 * Determines if the current environment is set to 'development'.
	 *
	 * @returns {boolean} `true` if the environment is 'development'; otherwise, `false`.
	 */

	public isDevelopment(): boolean {
		return this.nodeEnv === 'development';
	}

	/**
	 * Determines if the current environment is set to production.
	 *
	 * @returns {boolean} `true` if the environment is 'production', otherwise `false`.
	 */

	public isProduction(): boolean {
		return this.nodeEnv === 'production';
	}

	/**
	 * Determines if the current environment is set to 'test'.
	 *
	 * @returns {boolean} True if the environment is 'test'; otherwise, false.
	 */

	public isTest(): boolean {
		return this.nodeEnv === 'test';
	}

	/**
	 * Generates a context object containing selected environment variables,
	 * formatted as PascalCase keys prefixed with 'provider'. Sensitive values
	 * (those whose keys include 'key', 'secret', 'token', or 'password') are
	 * redacted as '[REDACTED]'.
	 *
	 * @returns {Record<string, string>} An object mapping PascalCase environment variable keys
	 * prefixed with 'provider' to their corresponding values or '[REDACTED]' if sensitive.
	 *
	 * @example
	 * // Given process.env = { NODE_ENV: 'production', API_KEY: '12345' }
	 * // The output will be:
	 * // {
	 * //   providerNodeEnv: 'production',
	 * //   providerApiKey: '[REDACTED]'
	 * // }
	 */

	private generateContext(): Record<string, string> {
		const envs = ['NODE_ENV', 'PORT', 'SERVICE_NAME', 'SERVICE_URL'] as const;
		const sensitiveKeywords = ['key', 'secret', 'token', 'password'];

		return envs.reduce(
			(context, key) => {
				const pascalCase = key
					.toLowerCase()
					.split('_')
					.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
					.join('');

				const contextKey = `provider${pascalCase}`;

				const isSensitive = sensitiveKeywords.some((sk) => key.toLocaleLowerCase().includes(sk.toLocaleLowerCase()));

				context[contextKey] = isSensitive ? '[REDACTED]' : (process.env[key] ?? '');

				return context;
			},
			{} as Record<string, string>
		);
	}

	/**
	 * Normalizes URL(s) by standardizing protocol, hostname, and pathname formatting.
	 *
	 * This method performs the following normalizations:
	 * - Converts protocol to lowercase (e.g., "HTTP://" → "http://")
	 * - Converts hostname to lowercase (e.g., "Example.COM" → "example.com")
	 * - Removes trailing slashes from pathnames (except root "/")
	 * - Trims whitespace and removes any remaining trailing slashes
	 *
	 * @template T - The input type, either a single string or an array of strings
	 * @param input - A single URL string or an array of URL strings to normalize
	 * @returns The normalized URL(s) in the same format as the input (string or array)
	 *
	 * @example
	 * ```typescript
	 * // Single URL
	 * normalizeUrls("HTTPS://Example.COM/path/") // Returns: "https://example.com/path"
	 *
	 * // Multiple URLs
	 * normalizeUrls(["HTTP://API.Example.com/", "HTTPS://WWW.TEST.COM/endpoint/"])
	 * // Returns: ["http://api.example.com", "https://www.test.com/endpoint"]
	 * ```
	 *
	 * @remarks
	 * If a URL cannot be parsed (invalid format), a warning is logged to the console
	 * and the original URL string is returned unchanged.
	 */

	private normalizeUrls<T extends string | string[]>(input: T): T {
		// Helper function to normalize a single URL
		const normalizeSingleUrl = (url: string): string => {
			try {
				const parsed = new URL(url);
				parsed.protocol = parsed.protocol.toLowerCase();
				parsed.hostname = parsed.hostname.toLowerCase();
				if (parsed.pathname.endsWith('/') && parsed.pathname !== '/') {
					parsed.pathname = parsed.pathname.slice(0, -1);
				}
				return parsed.toString().trim().replace(/\/+$/, '');
			} catch (error) {
				// eslint-disable-next-line no-console
				console.warn(`Invalid URL skipped for normalization: ${url}`, error);
				return url;
			}
		};

		// Handle single URL string or array of URLs
		if (typeof input === 'string') {
			return normalizeSingleUrl(input) as T;
		}

		return input.reduce<string[]>((acc, url) => {
			acc.push(normalizeSingleUrl(url));
			return acc;
		}, []) as T;
	}
}
