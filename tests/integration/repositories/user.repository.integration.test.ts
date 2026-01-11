/**
 * Integration tests for UserRepository
 */

import type { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

import { getPrismaTestClient, closePrismaTestClient } from '../../helpers/prisma-test-client.js';
import { cleanDatabase } from '../../helpers/database-helper.js';
import { generateTestEmail, generateTestUsername } from '../../helpers/fixtures-helper.js';

import { UserEntity } from '@domain';
import type { ILogger } from '@interfaces';
import { UserRepository } from '@infrastructure';

describe('UserRepository - Integration Tests', () => {
	let prisma: PrismaClient;
	let repository: UserRepository;
	let logger: ILogger;

	beforeAll(async () => {
		prisma = await getPrismaTestClient();
		logger = {
			debug: vi.fn(),
			error: vi.fn(),
			info: vi.fn(),
			warn: vi.fn(),
			log: vi.fn(),
			child: vi.fn(() => logger),
			checkHealth: vi.fn(async () => ({ status: 'healthy' as const })),
		};
		const hashService = {
			hashPassword: vi.fn(),
			verifyPassword: vi.fn(),
			verifySha256: vi.fn(),
		} as any;
		const dbConfig = {
			client: prisma,
			pool: null,
			logger,
			testConnection: vi.fn(),
			disconnect: vi.fn(),
			getClient: () => prisma,
		} as any;
		repository = new UserRepository(dbConfig as any, hashService, logger);
	});

	beforeEach(async () => {
		await cleanDatabase(prisma);
		vi.clearAllMocks();
	});

	afterAll(async () => {
		await closePrismaTestClient();
	});

	// ============================================================================
	// HELPER FUNCTIONS
	// ============================================================================

	/**
	 * Helper to create a UserEntity with all required properties
	 */
	function createTestUser(options: {
		email?: string;
		username?: string;
		passwordHash?: string;
		fullName?: string;
		roles?: string[];
	} = {}): UserEntity {
		return UserEntity.create({
			id: `user-${Date.now()}-${Math.random()}`,
			email: options.email || generateTestEmail(),
			username: options.username || generateTestUsername(),
			passwordHash: options.passwordHash || 'hash',
			fullName: options.fullName || '',
			isActive: true,
			emailVerified: false,
			roles: options.roles || ['user'],
		});
	}

	// ============================================================================
	// TESTS: create()
	// ============================================================================

	describe('create()', () => {
		it('should create a new user successfully', async () => {
			// Arrange
			const email = generateTestEmail();
			const username = generateTestUsername();
			const passwordHash = await bcrypt.hash('Password123!', 10);

			const user = createTestUser({
				email,
				username,
				passwordHash,
				fullName: 'Test User',
			});

			// Act
			await repository.save(user);

			// Assert
			const saved = await prisma.user.findUnique({
				where: { id: user.id },
			});

			expect(saved).toBeDefined();
			expect(saved?.email).toBe(email);
			expect(saved?.username).toBe(username);
			expect(saved?.isActive).toBe(true);
			expect(saved?.emailVerified).toBe(false);
		});

		it('should enforce unique email constraint', async () => {
			// Arrange
			const email = generateTestEmail();
			const user1 = createTestUser({
				email,
				username: generateTestUsername('user1'),
			});

			await repository.save(user1);

			// Act - Try to create another user with same email
			const user2 = createTestUser({
				email, // Same email
				username: generateTestUsername('user2'),
			});

			// Assert
			await expect(repository.save(user2)).rejects.toThrow();
		});

		it('should enforce unique username constraint', async () => {
			// Arrange
			const username = generateTestUsername();
			const user1 = createTestUser({
				email: generateTestEmail('user1'),
				username,
			});

			await repository.save(user1);

			// Act - Try to create another user with same username
			const user2 = createTestUser({
				email: generateTestEmail('user2'),
				username, // Same username
			});

			// Assert
			await expect(repository.save(user2)).rejects.toThrow();
		});

		it('should create user with multiple roles', async () => {
			// Arrange
			const user = createTestUser({
				roles: ['user', 'admin', 'moderator'],
			});

			// Act
			await repository.save(user);

			// Assert
			const saved = await prisma.user.findUnique({
				where: { id: user.id },
			});

			expect(saved?.roles).toEqual(['user', 'admin', 'moderator']);
		});
	});

	// ============================================================================
	// TESTS: findById()
	// ============================================================================

	describe('findById()', () => {
		it('should find user by ID', async () => {
			// Arrange
			const user = createTestUser();
			await repository.save(user);

			// Act
			const found = await repository.findById(user.id);

			// Assert
			expect(found).toBeDefined();
			expect(found?.id).toBe(user.id);
			expect(found?.email).toBe(user.email);
		});

		it('should return null if user does not exist', async () => {
			// Act
			const found = await repository.findById('non-existent-id');

			// Assert
			expect(found).toBeNull();
		});

		it('should find inactive user', async () => {
			// Arrange
			const user = createTestUser();
			await repository.save(user);

			// Deactivate user
			await prisma.user.update({
				where: { id: user.id },
				data: { isActive: false },
			});

			// Act
			const found = await repository.findById(user.id);

			// Assert - Should still find it (even though inactive)
			expect(found).toBeDefined();
			expect(found?.isActive).toBe(false);
		});
	});

	// ============================================================================
	// TESTS: findByEmail()
	// ============================================================================

	describe('findByEmail()', () => {
		it('should find user by email', async () => {
			// Arrange
			const email = generateTestEmail();
			const user = createTestUser({ email });
			await repository.save(user);

			// Act
			const found = await repository.findByEmail(email);

			// Assert
			expect(found).toBeDefined();
			expect(found?.email).toBe(email);
		});

		it('should be case-insensitive', async () => {
			// Arrange
			const email = 'Test@Example.COM';
			const user = createTestUser({
				email: email.toLowerCase(),
			});
			await repository.save(user);

			// Act - Search with different case
			const found = await repository.findByEmail('test@example.com');

			// Assert
			expect(found).toBeDefined();
		});

		it('should return null if email not found', async () => {
			// Act
			const found = await repository.findByEmail('nonexistent@test.com');

			// Assert
			expect(found).toBeNull();
		});
	});

	// ============================================================================
	// TESTS: findByUsername()
	// ============================================================================

	describe('findByUsername()', () => {
		it('should find user by username', async () => {
			// Arrange
			const username = generateTestUsername();
			const user = createTestUser({ username });
			await repository.save(user);

			// Act
			const found = await repository.findByUserName(username);

			// Assert
			expect(found).toBeDefined();
			expect(found?.username).toBe(username);
		});

		it('should return null if username not found', async () => {
			// Act
			const found = await repository.findByUserName('nonexistent');

			// Assert
			expect(found).toBeNull();
		});
	});

	// ============================================================================
	// TESTS: update()
	// ============================================================================

	describe('update()', () => {
		it('should update user successfully', async () => {
			// Arrange
			const user = createTestUser({
				fullName: 'Original Name',
			});
			await repository.save(user);

			// Act - Update fullName
			const updated = await prisma.user.update({
				where: { id: user.id },
				data: { fullName: 'Updated Name' },
			});

			// Assert
			expect(updated.fullName).toBe('Updated Name');
		});

		it('should update password hash', async () => {
			// Arrange
			const user = createTestUser({
				passwordHash: 'old-hash',
			});
			await repository.save(user);

			// Act
			const newHash = await bcrypt.hash('NewPassword123!', 10);
			await prisma.user.update({
				where: { id: user.id },
				data: { passwordHash: newHash },
			});

			// Assert
			const updated = await prisma.user.findUnique({
				where: { id: user.id },
			});
			expect(updated?.passwordHash).toBe(newHash);
			expect(updated?.passwordHash).not.toBe('old-hash');
		});

		it('should not violate unique constraints on update', async () => {
			// Arrange - Create two users
			const user1 = createTestUser({
				email: generateTestEmail('user1'),
				username: generateTestUsername('user1'),
			});
			await repository.save(user1);

			const user2 = createTestUser({
				email: generateTestEmail('user2'),
				username: generateTestUsername('user2'),
			});
			await repository.save(user2);

			// Act - Try to update user2's email to user1's email
			const updatePromise = prisma.user.update({
				where: { id: user2.id },
				data: { email: user1.email },
			});

			// Assert
			await expect(updatePromise).rejects.toThrow();
		});
	});

	// ============================================================================
	// TESTS: CASCADE Behavior
	// ============================================================================

	describe('CASCADE Behavior', () => {
		it('should CASCADE delete OAuth clients when user is deleted', async () => {
			// Arrange - Create user and client
			const user = createTestUser();
			await repository.save(user);

			await prisma.oAuthClient.create({
				data: {
					clientId: 'test-client',
					clientSecret: 'hash',
					clientName: 'Test Client',
					redirectUris: ['http://localhost/callback'],
					grantTypes: ['authorization_code'],
					userId: user.id,
				},
			});

			// Verify client exists
			const clientBefore = await prisma.oAuthClient.findUnique({
				where: { clientId: 'test-client' },
			});
			expect(clientBefore).toBeDefined();

			// Act - Delete user
			await prisma.user.delete({
				where: { id: user.id },
			});

			// Assert - Client should be deleted too
			const clientAfter = await prisma.oAuthClient.findUnique({
				where: { clientId: 'test-client' },
			});
			expect(clientAfter).toBeNull();
		});

		it('should CASCADE delete sessions when user is deleted', async () => {
			// Arrange - Create user and session
			const user = createTestUser();
			await repository.save(user);

			await prisma.session.create({
				data: {
					id: 'test-session',
					userId: user.id,
					expiresAt: new Date(Date.now() + 3600000),
				},
			});

			// Verify session exists
			const sessionBefore = await prisma.session.findUnique({
				where: { id: 'test-session' },
			});
			expect(sessionBefore).toBeDefined();

			// Act - Delete user (should cascade to sessions)
			await prisma.user.delete({
				where: { id: user.id },
			});

			// Assert - Session should be deleted
			const sessionAfter = await prisma.session.findUnique({
				where: { id: 'test-session' },
			});
			expect(sessionAfter).toBeNull();
		});
	});
});
