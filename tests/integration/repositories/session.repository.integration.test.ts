/**
 * Integration tests for SessionRepository
 */

import type { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

import { getPrismaTestClient, closePrismaTestClient } from '../../helpers/prisma-test-client.js';
import { cleanDatabase, seedTestDatabase } from '../../helpers/database-helper.js';

import { SessionEntity } from '@domain';
import type { ILogger } from '@interfaces';
import { SessionRepository } from '@infrastructure';
import { DBConfig } from '@config';

describe('SessionRepository - Integration Tests', () => {
	let prisma: PrismaClient;
	let dbConfig: DBConfig;
	let repository: SessionRepository;
	let logger: ILogger;
	let testUserId: string;

	beforeAll(async () => {
		prisma = await getPrismaTestClient();
		logger = {
			debug: vi.fn(),
			error: vi.fn(),
			info: vi.fn(),
			warn: vi.fn(),
			log: vi.fn(),
			child: vi.fn(() => logger),
		} as unknown as ILogger;

		// Create a mock DBConfig that returns the test prisma client
		dbConfig = {
			getClient: () => prisma,
		} as unknown as DBConfig;

		repository = new SessionRepository(dbConfig, logger);
	});

	beforeEach(async () => {
		await cleanDatabase(prisma);
		const { testUser } = await seedTestDatabase(prisma);
		testUserId = testUser.id;
		vi.clearAllMocks();
	});

	afterAll(async () => {
		await closePrismaTestClient();
	});

	// ============================================================================
	// HELPER
	// ============================================================================

	function createTestSession(options: {
		userId?: string;
		expiresInMs?: number;
	} = {}): SessionEntity {
		const expiresAt = new Date(Date.now() + (options.expiresInMs || 3600000)); // 1h default

		return SessionEntity.create({
			id: randomUUID(),
			userId: options.userId || testUserId,
			expiresAt,
		});
	}

	// ============================================================================
	// TESTS: save()
	// ============================================================================

	describe('save()', () => {
		it('should save a new session successfully', async () => {
			// Arrange
			const session = createTestSession();

			// Act
			await repository.save(session);

			// Assert
			const saved = await prisma.session.findUnique({
				where: { id: session.id },
			});

			expect(saved).toBeDefined();
			expect(saved?.userId).toBe(testUserId);
			expect(saved?.expiresAt.getTime()).toBe(session.expiresAt.getTime());
		});

		it('should allow multiple sessions for same user', async () => {
			// Arrange
			const session1 = createTestSession();
			const session2 = createTestSession();

			// Act
			await repository.save(session1);
			await repository.save(session2);

			// Assert
			const sessions = await prisma.session.findMany({
				where: { userId: testUserId },
			});

			expect(sessions).toHaveLength(2);
		});
	});

	// ============================================================================
	// TESTS: findById()
	// ============================================================================

	describe('findById()', () => {
		it('should find session by ID', async () => {
			// Arrange
			const session = createTestSession();
			await repository.save(session);

			// Act
			const found = await repository.findById(session.id);

			// Assert
			expect(found).toBeDefined();
			expect(found?.id).toBe(session.id);
			expect(found?.userId).toBe(testUserId);
		});

		it('should return null if session does not exist', async () => {
			// Act
			const found = await repository.findById('non-existent-id');

			// Assert
			expect(found).toBeNull();
		});

		it('should find expired session', async () => {
			// Arrange - Create expired session
			const session = createTestSession({ expiresInMs: -1000 }); // Expired 1s ago
			await repository.save(session);

			// Act
			const found = await repository.findById(session.id);

			// Assert - Should return null and delete expired session automatically
			expect(found).toBeNull();

			// Verify session was deleted
			const deleted = await prisma.session.findUnique({
				where: { id: session.id },
			});
			expect(deleted).toBeNull();
		});
	});

	// ============================================================================
	// TESTS: findByUserId()
	// ============================================================================

	describe('findByUserId()', () => {
		it('should find all sessions for a user', async () => {
			// Arrange
			const session1 = createTestSession();
			const session2 = createTestSession();
			await repository.save(session1);
			await repository.save(session2);

			// Act
			const sessions = await repository.findByUserId(testUserId);

			// Assert
			expect(sessions).toHaveLength(2);
			expect(sessions.map(s => s.id)).toContain(session1.id);
			expect(sessions.map(s => s.id)).toContain(session2.id);
		});

		it('should return empty array if user has no sessions', async () => {
			// Act
			const sessions = await repository.findByUserId(testUserId);

			// Assert
			expect(sessions).toEqual([]);
		});

		it('should not include expired sessions', async () => {
			// Arrange
			const activeSession = createTestSession({ expiresInMs: 3600000 });
			const expiredSession = createTestSession({ expiresInMs: -1000 });

			await repository.save(activeSession);
			await repository.save(expiredSession);

			// Act
			const sessions = await repository.findByUserId(testUserId);

			// Assert - Should return only active sessions
			expect(sessions).toHaveLength(1);
			expect(sessions[0].id).toBe(activeSession.id);
		});
	});

	// ============================================================================
	// TESTS: delete()
	// ============================================================================

	describe('deleteById()', () => {
		it('should delete a session by ID', async () => {
			// Arrange
			const session = createTestSession();
			await repository.save(session);

			// Act
			await repository.deleteById(session.id);

			// Assert
			const deleted = await prisma.session.findUnique({
				where: { id: session.id },
			});

			expect(deleted).toBeNull();
		});

		it('should be idempotent (deleting twice should not fail)', async () => {
			// Arrange
			const session = createTestSession();
			await repository.save(session);

			// Act - Delete twice
			await repository.deleteById(session.id);
			await repository.deleteById(session.id);

			// Assert - Should not throw
			const deleted = await prisma.session.findUnique({
				where: { id: session.id },
			});
			expect(deleted).toBeNull();
		});
	});

	// ============================================================================
	// TESTS: deleteByUserId()
	// ============================================================================

	describe('deleteByUserId()', () => {
		it('should delete all sessions for a user', async () => {
			// Arrange
			const session1 = createTestSession();
			const session2 = createTestSession();
			const session3 = createTestSession();

			await repository.save(session1);
			await repository.save(session2);
			await repository.save(session3);

			// Verify they exist
			const beforeDelete = await prisma.session.count({
				where: { userId: testUserId },
			});
			expect(beforeDelete).toBe(3);

			// Act
			await repository.deleteByUserId(testUserId);

			// Assert
			const afterDelete = await prisma.session.count({
				where: { userId: testUserId },
			});
			expect(afterDelete).toBe(0);
		});

		it('should not delete sessions of other users', async () => {
			// Arrange - Create second user
			const otherUser = await prisma.user.create({
				data: {
					email: 'other@test.com',
					username: 'otheruser',
					passwordHash: 'hash',
					roles: ['user'],
				},
			});

			const session1 = createTestSession({ userId: testUserId });
			const session2 = createTestSession({ userId: otherUser.id });

			await repository.save(session1);
			await repository.save(session2);

			// Act - Delete only testUserId sessions
			await repository.deleteByUserId(testUserId);

			// Assert
			const testUserSessions = await prisma.session.count({
				where: { userId: testUserId },
			});
			const otherUserSessions = await prisma.session.count({
				where: { userId: otherUser.id },
			});

			expect(testUserSessions).toBe(0);
			expect(otherUserSessions).toBe(1);
		});
	});

	// ============================================================================
	// TESTS: cleanup()
	// ============================================================================

	describe('cleanup()', () => {
		it('should delete only expired sessions', async () => {
			// Arrange
			const activeSession1 = createTestSession({ expiresInMs: 3600000 }); // 1h future
			const activeSession2 = createTestSession({ expiresInMs: 7200000 }); // 2h future
			const expiredSession1 = createTestSession({ expiresInMs: -1000 }); // 1s ago
			const expiredSession2 = createTestSession({ expiresInMs: -2000 }); // 2s ago

			await repository.save(activeSession1);
			await repository.save(activeSession2);
			await repository.save(expiredSession1);
			await repository.save(expiredSession2);

			// Act
			const deletedCount = await repository.cleanup();

			// Assert
			const remaining = await prisma.session.findMany({
				where: { userId: testUserId },
			});

			expect(deletedCount).toBe(2);
			expect(remaining).toHaveLength(2);
			expect(remaining.map(s => s.id)).toContain(activeSession1.id);
			expect(remaining.map(s => s.id)).toContain(activeSession2.id);
		});

		it('should not delete active sessions', async () => {
			// Arrange
			const activeSession = createTestSession({ expiresInMs: 3600000 });
			await repository.save(activeSession);

			// Act
			await repository.cleanup();

			// Assert
			const found = await prisma.session.findUnique({
				where: { id: activeSession.id },
			});

			expect(found).toBeDefined();
		});
	});

	// ============================================================================
	// TESTS: CASCADE Behavior
	// ============================================================================

	describe('CASCADE Behavior', () => {
		it('should CASCADE delete when user is deleted', async () => {
			// Arrange
			const session = createTestSession();
			await repository.save(session);

			// Verify session exists
			const beforeDelete = await prisma.session.findUnique({
				where: { id: session.id },
			});
			expect(beforeDelete).toBeDefined();

			// Act - Delete user (should cascade to sessions)
			await prisma.user.delete({
				where: { id: testUserId },
			});

			// Assert - Session should be deleted
			const afterDelete = await prisma.session.findUnique({
				where: { id: session.id },
			});
			expect(afterDelete).toBeNull();
		});
	});
});
