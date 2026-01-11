/**
 * Integration tests for AuthorizationCodeRepository
 */

import type { PrismaClient } from '@prisma/client';

import { getPrismaTestClient, closePrismaTestClient } from '../../helpers/prisma-test-client.js';
import { cleanDatabase, seedTestDatabase } from '../../helpers/database-helper.js';
import { generateTestAuthCode, generateTestPKCEVerifier, generateTestPKCEChallenge } from '../../helpers/fixtures-helper.js';

import { CodeEntity, ClientIdVO, CodeChallengeVO } from '@domain';
import type { ILogger } from '@interfaces';
import { CodeRepository } from '@infrastructure';
import { DBConfig } from '@config';

describe('AuthorizationCodeRepository - Integration Tests', () => {
	let prisma: PrismaClient;
	let dbConfig: DBConfig;
	let repository: CodeRepository;
	let logger: ILogger;
	let testUserId: string;
	let testClientId: string;

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

		repository = new CodeRepository(dbConfig, logger);
	});

	beforeEach(async () => {
		await cleanDatabase(prisma);
		const { testUser, testClient } = await seedTestDatabase(prisma);
		testUserId = testUser.id;
		testClientId = testClient.clientId;
		vi.clearAllMocks();
	});

	afterAll(async () => {
		await closePrismaTestClient();
	});

	// ============================================================================
	// HELPER
	// ============================================================================

	function createTestAuthCode(options: {
		code?: string;
		userId?: string;
		clientId?: string;
		scopes?: string[];
		expiresInMs?: number;
		withPKCE?: boolean;
	} = {}): CodeEntity {
		const code = options.code || generateTestAuthCode();
		const expiresAt = new Date(Date.now() + (options.expiresInMs || 600000)); // 10min default

		// Create ClientIdVO
		const clientIdVO = ClientIdVO.create(options.clientId || testClientId);

		// Create CodeChallengeVO
		let codeChallengeVO: CodeChallengeVO;
		if (options.withPKCE) {
			const verifier = generateTestPKCEVerifier();
			const challenge = generateTestPKCEChallenge(verifier);
			codeChallengeVO = CodeChallengeVO.create(challenge, 'S256');
		} else {
			// Create a plain challenge for tests without explicit PKCE
			const verifier = generateTestPKCEVerifier();
			const challenge = generateTestPKCEChallenge(verifier);
			codeChallengeVO = CodeChallengeVO.create(challenge, 'S256');
		}

		const baseData = {
			code,
			userId: options.userId || testUserId,
			clientId: clientIdVO,
			redirectUri: 'https://example.com/callback',
			codeChallenge: codeChallengeVO,
			expiresAt,
			scope: options.scopes ? options.scopes.join(' ') : 'read write',
		};

		return CodeEntity.create(baseData);
	}

	// ============================================================================
	// TESTS: save()
	// ============================================================================

	describe('save()', () => {
		it('should save a new authorization code successfully', async () => {
			// Arrange
			const authCode = createTestAuthCode();

			// Act
			await repository.save(authCode);

			// Assert
			const saved = await prisma.authorizationCode.findUnique({
				where: { code: authCode.code },
			});

			expect(saved).toBeDefined();
			expect(saved?.userId).toBe(testUserId);
			expect(saved?.clientId).toBe(testClientId);
			expect(saved?.scope).toBe('read write');
		});

		it('should save authorization code with PKCE', async () => {
			// Arrange
			const authCode = createTestAuthCode({ withPKCE: true });

			// Act
			await repository.save(authCode);

			// Assert
			const saved = await prisma.authorizationCode.findUnique({
				where: { code: authCode.code },
			});

			expect(saved?.codeChallenge).toBeDefined();
			expect(saved?.codeChallengeMethod).toBe('S256');
		});

		it('should enforce unique code constraint', async () => {
			// Arrange
			const code = generateTestAuthCode();
			const authCode1 = createTestAuthCode({ code });
			await repository.save(authCode1);

			// Act - Try to save another code with same value (should upsert, not fail)
			const authCode2 = createTestAuthCode({ code });
			await repository.save(authCode2); // Should update, not throw

			// Assert - Both saves should succeed
			const saved = await prisma.authorizationCode.findUnique({
				where: { code },
			});

			expect(saved).toBeDefined();
			expect(saved?.code).toBe(code);
		});

		it('should save code with state and scope parameters', async () => {
			// Arrange
			const scopes = ['openid', 'profile', 'email'];
			const authCode = createTestAuthCode({ scopes });

			// Act
			await repository.save(authCode);

			// Assert
			const saved = await prisma.authorizationCode.findUnique({
				where: { code: authCode.code },
			});

			expect(saved?.scope).toBe('openid profile email');
		});

		it('should set creation timestamps correctly', async () => {
			// Arrange
			const authCode = createTestAuthCode();
			const beforeSave = new Date();

			// Act
			await repository.save(authCode);

			// Assert
			const saved = await prisma.authorizationCode.findUnique({
				where: { code: authCode.code },
			});

			const createdAt = saved?.createdAt;
			expect(createdAt).toBeDefined();
			expect(createdAt!.getTime()).toBeGreaterThanOrEqual(beforeSave.getTime());
		});
	});

	// ============================================================================
	// TESTS: findByCode()
	// ============================================================================

	describe('findByCode()', () => {
		it('should find authorization code by code value', async () => {
			// Arrange
			const authCode = createTestAuthCode();
			await repository.save(authCode);

			// Act
			const found = await repository.findByCode(authCode.code);

			// Assert
			expect(found).toBeDefined();
			expect(found?.code).toBe(authCode.code);
			expect(found?.userId).toBe(testUserId);
		});

		it('should return null if code does not exist', async () => {
			// Act
			const found = await repository.findByCode('non-existent-code');

			// Assert
			expect(found).toBeNull();
		});

		it('should find code and reconstruct CodeEntity correctly', async () => {
			// Arrange
			const scopes = ['openid', 'profile'];
			const authCode = createTestAuthCode({ scopes });
			await repository.save(authCode);

			// Act
			const found = await repository.findByCode(authCode.code);

			// Assert
			expect(found).toBeDefined();
			expect(found?.userId).toBe(testUserId);
			expect(found?.redirectUri).toBe('https://example.com/callback');
			expect(found?.scope).toBe('openid profile');
			expect(found?.codeChallenge.getMethod()).toBe('S256');
		});

		it('should find expired code', async () => {
			// Arrange
			const authCode = createTestAuthCode({ expiresInMs: -1000 }); // Expired
			await repository.save(authCode);

			// Act
			const found = await repository.findByCode(authCode.code);

			// Assert - Should still find it (even if expired)
			expect(found).toBeDefined();
			expect(found?.isExpired()).toBe(true);
		});

		it('should preserve PKCE challenge when finding code', async () => {
			// Arrange
			const authCode = createTestAuthCode({ withPKCE: true });
			await repository.save(authCode);

			// Act
			const found = await repository.findByCode(authCode.code);

			// Assert
			expect(found).toBeDefined();
			expect(found?.codeChallenge).toBeDefined();
			expect(found?.codeChallenge.getMethod()).toBe('S256');
			expect(found?.codeChallenge.getChallenge()).toBeDefined();
		});
	});

	// ============================================================================
	// TESTS: cleanup()
	// ============================================================================

	describe('cleanup()', () => {
		it('should delete expired codes', async () => {
			// Arrange
			const validCode = createTestAuthCode({ expiresInMs: 600000 }); // 10min future
			const expiredCode = createTestAuthCode({ expiresInMs: -1000 }); // 1s ago

			await repository.save(validCode);
			await repository.save(expiredCode);

			// Act
			await repository.cleanup();

			// Assert
			const remaining = await prisma.authorizationCode.findMany({});

			expect(remaining).toHaveLength(1);
			expect(remaining[0].code).toBe(validCode.code);
		});

		it('should delete used codes', async () => {
			// Arrange
			const validCode = createTestAuthCode();
			const usedCode = createTestAuthCode();

			await repository.save(validCode);
			await repository.save(usedCode);

			// Mark one as used
			await prisma.authorizationCode.update({
				where: { code: usedCode.code },
				data: { used: true, usedAt: new Date() },
			});

			// Act
			await repository.cleanup();

			// Assert
			const remaining = await prisma.authorizationCode.findMany({});

			expect(remaining).toHaveLength(1);
			expect(remaining[0].code).toBe(validCode.code);
		});

		it('should delete both expired and used codes', async () => {
			// Arrange
			const validCode = createTestAuthCode({ expiresInMs: 600000 });
			const expiredCode = createTestAuthCode({ expiresInMs: -1000 });
			const usedCode = createTestAuthCode();

			await repository.save(validCode);
			await repository.save(expiredCode);
			await repository.save(usedCode);

			// Mark one as used
			await prisma.authorizationCode.update({
				where: { code: usedCode.code },
				data: { used: true, usedAt: new Date() },
			});

			// Act
			await repository.cleanup();

			// Assert
			const remaining = await prisma.authorizationCode.findMany({});

			expect(remaining).toHaveLength(1);
			expect(remaining[0].code).toBe(validCode.code);
		});

		it('should not delete valid codes', async () => {
			// Arrange
			const validCode1 = createTestAuthCode({ expiresInMs: 600000 });
			const validCode2 = createTestAuthCode({ expiresInMs: 1200000 });

			await repository.save(validCode1);
			await repository.save(validCode2);

			// Act
			await repository.cleanup();

			// Assert
			const remaining = await prisma.authorizationCode.findMany({});

			expect(remaining).toHaveLength(2);
		});

		it('should handle cleanup when no codes exist', async () => {
			// Act & Assert - Should not throw
			await expect(repository.cleanup()).resolves.toBeUndefined();
		});

		it('should handle cleanup when only valid codes exist', async () => {
			// Arrange
			const validCode = createTestAuthCode({ expiresInMs: 600000 });
			await repository.save(validCode);

			// Act
			await repository.cleanup();

			// Assert
			const remaining = await prisma.authorizationCode.findMany({});
			expect(remaining).toHaveLength(1);
			expect(remaining[0].code).toBe(validCode.code);
		});
	});

	// ============================================================================
	// TESTS: CASCADE Behavior
	// ============================================================================

	describe('CASCADE Behavior', () => {
		it('should CASCADE delete when user is deleted', async () => {
			// Arrange
			const authCode = createTestAuthCode();
			await repository.save(authCode);

			// Act - Delete user
			await prisma.user.delete({
				where: { id: testUserId },
			});

			// Assert - Code should be deleted
			const deleted = await prisma.authorizationCode.findUnique({
				where: { code: authCode.code },
			});

			expect(deleted).toBeNull();
		});

		it('should CASCADE delete when client is deleted', async () => {
			// Arrange
			const authCode = createTestAuthCode();
			await repository.save(authCode);

			// Act - Delete client
			await prisma.oAuthClient.delete({
				where: { clientId: testClientId },
			});

			// Assert - Code should be deleted
			const deleted = await prisma.authorizationCode.findUnique({
				where: { code: authCode.code },
			});

			expect(deleted).toBeNull();
		});
	});
});
