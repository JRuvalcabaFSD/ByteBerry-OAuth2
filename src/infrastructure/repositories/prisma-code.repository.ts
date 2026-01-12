import { PrismaClient } from '@prisma/client';

import { DBConfig } from '@config';
import { CodeEntity } from '@domain';
import { CodeMapper } from '@infrastructure';
import type { ICodeRepository, ILogger } from '@interfaces';
import { getErrMessage, handledPrismaError, Injectable, LogContextClass, LogContextMethod } from '@shared';

/**
 * Repository for managing OAuth2 authorization codes.
 *
 * Implements data persistence operations for authorization codes using Prisma ORM.
 * Handles CRUD operations and provides error handling with logging.
 *
 * @implements {ICodeRepository}
 *
 * @example
 * ```typescript
 * const codeRepository = new CodeRepository(dbConfig, logger);
 * await codeRepository.save(codeEntity);
 * const code = await codeRepository.findByCode('auth_code_123');
 * ```
 */

@LogContextClass()
@Injectable({ name: 'CodeRepository', depends: ['DBConfig', 'Logger'] })
export class CodeRepository implements ICodeRepository {
	private readonly client: PrismaClient;

	constructor(
		dbConfig: DBConfig,
		private readonly logger: ILogger
	) {
		this.client = dbConfig.getClient();
	}

	/**
	 * Saves or updates an authorization code in the database.
	 *
	 * @param code - The code entity to save
	 * @returns A promise that resolves when the code has been saved
	 * @throws {PrismaError} If the database operation fails
	 *
	 * @example
	 * const code = new CodeEntity(...)
	 * await repository.save(code)
	 */

	@LogContextMethod()
	public async save(code: CodeEntity): Promise<void> {
		const now = new Date();

		try {
			await this.client.authorizationCode.upsert({
				where: { code: code.code },
				update: {
					used: code.isUsed(),
					usedAt: code.isUsed() ? now : null,
					expiresAt: code.expiresAt,
				},
				create: {
					code: code.code,
					userId: code.userId,
					clientId: code.clientId.getValue(), // Usando el Value Object
					redirectUri: code.redirectUri,
					codeChallenge: code.codeChallenge.getChallenge(),
					codeChallengeMethod: code.codeChallenge.getMethod(),
					scope: code.scope,
					state: code.state,
					expiresAt: code.expiresAt,
					used: code.isUsed(),
					usedAt: code.isUsed() ? now : null,
					createdAt: now,
				},
			});
			this.logger.info('Authorization code saved successfully', {
				code: code.code,
			});
		} catch (error) {
			this.logger.error('Failed to save authorization code', { code: code.code, error: getErrMessage(error) });
			throw handledPrismaError(error);
		}
	}

	/**
	 * Finds an authorization code by its code value.
	 * @param code - The authorization code string to search for
	 * @returns A promise that resolves to a CodeEntity if found, or null if not found
	 * @throws {PrismaClientError} If a database error occurs during the query
	 */

	@LogContextMethod()
	public async findByCode(code: string): Promise<CodeEntity | null> {
		try {
			const authCode = await this.client.authorizationCode.findUnique({ where: { code }, include: { user: true, client: true } });
			if (!authCode) {
				this.logger.debug('Authorization code not found', { code });
				return null;
			}

			return CodeMapper.toEntity(authCode);
		} catch (error) {
			this.logger.error('Failed to find authorization code', { code, error: getErrMessage(error) });
			throw handledPrismaError(error);
		}
	}

	/**
	 * Cleans up expired and used authorization codes from the database.
	 *
	 * Deletes all authorization codes that have exceeded their expiration time or have been marked as used.
	 * Logs detailed information about the cleanup operation including counts of deleted records.
	 *
	 * @throws {PrismaError} If the database operation fails, a handled Prisma error is thrown.
	 *
	 * @returns {Promise<void>} A promise that resolves when the cleanup operation is complete.
	 */

	@LogContextMethod()
	public async cleanup(): Promise<void> {
		try {
			this.logger.debug('Starting authorization codes cleanup');

			const now = new Date();

			const expiredResult = await this.client.authorizationCode.deleteMany({ where: { expiresAt: { lte: now } } });
			const usedResult = await this.client.authorizationCode.deleteMany({ where: { used: true } });

			const totalDeleted = expiredResult.count + usedResult.count;
			this.logger.info('Authorization codes cleanup completed', {
				expiredDeleted: expiredResult.count,
				usedDeleted: usedResult.count,
				totalDeleted,
			});
		} catch (error) {
			this.logger.error('Failed to cleanup authorization codes', { error: getErrMessage(error) });
			throw handledPrismaError(error);
		}
	}
}
