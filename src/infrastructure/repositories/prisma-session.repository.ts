import { InputJsonValue } from '@prisma/client/runtime/client';
import { PrismaClient } from '@prisma/client';

import { DBConfig } from '@config';
import { SessionEntity } from '@domain';
import { handledPrismaError, Injectable, LogContextClass, LogContextMethod } from '@shared';
import { SessionMapper } from '@infrastructure';
import type { ILogger, ISessionRepository } from '@interfaces';

/**
 * Repository implementation for managing session persistence using Prisma ORM.
 *
 * Handles all database operations for session entities including creation, retrieval,
 * deletion, and expiration management. Implements comprehensive logging for all operations
 * and error handling with Prisma-specific error translation.
 *
 * @class SessionRepository
 * @implements {ISessionRepository}
 *
 * @example
 * const repository = new SessionRepository(dbConfig, logger);
 * const session = await repository.findById(sessionId);
 *
 * @throws {PrismaError} Translated Prisma errors for database operation failures
 */

@LogContextClass()
@Injectable({ name: 'SessionRepository', depends: ['DBConfig', 'Logger'] })
export class SessionRepository implements ISessionRepository {
	private readonly client: PrismaClient;
	constructor(
		dbConfig: DBConfig,
		private readonly logger: ILogger
	) {
		this.client = dbConfig.getClient();
	}

	/**
	 * Saves a session entity to the database.
	 * @param session - The session entity to be saved
	 * @throws {PrismaClientError} If the database operation fails
	 * @returns Promise that resolves when the session is successfully saved
	 */

	@LogContextMethod()
	public async save(session: SessionEntity): Promise<void> {
		try {
			await this.client.session.create({ data: { ...session, metadata: session.metadata as InputJsonValue } });
			this.logger.debug('Session saved to database', {
				sessionId: session.id,
				userId: session.userId,
				expiresAt: session.expiresAt.toISOString(),
			});
		} catch (error) {
			this.logger.error('Failed to save session', {
				sessionId: session.id,
				userId: session.userId,
			});
			throw handledPrismaError(error);
		}
	}

	/**
	 * Finds a session by its ID.
	 *
	 * Retrieves a session from the database and maps it to a domain entity.
	 * If the session has expired, it is automatically deleted and null is returned.
	 *
	 * @param sessionId - The unique identifier of the session to find
	 * @returns A promise that resolves to the SessionEntity if found and not expired, or null otherwise
	 * @throws {PrismaClientError} If the database query fails
	 */

	@LogContextMethod()
	public async findById(sessionId: string): Promise<SessionEntity | null> {
		try {
			const session = await this.client.session.findUnique({ where: { id: sessionId } });

			if (!session) {
				this.logger.debug('Session not found', { sessionId });
				return null;
			}

			const entity = SessionMapper.toDomain(session);

			if (entity.isExpired()) {
				this.logger.debug('Session expired, deleting', { sessionId });
				await this.deleteById(sessionId);
				return null;
			}

			this.logger.debug('Session found', {
				sessionId,
				userId: entity.userId,
				remainingSeconds: entity.getRemainingSeconds(),
			});

			return entity;
		} catch (error) {
			this.logger.error('Failed to find session', { sessionId });
			throw handledPrismaError(error);
		}
	}

	/**
	 * Deletes a session from the database by its ID.
	 *
	 * @param sessionId - The unique identifier of the session to delete
	 * @returns A promise that resolves when the session has been deleted
	 * @throws {PrismaError} If a database error occurs other than the session not being found
	 *
	 * @remarks
	 * If the session does not exist (Prisma error code P2025), the method logs a warning
	 * and returns gracefully without throwing an error.
	 */

	@LogContextMethod()
	public async deleteById(sessionId: string): Promise<void> {
		try {
			await this.client.session.delete({ where: { id: sessionId } });
			this.logger.info('Session deleted from database', { sessionId });
		} catch (error) {
			if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
				this.logger.warn('Session not found for deletion', { sessionId });
				return;
			}
			this.logger.error('Failed to delete session', { sessionId });
			throw handledPrismaError(error);
		}
	}

	/**
	 * Deletes all sessions associated with a specific user.
	 * @param userId - The unique identifier of the user whose sessions should be deleted
	 * @returns A promise that resolves when all sessions have been deleted
	 * @throws {PrismaError} If the database operation fails
	 */

	@LogContextMethod()
	public async deleteByUserId(userId: string): Promise<void> {
		try {
			const result = await this.client.session.deleteMany({ where: { userId } });
			this.logger.info('All user sessions deleted', {
				userId,
				sessionsDeleted: result.count,
			});
		} catch (error) {
			this.logger.error('Failed to delete user sessions', { userId });
			throw handledPrismaError(error);
		}
	}

	/**
	 * Removes all expired sessions from the database.
	 *
	 * Deletes sessions where the expiration date is earlier than the current time.
	 * Logs the number of deleted sessions at info level if any were removed,
	 * or at debug level if no expired sessions were found.
	 *
	 * @returns A promise that resolves to the number of sessions that were deleted.
	 * @throws Will throw a handled Prisma error if the database operation fails.
	 */

	@LogContextMethod()
	public async cleanup(): Promise<number> {
		try {
			const now = new Date();
			const result = await this.client.session.deleteMany({ where: { expiresAt: { lt: now } } });
			if (result.count > 0) {
				this.logger.info('Expired sessions cleaned up', {
					deletedCount: result.count,
				});
			} else {
				this.logger.debug('No expired sessions to clean up');
			}

			return result.count;
		} catch (error) {
			this.logger.error('Failed to cleanup expired sessions');
			throw handledPrismaError(error);
		}
	}

	/**
	 * Finds all active sessions for a given user.
	 * @param userId - The unique identifier of the user
	 * @returns A promise that resolves to an array of active session entities
	 * @throws Will throw a handled Prisma error if the database query fails
	 */

	@LogContextMethod()
	public async findByUserId(userId: string): Promise<SessionEntity[]> {
		try {
			const now = new Date();

			const sessions = await this.client.session.findMany({ where: { userId, expiresAt: { gt: now } }, orderBy: { createdAt: 'desc' } });

			this.logger.debug('Found user sessions', {
				userId,
				count: sessions.length,
			});

			return sessions.map((session) => SessionMapper.toDomain(session));
		} catch (error) {
			this.logger.error('Failed to find user sessions', { userId });
			throw handledPrismaError(error);
		}
	}

	/**
	 * Counts the number of active sessions for a given user.
	 * Only sessions that have not expired (expiresAt > current time) are counted.
	 *
	 * @param userId - The ID of the user whose sessions to count
	 * @returns A promise that resolves to the number of active sessions for the user
	 * @throws {PrismaClientError} If the database query fails
	 *
	 * @example
	 * const activeSessionCount = await sessionRepository.countByUserId('user-123');
	 * console.log(activeSessionCount); // 2
	 */

	@LogContextMethod()
	public async countByUserId(userId: string): Promise<number> {
		try {
			const now = new Date();
			const count = await this.client.session.count({ where: { userId, expiresAt: { gt: now } } });
			this.logger.debug('Counted user sessions', { userId, count });
			return count;
		} catch (error) {
			this.logger.error('Failed to count user sessions', { userId });
			throw handledPrismaError(error);
		}
	}

	//TODO documentar
	public async getAuditTrail(_sessionId: string): Promise<unknown[]> {
		throw new Error('Method not implemented.');
	}
}
