import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

import { ConfigError, Injectable } from '@shared';
import type { IConfig, IKeyLoader } from '@interfaces';

/**
 * Service responsible for loading and managing RSA cryptographic keys for JWT operations.
 *
 * This service implements the `IKeyLoader` interface and handles the loading of public and private
 * RSA keys from the file system. Keys are expected to be stored in PEM format in a 'keys' directory
 * at the project root.
 *
 * @implements {IKeyLoader}
 *
 * @remarks
 * - Keys are loaded from `keys/private.pem` and `keys/public.pem` relative to the current working directory
 * - If keys are not found, a `ConfigError` is thrown with instructions to generate them
 * - Keys are loaded once during instantiation and cached for subsequent access
 *
 * @example
 * ```typescript
 * const config: IConfig = { jwtKeyId: 'key-123' };
 * const keyLoader = new KeyLoaderService(config);
 * const privateKey = keyLoader.getPrivateKey();
 * const publicKey = keyLoader.getPublicKey();
 * const keyId = keyLoader.getKeyId();
 * ```
 *
 * @throws {ConfigError} When RSA key files are not found in the expected location
 */

@Injectable({ name: 'KeyLoader', depends: ['Config'] })
export class KeyLoaderService implements IKeyLoader {
	private readonly publicKey: string;
	private readonly privateKey: string;
	private readonly KeyId: string;

	constructor(config: IConfig) {
		const { publicKey, privateKey } = this.loadKeys();
		this.privateKey = privateKey;
		this.publicKey = publicKey;
		this.KeyId = config.jwtKeyId;
	}

	/**
	 * Retrieves the private key.
	 *
	 * @returns The private key as a string.
	 */

	public getPrivateKey(): string {
		return this.privateKey;
	}

	/**
	 * Retrieves the public key.
	 *
	 * @returns The public key as a string.
	 */

	public getPublicKey(): string {
		return this.publicKey;
	}

	/**
	 * Retrieves the key identifier.
	 *
	 * @returns The key ID string.
	 */

	public getKeyId(): string {
		return this.KeyId;
	}

	/**
	 * Loads RSA private and public keys from the file system.
	 *
	 * The method looks for key files in the `keys` directory located at the project root:
	 * - `keys/private.pem` - Private RSA key
	 * - `keys/public.pem` - Public RSA key
	 *
	 * @returns An object containing both the private and public keys as strings
	 * @returns {Object} keys - The loaded RSA key pair
	 * @returns {string} keys.privateKey - The RSA private key in PEM format
	 * @returns {string} keys.publicKey - The RSA public key in PEM format
	 *
	 * @throws {ConfigError} When either the private or public key file is not found.
	 *                       The error message suggests generating keys using: `pnpm generate:keys`
	 *
	 * @private
	 */

	private loadKeys(): { privateKey: string; publicKey: string } {
		const keysDir = join(process.cwd(), 'keys');
		const privatePath = join(keysDir, 'private.pem');
		const publicPath = join(keysDir, 'public.pem');

		if (existsSync(privatePath) && existsSync(publicPath)) {
			return {
				privateKey: readFileSync(privatePath, 'utf-8'),
				publicKey: readFileSync(publicPath, 'utf-8'),
			};
		}

		throw new ConfigError('No se encontraron claves RSA para JWT Genera las claves con: pnpm generate:keys');
	}
}
