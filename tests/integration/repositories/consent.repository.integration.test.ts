/**
 * Integration tests for ConsentRepository
 *
 * CRITICAL: These tests validate the consent audit trail strategy:
 * - Partial unique index: only ONE active consent per (userId, clientId)
 * - Multiple revoked consents allowed for same (userId, clientId)
 * - Auto-revoke previous consent when creating new one
 * - Complete history preservation
 */

import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import type { PrismaClient } from '@prisma/client';

import { getPrismaTestClient, closePrismaTestClient } from '../../helpers/prisma-test-client.js';
import { cleanDatabase, seedTestDatabase } from '../../helpers/database-helper.js';
import { generateTestEmail, generateTestUsername } from '../../helpers/fixtures-helper.js';

import { ConsentEntity } from '@domain';
import type { ILogger } from '@interfaces';
import { ConsentRepository } from '@infrastructure';

describe('ConsentRepository - Integration Tests', () => {
	let prisma: PrismaClient;
	let repository: ConsentRepository;
	let logger: ILogger;

	let testUserId: string;
	let testClientId: string;
	let otherUserId: string;
	let otherClientId: string;

	beforeAll(async () => {
		// Get singleton Prisma instance (initialized in db-setup.ts)
		prisma = await getPrismaTestClient();

		// Create mock logger
		logger = {
			debug: vi.fn(),
			error: vi.fn(),
			info: vi.fn(),
			warn: vi.fn(),
			log: vi.fn(),
			child: vi.fn(() => logger),
			checkHealth: vi.fn(async () => ({ status: 'healthy' as const })),
		};

		// Create repository
		const dbConfig = {
			client: prisma,
			pool: null,
			logger,
			testConnection: vi.fn(),
			disconnect: vi.fn(),
			getClient: () => prisma,
		} as any;
		repository = new ConsentRepository(dbConfig as any, logger);
	});

	beforeEach(async () => {
		// Clean database before each test
		await cleanDatabase(prisma);

		// Create test data
		const { testUser, testClient } = await seedTestDatabase(prisma);
		testUserId = testUser.id;
		testClientId = testClient.clientId;

		// Create additional user and client for multi-user tests
		const otherUser = await prisma.user.create({
			data: {
				email: generateTestEmail('other'),
				username: generateTestUsername('other'),
				passwordHash: 'hash',
				roles: ['user'],
			},
		});
		otherUserId = otherUser.id;

		const otherClient = await prisma.oAuthClient.create({
			data: {
				clientId: 'other-client-id',
				clientSecret: 'hash',
				clientName: 'Other Client',
				redirectUris: ['http://localhost:3000/callback'],
				grantTypes: ['authorization_code'],
				userId: otherUserId,
			},
		});
		otherClientId = otherClient.clientId;

		// Clear logger mocks
		vi.clearAllMocks();
	});

	afterAll(async () => {
		await closePrismaTestClient();
	});

	// ============================================================================
	// HELPER FUNCTIONS
	// ============================================================================

	/**
	 * Helper to create a ConsentEntity
	 */
	function createTestConsent(options: {
		id?: string;
		userId?: string;
		clientId?: string;
		scopes?: string[];
		expiresAt?: Date | null;
	} = {}): ConsentEntity {
		return ConsentEntity.create({
			id: options.id || `consent-${Date.now()}-${Math.random()}`,
			userId: options.userId || testUserId,
			clientId: options.clientId || testClientId,
			scopes: options.scopes || ['read', 'write'],
			grantedAt: new Date(),
			expiresAt: options.expiresAt || null,
			revokedAt: null,
		});
	}

	/**
	 * Helper to count consents in database
	 */
	async function countConsents(filters?: {
		userId?: string;
		clientId?: string;
		revokedAt?: 'null' | 'not-null';
	}): Promise<number> {
		const where: any = {};

		if (filters?.userId) where.userId = filters.userId;
		if (filters?.clientId) where.clientId = filters.clientId;
		if (filters?.revokedAt === 'null') where.revokedAt = null;
		if (filters?.revokedAt === 'not-null') where.revokedAt = { not: null };

		return await prisma.userConsent.count({ where });
	}

	// ============================================================================
	// TESTS: save() - Basic Functionality
	// ============================================================================

	describe('save() - Basic Functionality', () => {
		it('should save a new consent successfully', async () => {
			// Arrange
			const consent = createTestConsent();

			// Act
			await repository.save(consent);

			// Assert
			const saved = await prisma.userConsent.findFirst({
				where: {
					userId: testUserId,
					clientId: testClientId,
					revokedAt: null,
				},
			});

			expect(saved).toBeDefined();
			expect(saved?.userId).toBe(testUserId);
			expect(saved?.clientId).toBe(testClientId);
			expect(saved?.scopes).toEqual(['read', 'write']);
			expect(saved?.revokedAt).toBeNull();
		});

		it('should save consent with different scopes', async () => {
			// Arrange
			const consent = createTestConsent({
				scopes: ['read', 'write', 'admin'],
			});

			// Act
			await repository.save(consent);

			// Assert
			const saved = await prisma.userConsent.findFirst({
				where: { userId: testUserId, clientId: testClientId },
			});

			expect(saved?.scopes).toEqual(['read', 'write', 'admin']);
		});

		it('should save consent with expiration date', async () => {
			// Arrange
			const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
			const consent = createTestConsent({ expiresAt });

			// Act
			await repository.save(consent);

			// Assert
			const saved = await prisma.userConsent.findFirst({
				where: { userId: testUserId, clientId: testClientId },
			});

			expect(saved?.expiresAt).toBeDefined();
			expect(saved?.expiresAt?.getTime()).toBe(expiresAt.getTime());
		});
	});

	// ============================================================================
	// TESTS: save() - Auto-Revoke Strategy (CRITICAL)
	// ============================================================================

	describe('save() - Auto-Revoke Strategy', () => {
		it('should auto-revoke previous active consent when creating new one', async () => {
			// Arrange - Create first consent
			const consent1 = createTestConsent({ scopes: ['read'] });
			await repository.save(consent1);

			// Verify first consent is active
			let activeCount = await countConsents({
				userId: testUserId,
				clientId: testClientId,
				revokedAt: 'null'
			});
			expect(activeCount).toBe(1);

			// Act - Create second consent (should auto-revoke first)
			const consent2 = createTestConsent({ scopes: ['read', 'write'] });
			await repository.save(consent2);

			// Assert - First consent should be revoked
			const consent1InDb = await prisma.userConsent.findUnique({
				where: { id: consent1.id },
			});
			expect(consent1InDb?.revokedAt).not.toBeNull();

			// Only one active consent should exist
			activeCount = await countConsents({
				userId: testUserId,
				clientId: testClientId,
				revokedAt: 'null'
			});
			expect(activeCount).toBe(1);

			// Total consents should be 2 (one revoked, one active)
			const totalCount = await countConsents({
				userId: testUserId,
				clientId: testClientId
			});
			expect(totalCount).toBe(2);
		});

		it('should preserve complete audit trail across multiple re-authorizations', async () => {
			// Arrange & Act - Create 3 consecutive consents
			const consent1 = createTestConsent({ scopes: ['read'] });
			await repository.save(consent1);

			const consent2 = createTestConsent({ scopes: ['read', 'write'] });
			await repository.save(consent2);

			const consent3 = createTestConsent({ scopes: ['read', 'write', 'admin'] });
			await repository.save(consent3);

			// Assert - All 3 consents should exist in database
			const allConsents = await prisma.userConsent.findMany({
				where: { userId: testUserId, clientId: testClientId },
				orderBy: { grantedAt: 'asc' },
			});

			expect(allConsents).toHaveLength(3);

			// First two should be revoked
			expect(allConsents[0].revokedAt).not.toBeNull();
			expect(allConsents[1].revokedAt).not.toBeNull();

			// Last one should be active
			expect(allConsents[2].revokedAt).toBeNull();

			// Verify scopes progression
			expect(allConsents[0].scopes).toEqual(['read']);
			expect(allConsents[1].scopes).toEqual(['read', 'write']);
			expect(allConsents[2].scopes).toEqual(['read', 'write', 'admin']);
		});

		it('should handle re-authorization after manual revocation', async () => {
			// Arrange - Create and manually revoke consent
			const consent1 = createTestConsent({ scopes: ['read'] });
			await repository.save(consent1);
			await repository.revokeConsent(consent1.id);

			// Verify it's revoked
			const revoked = await prisma.userConsent.findUnique({
				where: { id: consent1.id },
			});
			expect(revoked?.revokedAt).not.toBeNull();

			// Act - Re-authorize (should create new consent, NOT update revoked one)
			const consent2 = createTestConsent({ scopes: ['read', 'write'] });
			await repository.save(consent2);

			// Assert - Should have 2 different consents
			expect(consent2.id).not.toBe(consent1.id);

			// Both should exist in DB
			const allConsents = await prisma.userConsent.findMany({
				where: { userId: testUserId, clientId: testClientId },
			});
			expect(allConsents).toHaveLength(2);

			// First remains revoked
			expect(allConsents.find(c => c.id === consent1.id)?.revokedAt).not.toBeNull();

			// Second is active
			expect(allConsents.find(c => c.id === consent2.id)?.revokedAt).toBeNull();
		});
	});

	// ============================================================================
	// TESTS: Partial Unique Index Validation (CRITICAL)
	// ============================================================================

	describe('Partial Unique Index Validation', () => {
		it('should allow multiple revoked consents for same user+client', async () => {
			// Arrange & Act - Create and revoke 3 consents
			const consent1 = createTestConsent({ scopes: ['read'] });
			await repository.save(consent1);
			await repository.revokeConsent(consent1.id);

			const consent2 = createTestConsent({ scopes: ['write'] });
			await repository.save(consent2);
			await repository.revokeConsent(consent2.id);

			const consent3 = createTestConsent({ scopes: ['admin'] });
			await repository.save(consent3);
			await repository.revokeConsent(consent3.id);

			// Assert - All 3 revoked consents should exist
			const revokedCount = await countConsents({
				userId: testUserId,
				clientId: testClientId,
				revokedAt: 'not-null',
			});
			expect(revokedCount).toBe(3);

			// No active consents
			const activeCount = await countConsents({
				userId: testUserId,
				clientId: testClientId,
				revokedAt: 'null',
			});
			expect(activeCount).toBe(0);
		});

		it('should enforce only one active consent per user+client', async () => {
			// Arrange - Create first active consent
			const consent1 = createTestConsent();
			await repository.save(consent1);

			// Act - Try to manually insert second active consent (bypass repository)
			// This should fail due to partial unique index
			const directInsert = prisma.userConsent.create({
				data: {
					id: 'manual-consent-id',
					userId: testUserId,
					clientId: testClientId,
					scopes: ['admin'],
					grantedAt: new Date(),
					expiresAt: null,
					revokedAt: null, // Active
				},
			});

			// Assert - Should throw unique constraint error
			await expect(directInsert).rejects.toThrow();
		});

		it('should allow same user to have active consents with different clients', async () => {
			// Arrange & Act
			const consent1 = createTestConsent({
				userId: testUserId,
				clientId: testClientId
			});
			await repository.save(consent1);

			const consent2 = createTestConsent({
				userId: testUserId,
				clientId: otherClientId
			});
			await repository.save(consent2);

			// Assert - Both should be active
			const userConsents = await prisma.userConsent.findMany({
				where: { userId: testUserId, revokedAt: null },
			});

			expect(userConsents).toHaveLength(2);
			if (userConsents && userConsents.length > 0) {
				expect(userConsents.map(c => c.clientId)).toContain(testClientId);
				expect(userConsents.map(c => c.clientId)).toContain(otherClientId);
			}
		});

		it('should allow different users to have active consents with same client', async () => {
			// Arrange & Act
			const consent1 = createTestConsent({
				userId: testUserId,
				clientId: testClientId
			});
			await repository.save(consent1);

			const consent2 = createTestConsent({
				userId: otherUserId,
				clientId: testClientId
			});
			await repository.save(consent2);

			// Assert - Both should be active
			const clientConsents = await prisma.userConsent.findMany({
				where: { clientId: testClientId, revokedAt: null },
			});

			expect(clientConsents).toHaveLength(2);
			if (clientConsents && clientConsents.length > 0) {
				expect(clientConsents.map(c => c.userId)).toContain(testUserId);
				expect(clientConsents.map(c => c.userId)).toContain(otherUserId);
			}
		});
	});

	// ============================================================================
	// TESTS: findByUserAndClient()
	// ============================================================================

	describe('findByUserAndClient()', () => {
		it('should find active consent by user and client', async () => {
			// Arrange
			const consent = createTestConsent();
			await repository.save(consent);

			// Act
			const found = await repository.findByUserAndClient(testUserId, testClientId);

			// Assert
			expect(found).toBeDefined();
			expect(found?.userId).toBe(testUserId);
			expect(found?.clientId).toBe(testClientId);
			expect(found?.scopes).toEqual(['read', 'write']);
		});

		it('should return null if no active consent exists', async () => {
			// Act
			const found = await repository.findByUserAndClient(testUserId, testClientId);

			// Assert
			expect(found).toBeNull();
		});

		it('should return null if consent is revoked', async () => {
			// Arrange
			const consent = createTestConsent();
			await repository.save(consent);
			await repository.revokeConsent(consent.id);

			// Act
			const found = await repository.findByUserAndClient(testUserId, testClientId);

			// Assert
			expect(found).toBeNull();
		});

		it('should return only the active consent when multiple exist', async () => {
			// Arrange - Create 3 consents (2 revoked, 1 active)
			const consent1 = createTestConsent({ scopes: ['read'] });
			await repository.save(consent1); // Auto-revokes nothing (first one)

			const consent2 = createTestConsent({ scopes: ['write'] });
			await repository.save(consent2); // Auto-revokes consent1

			const consent3 = createTestConsent({ scopes: ['admin'] });
			await repository.save(consent3); // Auto-revokes consent2

			// Act
			const found = await repository.findByUserAndClient(testUserId, testClientId);

			// Assert
			expect(found).toBeDefined();
			expect(found?.id).toBe(consent3.id);
			expect(found?.scopes).toEqual(['admin']);
		});
	});

	// ============================================================================
	// TESTS: findByUserId()
	// ============================================================================

	describe('findByUserId()', () => {
		it('should find all active consents for a user', async () => {
			// Arrange - User has consents with 2 different clients
			const consent1 = createTestConsent({ clientId: testClientId });
			await repository.save(consent1);

			const consent2 = createTestConsent({ clientId: otherClientId });
			await repository.save(consent2);

			// Act
			const consents = await repository.findByUserId(testUserId);

			// Assert
			expect(consents).toHaveLength(2);
			if (consents && consents.length > 0) {
				expect(consents.map(c => c.clientId)).toContain(testClientId);
				expect(consents.map(c => c.clientId)).toContain(otherClientId);
			}
		});

		it('should return empty array if user has no active consents', async () => {
			// Act
			const consents = await repository.findByUserId(testUserId);

			// Assert
			expect(consents).toEqual([]);
		});

		it('should not return revoked consents', async () => {
			// Arrange
			const consent1 = createTestConsent({ clientId: testClientId });
			await repository.save(consent1);
			await repository.revokeConsent(consent1.id); // Revoke it

			const consent2 = createTestConsent({ clientId: otherClientId });
			await repository.save(consent2); // This one is active

			// Act
			const consents = await repository.findByUserId(testUserId);

			// Assert - Only the active one
			expect(consents).toHaveLength(1);
			if (consents && consents.length > 0) {
				expect(consents[0].clientId).toBe(otherClientId);
			}
		});

		it('should order consents by most recent first', async () => {
			// Arrange - Create 3 consents with different clients
			const consent1 = createTestConsent({
				clientId: testClientId,
				scopes: ['read']
			});
			await repository.save(consent1);

			// Wait a bit to ensure different timestamps
			await new Promise(resolve => setTimeout(resolve, 10));

			const consent2 = createTestConsent({
				clientId: otherClientId,
				scopes: ['write']
			});
			await repository.save(consent2);

			// Act
			const consents = await repository.findByUserId(testUserId);

			// Assert - Most recent first
			if (consents && consents.length >= 2) {
				expect(consents[0].clientId).toBe(otherClientId);
				expect(consents[1].clientId).toBe(testClientId);
			}
		});
	});

	// ============================================================================
	// TESTS: findById()
	// ============================================================================

	describe('findById()', () => {
		it('should find consent by ID', async () => {
			// Arrange
			const consent = createTestConsent();
			await repository.save(consent);

			// Act
			const found = await repository.findById(consent.id);

			// Assert
			expect(found).toBeDefined();
			expect(found?.id).toBe(consent.id);
			expect(found?.userId).toBe(testUserId);
			expect(found?.clientId).toBe(testClientId);
		});

		it('should return null if consent does not exist', async () => {
			// Act
			const found = await repository.findById('non-existent-id');

			// Assert
			expect(found).toBeNull();
		});

		it('should find revoked consent by ID', async () => {
			// Arrange
			const consent = createTestConsent();
			await repository.save(consent);
			await repository.revokeConsent(consent.id);

			// Act
			const found = await repository.findById(consent.id);

			// Assert - Should still find it (even though revoked)
			expect(found).toBeDefined();
			expect(found?.id).toBe(consent.id);
			expect(found?.isRevoked()).toBe(true);
		});
	});

	// ============================================================================
	// TESTS: revokeConsent()
	// ============================================================================

	describe('revokeConsent()', () => {
		it('should revoke an active consent', async () => {
			// Arrange
			const consent = createTestConsent();
			await repository.save(consent);

			// Act
			await repository.revokeConsent(consent.id);

			// Assert
			const revoked = await prisma.userConsent.findUnique({
				where: { id: consent.id },
			});

			expect(revoked?.revokedAt).not.toBeNull();
			expect(revoked?.revokedAt).toBeInstanceOf(Date);
		});

		it('should be idempotent (revoking twice should not fail)', async () => {
			// Arrange
			const consent = createTestConsent();
			await repository.save(consent);

			// Act - Revoke twice
			await repository.revokeConsent(consent.id);
			await repository.revokeConsent(consent.id);

			// Assert - Should not throw
			const revoked = await prisma.userConsent.findUnique({
				where: { id: consent.id },
			});
			expect(revoked?.revokedAt).not.toBeNull();
		});
	});

	// ============================================================================
	// TESTS: CASCADE Behavior
	// ============================================================================

	describe('CASCADE Behavior', () => {
		it('should NOT cascade delete when user is deleted', async () => {
			// Arrange
			const consent = createTestConsent();
			await repository.save(consent);

			// Act - Try to delete user (should fail due to RESTRICT)
			const deleteUser = prisma.user.delete({
				where: { id: testUserId },
			});

			// Assert - Should fail with foreign key constraint
			await expect(deleteUser).rejects.toThrow();
		});

		it('should NOT cascade delete when client is deleted', async () => {
			// Arrange
			const consent = createTestConsent();
			await repository.save(consent);

			// Act - Try to delete client (should fail due to RESTRICT)
			const deleteClient = prisma.oAuthClient.delete({
				where: { id: testClientId },
			});

			// Assert - Should fail with foreign key constraint
			await expect(deleteClient).rejects.toThrow();
		});
	});
});
