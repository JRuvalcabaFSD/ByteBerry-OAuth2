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
			const consent = await this.client.userConsent.findFirst({ where: { userId, clientId, revokedAt: null } });

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
	 * If an active consent (non-revoked) already exists for the same user and client,
	 * it will be automatically revoked before creating the new consent record.
	 * This ensures only one active consent per user-client combination.
	 *
	 * @param consent - The consent entity to save
	 * @returns A promise that resolves when the consent has been saved
	 * @throws {PrismaError} If a database error occurs during the save operation
	 */

	public async save(consent: ConsentEntity): Promise<void> {
		this.logger.debug('Saving consent', { consentId: consent.id, userId: consent.userId, clientId: consent.clientId });

		try {
			// Search if you have active consents and we revoke them and create a new one.
			const existingActiveConsent = await this.client.userConsent.findFirst({
				where: { userId: consent.userId, clientId: consent.clientId, revokedAt: null },
			});

			if (existingActiveConsent) {
				this.logger.info('Auto-revoking existing active consent before creating new one', {
					existingConsentId: existingActiveConsent.id,
					newConsentId: consent.id,
					userId: consent.userId,
					clientId: consent.clientId,
					reason: 're-authorization',
				});

				await this.client.userConsent.update({ where: { id: existingActiveConsent.id }, data: { revokedAt: new Date() } });
			}

			// Create a new consent.
			this.logger.debug('Creating new consent record', {
				consentId: consent.id,
				replacedConsentId: existingActiveConsent?.id,
			});

			await this.client.userConsent.create({
				data: {
					id: consent.id,
					userId: consent.userId,
					clientId: consent.clientId,
					scopes: consent.scopes,
					grantedAt: consent.grantedAt,
					expiresAt: consent.expiresAt,
					revokedAt: consent.revokedAt,
				},
			});

			this.logger.info('New consent created successfully', {
				consentId: consent.id,
				userId: consent.userId,
				clientId: consent.clientId,
				scopes: consent.scopes,
				autoRevokedPrevious: !!existingActiveConsent,
			});
		} catch (error) {
			this.logger.error('Error saving consent', { consentId: consent.id, error: getErrMessage(error) });
			throw handledPrismaError(error);
		}
	}

	/**
	 * Finds all active (non-revoked) consents for a given user.
	 * @param userId - The ID of the user whose consents to retrieve
	 * @returns A promise that resolves to an array of ConsentEntity objects ordered by grant date (newest first), or null if no consents are found
	 * @throws Will throw a handled Prisma error if the database query fails
	 */

	public async findByUserId(userId: string): Promise<ConsentEntity[] | null> {
		this.logger.debug('Finding consents by user ID', { userId });

		try {
			const consents = await this.client.userConsent.findMany({
				where: { userId, revokedAt: null },
				orderBy: { grantedAt: 'desc' },
			});

			this.logger.debug('Consents found', { userId, count: consents.length });

			return consents.map((consent) =>
				ConsentEntity.create({
					id: consent.id,
					userId: consent.userId,
					clientId: consent.clientId,
					scopes: consent.scopes,
					grantedAt: consent.grantedAt,
					expiresAt: consent.expiresAt,
					revokedAt: consent.revokedAt,
				})
			);
		} catch (error) {
			this.logger.error('Error finding consents by user ID', {
				userId,
				error: getErrMessage(error),
			});
			throw handledPrismaError(error);
		}
	}

	/**
	 * Revokes a user consent by marking it as revoked.
	 *
	 * @param consentId - The unique identifier of the consent to revoke
	 * @returns A promise that resolves when the consent has been successfully revoked
	 * @throws {PrismaClientError} If a Prisma database error occurs during the revocation
	 *
	 * @example
	 * ```typescript
	 * await consentRepository.revokeConsent('consent-123');
	 * ```
	 */

	public async revokeConsent(consentId: string): Promise<void> {
		this.logger.debug('Revoking consent', { consentId });

		try {
			await this.client.userConsent.update({
				where: { id: consentId },
				data: {
					revokedAt: new Date(),
				},
			});

			this.logger.info('Consent revoked successfully', { consentId });
		} catch (error) {
			this.logger.error('Error revoking consent', {
				consentId,
				error: getErrMessage(error),
			});
			throw handledPrismaError(error);
		}
	}

	/**
	 * Finds a consent record by its ID.
	 * @param consentId - The unique identifier of the consent to retrieve
	 * @returns A promise that resolves to the ConsentEntity if found, or null if not found
	 * @throws {PrismaError} If a database error occurs during the query
	 */

	@LogContextMethod()
	public async findById(consentId: string): Promise<ConsentEntity | null> {
		this.logger.debug('Finding consent by ID', { consentId });

		try {
			const consent = await this.client.userConsent.findUnique({ where: { id: consentId } });
			if (!consent) {
				this.logger.debug('Consent not found', { consentId });
				return null;
			}

			this.logger.debug('Consent found', { consentId, userId: consent.userId });

			return ConsentEntity.create({
				id: consent.id,
				userId: consent.userId,
				clientId: consent.clientId,
				scopes: consent.scopes,
				grantedAt: consent.grantedAt,
				expiresAt: consent.expiresAt,
				revokedAt: consent.revokedAt,
			});
		} catch (error) {
			this.logger.error('Error finding consent by ID', {
				consentId,
				error: getErrMessage(error),
			});
			throw handledPrismaError(error);
		}
	}
}
