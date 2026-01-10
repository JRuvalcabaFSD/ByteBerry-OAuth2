import type { PrismaClient } from '@prisma/client';

import { DBConfig } from '@config';
import { ConsentEntity } from '@domain';
import type { IConsentRepository, ILogger } from '@interfaces';
import { getErrMessage, handledPrismaError, Injectable, LogContextClass, LogContextMethod } from '@shared';

/**
 * Repository for managing user consent data in the OAuth2 infrastructure layer.
 *
 * Handles persistence and retrieval of consent records between users and OAuth2 clients,
 * including support for consent revocation tracking. Implements the {@link IConsentRepository} interface.
 *
 * @remarks
 * - Uses Prisma ORM for database operations with the `userConsent` model
 * - Logs all operations for audit and debugging purposes
 * - Returns `null` for revoked or non-existent consents
 * - Throws {@link handledPrismaError} on database operation failures
 *
 * @example
 * ```typescript
 * const consent = await consentRepository.findByUserAndClient(userId, clientId);
 * if (consent) {
 *   // User has active consent for this client
 * }
 * ```
 */

@LogContextClass()
@Injectable({ name: 'ConsentRepository', depends: ['DBConfig', 'Logger'] })
export class ConsentRepository implements IConsentRepository {
	private readonly client: PrismaClient;

	constructor(
		dbConfig: DBConfig,
		private readonly logger: ILogger
	) {
		this.client = dbConfig.getClient();
	}

	/**
	 * Finds an active consent record for a specific user and OAuth2 client.
	 *
	 * @param userId - The unique identifier of the user
	 * @param clientId - The unique identifier of the OAuth2 client
	 * @returns A promise that resolves to the ConsentEntity if an active consent exists,
	 *          or null if no consent is found or if the consent has been revoked
	 * @throws {PrismaError} If a database error occurs during the query
	 *
	 * @example
	 * const consent = await repository.findByUserAndClient('user-123', 'client-456');
	 * if (consent) {
	 *   console.log('User has active consent for this client');
	 * }
	 */

	@LogContextMethod()
	public async findByUserAndClient(userId: string, clientId: string): Promise<ConsentEntity | null> {
		this.logger.debug('Finding consent by user and client', { userId, clientId });

		try {
			const consent = await this.client.userConsent.findUnique({ where: { userId_clientId: { userId, clientId } } });
			if (!consent) {
				this.logger.debug('No consent found', { userId, clientId });
				return null;
			}

			if (consent.revokedAt !== null) {
				this.logger.debug('Consent found but revoked', { userId, clientId, revokedAt: consent.revokedAt });
				return null;
			}

			this.logger.debug('Active consent found', { userId, clientId, consentId: consent.id });

			return ConsentEntity.create({ ...consent });
		} catch (error) {
			this.logger.error('Error finding consent', { userId, clientId, error: getErrMessage(error) });
			throw handledPrismaError(error);
		}
	}
	/**
	 * Saves a consent entity to the database.
	 *
	 * Creates a new consent record if it doesn't exist, or updates an existing one
	 * based on the userId and clientId combination.
	 *
	 * @param consent - The consent entity to save
	 * @throws {PrismaError} If the database operation fails
	 * @returns A promise that resolves when the consent has been saved
	 */

	@LogContextMethod()
	public async save(consent: ConsentEntity): Promise<void> {
		this.logger.debug('Saving consent', { consentId: consent.id, userId: consent.userId, clientId: consent.clientId });

		try {
			await this.client.userConsent.upsert({
				where: { userId_clientId: { userId: consent.userId, clientId: consent.clientId } },
				update: { scopes: consent.scopes, grantedAt: consent.grantedAt, expiresAt: consent.expiresAt, revokedAt: consent.revokedAt },
				create: { ...consent },
			});

			this.logger.info('Consent saved successfully', { consentId: consent.id, userId: consent.userId, clientId: consent.clientId });
		} catch (error) {
			this.logger.error('Error saving consent', { consentId: consent.id, error: getErrMessage(error) });
			throw handledPrismaError(error);
		}
	}

	//TODO documentar
	public async findByUserId(userId: string): Promise<ConsentEntity | null> {
		this.logger.warn('findByUserId called but not implemented in F2', { userId });
		throw new Error('Method not implemented in F2 - available in F3');
	}

	//TODO documentar
	public async revokeConsent(consentId: string): Promise<void> {
		this.logger.warn('revokeConsent called but not implemented in F2', { consentId });
		throw new Error('Method not implemented in F2 - available in F3');
	}
}
