import { ConsentEntity } from '@domain';

//TODO documentar
declare module '@ServiceMap' {
	interface ServiceMap {
		ConsentRepository: IConsentRepository;
	}
}

/**
 * Repository interface for managing user consent records.
 * Handles operations related to storing, retrieving, and revoking user consents
 * for OAuth2 client applications.
 */

export interface IConsentRepository {
	/**
	 * Finds a consent record by user ID and client ID.
	 * @param userId - The unique identifier of the user
	 * @param clientId - The unique identifier of the OAuth2 client
	 * @returns A promise that resolves to the consent entity if found, otherwise null
	 */

	findByUserAndClient(userId: string, clientId: string): Promise<ConsentEntity | null>;

	/**
	 * Saves a new or updated consent record.
	 * @param consent - The consent entity to be persisted
	 * @returns A promise that resolves when the consent has been saved
	 */

	save(consent: ConsentEntity): Promise<void>;

	/**
	 * Finds all consent records associated with a specific user.
	 * @param userId - The unique identifier of the user
	 * @returns A promise that resolves to an array of consent entities, or null if none are found
	 */

	findByUserId(userId: string): Promise<ConsentEntity[] | null>;

	/**
	 * Revokes a consent record by its ID.
	 * @param consentId - The unique identifier of the consent to revoke
	 * @returns A promise that resolves when the consent has been revoked
	 */

	revokeConsent(consentId: string): Promise<void>;

	/**
	 * Finds a consent record by its ID.
	 * @param consentId - The unique identifier of the consent
	 * @returns A promise that resolves to the consent entity if found, otherwise null
	 */

	findById(consentId: string): Promise<ConsentEntity | null>;
}
