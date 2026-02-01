import type { PrismaClient } from '@prisma/client';
import request from 'supertest';
import type { Application } from 'express';

import { getPrismaTestClient, closePrismaTestClient } from '../../helpers/prisma-test-client.js';
import {
	cleanDatabase,
	seedTestDatabase,
	createSystemClient,
	type TestSystemClient,
} from '../../helpers/database-helper.js';
import { TestServer } from '../../helpers/test-server.js';
import { getTestAccessToken } from '../../helpers/fixtures-helper.js';

describe('Password Change Flow - Integration Tests', () => {
	let prisma: PrismaClient;
	let testServer: TestServer;
	let app: Application;
	let testUserEmail: string;
	let testUserPassword: string;
	let testUserId: string;
	let testClientId: string;
	let accessToken: string;

	beforeAll(async () => {
		prisma = await getPrismaTestClient();
		testServer = new TestServer(0);
		await testServer.start();
		app = await testServer.getApp();
	});

	beforeEach(async () => {
		await cleanDatabase(prisma);
		const seed = await seedTestDatabase(prisma);
		testUserEmail = seed.testUser.email;
		testUserPassword = seed.testUser.passwordPlain;
		testUserId = seed.testUser.id;
		testClientId = seed.testClient.clientId;

		// Get access token via OAuth2 flow
		accessToken = await getTestAccessToken(app, prisma, testUserId, testClientId);
	});

	afterAll(async () => {
		await testServer.stop();
		await closePrismaTestClient();
	});

	// ============================================================================
	// COMPLETE PASSWORD CHANGE FLOW
	// ============================================================================

	describe('Complete Password Change Flow', () => {
		it('should change password → verify old fails → verify new works', async () => {
			const newPassword = 'NewSecurePassword123!';

			// ========== STEP 1: Change Password ==========
			const changeResponse = await request(app)
				.put('/user/me/password')
				.set('Authorization', `Bearer ${accessToken}`)
				.send({
					currentPassword: testUserPassword,
					newPassword,
					revokeAllSessions: false, // Keep session alive
				})
				.expect(200);

			// Assert response
			expect(changeResponse.body).toHaveProperty('message', 'Password updated successfully');
			expect(changeResponse.body.sessionRevoked).toBe(false);

			// ========== STEP 2: Verify old password no longer works ==========
			await request(app)
				.post('/auth/login')
				.send({
					emailOrUserName: testUserEmail,
					password: testUserPassword, // OLD password
					rememberMe: false,
				})
				.expect(401); // Invalid credentials

			// ========== STEP 3: Verify new password works ==========
			const loginWithNew = await request(app)
				.post('/auth/login')
				.send({
					emailOrUserName: testUserEmail,
					password: newPassword, // NEW password
					rememberMe: false,
				})
				.expect(200);

			expect(loginWithNew.body).toHaveProperty('user');
			expect(loginWithNew.body.user.email).toBe(testUserEmail);
		});

		it('should revoke all sessions when revokeAllSessions is true', async () => {
			// ========== STEP 1: Verify sessions exist ==========
			const sessionsBefore = await prisma.session.findMany({
				where: { userId: testUserId },
			});
			// There may be existing sessions from token generation

			// ========== STEP 2: Change password with revoke ==========
			const newPassword = 'RevokeAllPassword123!';

			await request(app)
				.put('/user/me/password')
				.set('Authorization', `Bearer ${accessToken}`)
				.send({
					currentPassword: testUserPassword,
					newPassword,
					revokeAllSessions: true, // REVOKE ALL
				})
				.expect(200);

			// ========== STEP 3: Verify all sessions were deleted ==========
			const sessionsAfter = await prisma.session.findMany({
				where: { userId: testUserId },
			});
			expect(sessionsAfter).toHaveLength(0); // All revoked

			// ========== STEP 4: Verify can login with new password ==========
			const newLoginResponse = await request(app)
				.post('/auth/login')
				.send({
					emailOrUserName: testUserEmail,
					password: newPassword,
					rememberMe: false,
				})
				.expect(200);

			expect(newLoginResponse.body.user.email).toBe(testUserEmail);
		});

		it('should fail with incorrect current password', async () => {
			// ========== STEP 1: Try to change with wrong current password ==========
			await request(app)
				.put('/user/me/password')
				.set('Authorization', `Bearer ${accessToken}`)
				.send({
					currentPassword: 'WrongCurrentPassword123!',
					newPassword: 'NewPassword123!',
					revokeAllSessions: false,
				})
				.expect(401); // Invalid credentials

			// ========== STEP 2: Verify password was NOT changed ==========
			const loginWithOld = await request(app)
				.post('/auth/login')
				.send({
					emailOrUserName: testUserEmail,
					password: testUserPassword, // Original password should still work
					rememberMe: false,
				})
				.expect(200);

			expect(loginWithOld.body.user.email).toBe(testUserEmail);
		});

		it('should fail when new password is same as current', async () => {
			// Act & Assert
			await request(app)
				.put('/user/me/password')
				.set('Authorization', `Bearer ${accessToken}`)
				.send({
					currentPassword: testUserPassword,
					newPassword: testUserPassword, // SAME as current
					revokeAllSessions: false,
				})
				.expect(400); // Validation error
		});

		it('should fail with weak new password', async () => {
			// Act & Assert
			await request(app)
				.put('/user/me/password')
				.set('Authorization', `Bearer ${accessToken}`)
				.send({
					currentPassword: testUserPassword,
					newPassword: '123', // Too weak
					revokeAllSessions: false,
				})
				.expect(400); // Validation error
		});

		it('should require authentication', async () => {
			// Act & Assert - Without Bearer token
			await request(app)
				.put('/user/me/password')
				.send({
					currentPassword: 'anything',
					newPassword: 'NewPassword123!',
					revokeAllSessions: false,
				})
				.expect(401); // No auth token
		});
	});

	// ============================================================================
	// SECURITY TESTS
	// ============================================================================

	describe('Password Security', () => {
		it('should hash new password (not store plaintext)', async () => {
			const newPassword = 'HashedPassword123!';

			// ========== STEP 1: Change password ==========
			await request(app)
				.put('/user/me/password')
				.set('Authorization', `Bearer ${accessToken}`)
				.send({
					currentPassword: testUserPassword,
					newPassword,
					revokeAllSessions: false,
				})
				.expect(200);

			// ========== STEP 2: Verify password is hashed in DB ==========
			const user = await prisma.user.findUnique({
				where: { id: testUserId },
			});

			expect(user?.passwordHash).toBeDefined();
			expect(user?.passwordHash).not.toBe(newPassword); // NOT plaintext
			expect(user?.passwordHash.length).toBeGreaterThan(50); // Hashed (bcrypt)
		});

		it('should update updatedAt timestamp', async () => {
			// ========== STEP 1: Get original updatedAt ==========
			const userBefore = await prisma.user.findUnique({
				where: { id: testUserId },
			});
			const updatedAtBefore = userBefore!.updatedAt;

			// Wait a bit to ensure timestamp difference
			await new Promise(resolve => setTimeout(resolve, 100));

			// ========== STEP 2: Change password ==========
			await request(app)
				.put('/user/me/password')
				.set('Authorization', `Bearer ${accessToken}`)
				.send({
					currentPassword: testUserPassword,
					newPassword: 'NewTimestampPassword123!',
					revokeAllSessions: false,
				})
				.expect(200);

			// ========== STEP 3: Verify updatedAt changed ==========
			const userAfter = await prisma.user.findUnique({
				where: { id: testUserId },
			});
			const updatedAtAfter = userAfter!.updatedAt;

			expect(updatedAtAfter.getTime()).toBeGreaterThan(updatedAtBefore.getTime());
		});
	});
});
