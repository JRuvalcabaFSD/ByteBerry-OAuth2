import type { PrismaClient } from '@prisma/client';
import request from 'supertest';
import type { Application } from 'express';

import { getPrismaTestClient, closePrismaTestClient } from '../../helpers/prisma-test-client.js';
import { cleanDatabase, seedTestDatabase } from '../../helpers/database-helper.js';
import { TestServer } from '../../helpers/test-server.js';
import { getTestAccessToken } from '../../helpers/fixtures-helper.js';

describe('Consent Management Flow - Integration Tests', () => {
	let prisma: PrismaClient;
	let testServer: TestServer;
	let app: Application;
	let testUserEmail: string;
	let testUserPassword: string;
	let testUserId: string;
	let testClientId: string;
	let accessToken: string;
	let authCookies: string[];

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

		// Get access token via OAuth2 flow for user endpoints
		accessToken = await getTestAccessToken(app, prisma, testUserId, testClientId);

		// Login to get cookies for consent decision endpoint (which still uses session)
		const loginResponse = await request(app)
			.post('/auth/login')
			.send({
				emailOrUserName: testUserEmail,
				password: testUserPassword,
				rememberMe: false,
			})
			.expect(200);

		const cookies = loginResponse.headers['set-cookie'];
		authCookies = Array.isArray(cookies) ? cookies : cookies ? [cookies] : [];
	});

	afterAll(async () => {
		await testServer.stop();
		await closePrismaTestClient();
	});

	// ============================================================================
	// COMPLETE CONSENT MANAGEMENT FLOW
	// ============================================================================

	describe('Complete Consent Lifecycle', () => {
		it('should grant → list → revoke consent successfully', async () => {
			// ========== STEP 1: Grant Consent (uses session cookies for auth flow) ==========
			const consentData = {
				decision: 'approve',
				client_id: testClientId,
				redirect_uri: 'http://localhost:5173/callback',
				response_type: 'code',
				code_challenge: '1234567890123456789012345678901234567890123',
				code_challenge_method: 'S256',
				state: 'consent-flow',
				scope: 'read write',
			};

			await request(app)
				.post('/auth/authorize/decision')
				.set('Cookie', authCookies)
				.send(consentData)
				.expect(302);

			// ========== STEP 2: List Consents (uses Bearer token) ==========
			const listResponse = await request(app)
				.get('/user/me/consents')
				.set('Authorization', `Bearer ${accessToken}`)
				.expect(200);

			// Assert consent exists
			expect(listResponse.body).toHaveProperty('consents');
			expect(Array.isArray(listResponse.body.consents)).toBe(true);
			expect(listResponse.body.consents).toHaveLength(1);

			const consent = listResponse.body.consents[0];
			expect(consent).toHaveProperty('id');
			expect(consent.clientId).toBe(testClientId);
			expect(consent.scopes).toEqual(['read', 'write']);
			expect(consent).toHaveProperty('grantedAt');
			expect(consent.expiresAt).toBeNull(); // No expiration
			expect(consent).toHaveProperty('clientName');

			const consentId = consent.id;

			// ========== STEP 3: Revoke Consent (uses Bearer token) ==========
			await request(app)
				.delete(`/user/me/consents/${consentId}`)
				.set('Authorization', `Bearer ${accessToken}`)
				.expect(204);

			// ========== STEP 4: Verify Consent is Revoked ==========
			const dbConsent = await prisma.userConsent.findUnique({
				where: { id: consentId },
			});

			expect(dbConsent).toBeDefined();
			expect(dbConsent?.revokedAt).not.toBeNull(); // Revoked

			// ========== STEP 5: List Consents Again (should be empty) ==========
			const listAfterRevoke = await request(app)
				.get('/user/me/consents')
				.set('Authorization', `Bearer ${accessToken}`)
				.expect(200);

			// Note: Depending on implementation, might filter out revoked consents
			// or show them with revoked status
			expect(listAfterRevoke.body.consents).toHaveLength(0);
		});

		it('should handle multiple consents for different clients', async () => {
			// ========== STEP 1: Create second client ==========
			const client2 = await prisma.oAuthClient.create({
				data: {
					id: 'multi-consent-client',
					clientId: 'multi-consent-id',
					clientSecret: 'hashed',
					clientName: 'Second Consent App',
					redirectUris: ['https://app2.com/callback'],
					grantTypes: ['authorization_code'],
					isPublic: false,
					isActive: true,
					userId: testUserId,
				},
			});

			// ========== STEP 2: Grant consent to both clients ==========
			// Consent 1
			await prisma.userConsent.create({
				data: {
					userId: testUserId,
					clientId: testClientId,
					scopes: ['read'],
					grantedAt: new Date(),
				},
			});

			// Consent 2
			await prisma.userConsent.create({
				data: {
					userId: testUserId,
					clientId: client2.clientId,
					scopes: ['read', 'write'],
					grantedAt: new Date(),
				},
			});

			// ========== STEP 3: List all consents ==========
			const listResponse = await request(app)
				.get('/user/me/consents')
				.set('Authorization', `Bearer ${accessToken}`)
				.expect(200);

			expect(listResponse.body.consents).toHaveLength(2);

			const consent1 = listResponse.body.consents.find((c: any) => c.clientId === testClientId);
			const consent2 = listResponse.body.consents.find((c: any) => c.clientId === client2.clientId);

			expect(consent1).toBeDefined();
			expect(consent1.scopes).toEqual(['read']);

			expect(consent2).toBeDefined();
			expect(consent2.scopes).toEqual(['read', 'write']);
			expect(consent2.clientName).toBe('Second Consent App');

			// ========== STEP 4: Revoke only one consent ==========
			await request(app)
				.delete(`/user/me/consents/${consent1.id}`)
				.set('Authorization', `Bearer ${accessToken}`)
				.expect(204);

			// ========== STEP 5: Verify only one remains ==========
			const afterRevoke = await request(app)
				.get('/user/me/consents')
				.set('Authorization', `Bearer ${accessToken}`)
				.expect(200);

			expect(afterRevoke.body.consents).toHaveLength(1);
			expect(afterRevoke.body.consents[0].clientId).toBe(client2.clientId);
		});

		it('should be idempotent when revoking already revoked consent', async () => {
			// ========== STEP 1: Create and revoke consent ==========
			const consent = await prisma.userConsent.create({
				data: {
					userId: testUserId,
					clientId: testClientId,
					scopes: ['read'],
					grantedAt: new Date(),
					revokedAt: new Date(), // Already revoked
				},
			});

			// ========== STEP 2: Try to revoke again ==========
			await request(app)
				.delete(`/user/me/consents/${consent.id}`)
				.set('Authorization', `Bearer ${accessToken}`)
				.expect(204); // Should succeed (idempotent)
		});

		it('should prevent revoking another user\'s consent', async () => {
			// ========== STEP 1: Create another user with consent ==========
			const otherUser = await prisma.user.create({
				data: {
					id: 'other-consent-user',
					email: 'other-consent@test.com',
					username: 'otherconsentuser',
					passwordHash: 'hashed',
					roles: ['user'],
					isActive: true,
					emailVerified: false,
				},
			});

			const otherConsent = await prisma.userConsent.create({
				data: {
					userId: otherUser.id,
					clientId: testClientId,
					scopes: ['read'],
					grantedAt: new Date(),
				},
			});

			// ========== STEP 2: Try to revoke other user's consent ==========
			await request(app)
				.delete(`/user/me/consents/${otherConsent.id}`)
				.set('Authorization', `Bearer ${accessToken}`)
				.expect(403); // Forbidden
		});
	});

	// ============================================================================
	// CONSENT AUTO-REVOKE ON NEW CONSENT
	// ============================================================================

	describe('Consent Auto-Revoke Strategy', () => {
		it('should auto-revoke previous consent when granting new consent', async () => {
			// ========== STEP 1: Grant first consent ==========
			const consent1 = await prisma.userConsent.create({
				data: {
					userId: testUserId,
					clientId: testClientId,
					scopes: ['read'],
					grantedAt: new Date(Date.now() - 10000), // 10s ago
				},
			});

			expect(consent1.revokedAt).toBeNull();

			// ========== STEP 2: Grant new consent (should auto-revoke previous) ==========
			await request(app)
				.post('/auth/authorize/decision')
				.set('Cookie', authCookies)
				.send({
					decision: 'approve',
					client_id: testClientId,
					redirect_uri: 'http://localhost:5173/callback',
					response_type: 'code',
					code_challenge: '1234567890123456789012345678901234567890123',
					code_challenge_method: 'S256',
					state: 'auto-revoke',
					scope: 'read write', // Different scopes
				})
				.expect(302);

			// ========== STEP 3: Verify old consent was auto-revoked ==========
			const oldConsent = await prisma.userConsent.findUnique({
				where: { id: consent1.id },
			});

			expect(oldConsent?.revokedAt).not.toBeNull(); // Auto-revoked

			// ========== STEP 4: Verify new consent exists and is active ==========
			const newConsent = await prisma.userConsent.findFirst({
				where: {
					userId: testUserId,
					clientId: testClientId,
					revokedAt: null, // Active
				},
			});

			expect(newConsent).toBeDefined();
			expect(newConsent?.scopes).toEqual(['read', 'write']);
			expect(newConsent?.id).not.toBe(consent1.id); // Different consent
		});
	});
});
