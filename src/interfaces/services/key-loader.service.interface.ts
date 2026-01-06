//TODO documentar
declare module '@ServiceMap' {
	interface ServiceMap {
		KeyLoader: IKeyLoader;
	}
}

/**
 * Interface for loading cryptographic keys used in OAuth2 operations.
 *
 * @remarks
 * This interface defines the contract for services that manage and provide
 * access to public/private key pairs and their identifiers, typically used
 * for signing and verifying JWT tokens in OAuth2 flows.
 *
 * @method getPrivateKey - Retrieves the private key as a string.
 * @returns {string} The private key.
 *
 * @method getPublicKey - Retrieves the public key as a string.
 * @returns {string} The public key.
 *
 * @method getKeyId - Retrieves the identifier for the key pair.
 * @returns {string} The key identifier.
 *
 * @public
 */

export interface IKeyLoader {
	getPrivateKey(): string;
	getPublicKey(): string;
	getKeyId(): string;
}
