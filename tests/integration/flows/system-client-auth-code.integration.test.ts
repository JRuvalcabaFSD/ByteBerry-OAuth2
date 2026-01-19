/**
 * Integration tests for System Client Authorization Code Flow
 *
 * System clients (e.g., BFF) should be able to obtain authorization codes
 * WITHOUT requiring user consent, as they are trusted first-party applications.
 */

import type { PrismaClient } from '@prisma/client';
import request from 'supertest';
import type { Application } from 'express';
import bcrypt from 'bcrypt';

import { getPrismaTestClient, closePrismaTestClient } from '../../helpers/prisma-test-client.js';
import { cleanDatabase, seedTestDatabaseUserOnly } from '../../helpers/database-helper.js';
import { generateTestPKCEVerifier, generateTestPKCEChallenge } from '../../helpers/fixtures-helper.js';
import { TestServer } from '../../helpers/test-server.js';

describe('System Client Authorization Code Flow - Integration Tests', () => {
	let prisma: PrismaClient;
	let testServer: TestServer;
	let app: Application;
	let testUserEmail: string;
	let testUserPassword: string;
	let testUserId: string;

	// System client data
	const systemClientId = 'byteberry-bff-system-test';
	const systemClientSecretPlain = 'super-secret-system-client-key-12345678';
	const systemClientRedirectUri = 'http://localhost:5173/callback';

	beforeAll(async () => {
		try {
			prisma = await getPrismaTestClient();
			testServer = new TestServer(0);
			await testServer.start();
			app = await testServer.getApp();
		} catch (err) {
			// Mostrar el error real en consola y relanzar
			// eslint-disable-next-line no-console
			console.error('Error en beforeAll:', err);
			throw err;
		}
	});

	beforeEach(async () => {
		await cleanDatabase(prisma);

		// Seed user and scopes only (no OAuth client)
		const seed = await seedTestDatabaseUserOnly(prisma);
		testUserEmail = seed.testUser.email;
		testUserPassword = seed.testUser.passwordPlain;
		testUserId = seed.testUser.id;
	});

	afterAll(async () => {
		await testServer.stop();
		await closePrismaTestClient();
	});

	// ============================================================================
	// HELPER: Create system client
	// ============================================================================

	async function createSystemClient(options?: {
		systemRole?: string;
		isPublic?: boolean;
	}): Promise<{ clientId: string; clientSecretPlain: string }> {
		const clientSecret = await bcrypt.hash(systemClientSecretPlain, 10);

		await prisma.oAuthClient.create({
			data: {
				clientId: systemClientId,
				clientSecret,
				clientName: 'ByteBerry BFF System Client',
				redirectUris: [systemClientRedirectUri],
				grantTypes: ['authorization_code', 'refresh_token'],
				isPublic: options?.isPublic ?? false,
				isActive: true,
				isSystemClient: true,
				systemRole: options?.systemRole ?? 'bff',
				userId: null, // System clients don't have an owner
			},
		});

		return { clientId: systemClientId, clientSecretPlain: systemClientSecretPlain };
	}

	// ============================================================================
	// HELPER: Login user
	// ============================================================================

	async function loginUser(): Promise<string[]> {
		const response = await request(app)
			.post('/auth/login')
			.send({
				emailOrUserName: testUserEmail,
				password: testUserPassword,
				rememberMe: false,
			})
			.expect(200);

		const cookies = response.headers['set-cookie'];
		return Array.isArray(cookies) ? cookies : cookies ? [cookies] : [];
	}

	// ============================================================================
	// SYSTEM CLIENT AUTHORIZATION CODE FLOW TESTS
	// ============================================================================

	describe('System Client Skips Consent', () => {
		it('should generate authorization code immediately without requiring consent for system client', async () => {
			// ========== SETUP: Create system client ==========
			await createSystemClient({ systemRole: 'bff' });

			// ========== STEP 1: User Login ==========
			const cookies = await loginUser();
			expect(cookies).toBeDefined();
			expect(cookies.length).toBeGreaterThan(0);

			// ========== STEP 2: Request Authorization (Should Skip Consent) ==========
			const verifier = generateTestPKCEVerifier();
			const challenge = generateTestPKCEChallenge(verifier);
			const state = 'system-client-state-123';
			const scope = 'read write';

			const authorizeResponse = await request(app)
				.get('/auth/authorize')
				.set('Cookie', cookies)
				.query({
					client_id: systemClientId,
					redirect_uri: systemClientRedirectUri,
					response_type: 'code',
					code_challenge: challenge,
					code_challenge_method: 'S256',
					state,
					scope,
				})
				.expect(302); // Direct redirect, NOT 200 (consent required)

			// ========== VERIFY: Redirect contains authorization code ==========
			const location = authorizeResponse.headers.location;
			expect(location).toContain(systemClientRedirectUri);
			expect(location).toContain('code=');
			expect(location).toContain(`state=${state}`);

			const url = new URL(location);
			const authCode = url.searchParams.get('code');
			const returnedState = url.searchParams.get('state');

			expect(authCode).toBeDefined();
			expect(authCode).not.toBeNull();
			expect(returnedState).toBe(state);

			// ========== VERIFY: No consent record was created ==========
			const consent = await prisma.userConsent.findFirst({
				where: {
					userId: testUserId,
					clientId: systemClientId,
				},
			});
			expect(consent).toBeNull(); // System clients don't create consent records
		});

		it('should complete full OAuth2 flow for system client without consent step', async () => {
			// ========== SETUP ==========
			await createSystemClient({ systemRole: 'bff' });
			const cookies = await loginUser();

			// ========== REQUEST AUTHORIZATION ==========
			const verifier = generateTestPKCEVerifier();
			const challenge = generateTestPKCEChallenge(verifier);
			const state = 'full-flow-state';
			const scope = 'read write';

			const authorizeResponse = await request(app)
				.get('/auth/authorize')
				.set('Cookie', cookies)
				.query({
					client_id: systemClientId,
					redirect_uri: systemClientRedirectUri,
					response_type: 'code',
					code_challenge: challenge,
					code_challenge_method: 'S256',
					state,
					scope,
				})
				.expect(302);

			// Extract authorization code
			const url = new URL(authorizeResponse.headers.location);
			const authCode = url.searchParams.get('code');
			expect(authCode).toBeDefined();

			// ========== EXCHANGE CODE FOR TOKEN ==========
			const tokenResponse = await request(app)
				.post('/auth/token')
				.send({
					grant_type: 'authorization_code',
					code: authCode,
					client_id: systemClientId,
					redirect_uri: systemClientRedirectUri,
					code_verifier: verifier,
				})
				.expect(200);

			// ========== VERIFY TOKEN RESPONSE ==========
			expect(tokenResponse.body).toHaveProperty('access_token');
			expect(tokenResponse.body).toHaveProperty('token_type', 'Bearer');
			expect(tokenResponse.body).toHaveProperty('expires_in');
			expect(tokenResponse.body.scope).toContain('read');
			expect(tokenResponse.body.scope).toContain('write');

			// ========== VERIFY JWT CLAIMS ==========
			const accessToken = tokenResponse.body.access_token;
			const [, payload] = accessToken.split('.');
			const decodedPayload = JSON.parse(Buffer.from(payload, 'base64').toString());

			expect(decodedPayload).toHaveProperty('sub', testUserId);
			expect(decodedPayload).toHaveProperty('email', testUserEmail);
			expect(decodedPayload).toHaveProperty('client_id', systemClientId);
			expect(decodedPayload.scope).toContain('read');
			expect(decodedPayload.scope).toContain('write');
		});

		it('should mark authorization code as used after token exchange for system client', async () => {
			// ========== SETUP ==========
			await createSystemClient();
			const cookies = await loginUser();

			const verifier = generateTestPKCEVerifier();
			const challenge = generateTestPKCEChallenge(verifier);

			// ========== GET AUTHORIZATION CODE ==========
			const authorizeResponse = await request(app)
				.get('/auth/authorize')
				.set('Cookie', cookies)
				.query({
					client_id: systemClientId,
					redirect_uri: systemClientRedirectUri,
					response_type: 'code',
					code_challenge: challenge,
					code_challenge_method: 'S256',
					state: 'test-state',
					scope: 'read',
				})
				.expect(302);

			const url = new URL(authorizeResponse.headers.location);
			const authCode = url.searchParams.get('code');

			// ========== EXCHANGE CODE FOR TOKEN ==========
			await request(app)
				.post('/auth/token')
				.send({
					grant_type: 'authorization_code',
					code: authCode,
					client_id: systemClientId,
					redirect_uri: systemClientRedirectUri,
					code_verifier: verifier,
				})
				.expect(200);

			// ========== VERIFY CODE IS MARKED AS USED ==========
			const usedCode = await prisma.authorizationCode.findFirst({
				where: {
					code: authCode!,
				},
			});

			expect(usedCode).not.toBeNull();
			expect(usedCode?.used).toBe(true);
			expect(usedCode?.usedAt).not.toBeNull();
		});

		it('should prevent code reuse (replay attack) for system client', async () => {
			// ========== SETUP ==========
			await createSystemClient();
			const cookies = await loginUser();

			const verifier = generateTestPKCEVerifier();
			const challenge = generateTestPKCEChallenge(verifier);

			// ========== GET AUTHORIZATION CODE ==========
			const authorizeResponse = await request(app)
				.get('/auth/authorize')
				.set('Cookie', cookies)
				.query({
					client_id: systemClientId,
					redirect_uri: systemClientRedirectUri,
					response_type: 'code',
					code_challenge: challenge,
					code_challenge_method: 'S256',
					state: 'replay-test',
					scope: 'read',
				})
				.expect(302);

			const url = new URL(authorizeResponse.headers.location);
			const authCode = url.searchParams.get('code');

			// ========== FIRST EXCHANGE: SUCCESS ==========
			await request(app)
				.post('/auth/token')
				.send({
					grant_type: 'authorization_code',
					code: authCode,
					client_id: systemClientId,
					redirect_uri: systemClientRedirectUri,
					code_verifier: verifier,
				})
				.expect(200);

			// ========== SECOND EXCHANGE: SHOULD FAIL ==========
			const replayResponse = await request(app)
				.post('/auth/token')
				.send({
					grant_type: 'authorization_code',
					code: authCode,
					client_id: systemClientId,
					redirect_uri: systemClientRedirectUri,
					code_verifier: verifier,
				})
				.expect(401);

			expect(replayResponse.body).toHaveProperty('error');
		});
	});

	// ============================================================================
	// SYSTEM CLIENT WITH DIFFERENT ROLES
	// ============================================================================

	describe('System Client Roles', () => {
		it('should work with BFF system role', async () => {
			await createSystemClient({ systemRole: 'bff' });
			const cookies = await loginUser();

			const verifier = generateTestPKCEVerifier();
			const challenge = generateTestPKCEChallenge(verifier);

			const response = await request(app)
				.get('/auth/authorize')
				.set('Cookie', cookies)
				.query({
					client_id: systemClientId,
					redirect_uri: systemClientRedirectUri,
					response_type: 'code',
					code_challenge: challenge,
					code_challenge_method: 'S256',
					state: 'bff-role-test',
					scope: 'read',
				})
				.expect(302);

			expect(response.headers.location).toContain('code=');
		});

		it('should work with admin system role', async () => {
			// Create system client with admin role
			const clientSecret = await bcrypt.hash(systemClientSecretPlain, 10);

			await prisma.oAuthClient.create({
				data: {
					clientId: 'admin-system-client',
					clientSecret,
					clientName: 'Admin System Client',
					redirectUris: [systemClientRedirectUri],
					grantTypes: ['authorization_code', 'refresh_token'],
					isPublic: false,
					isActive: true,
					isSystemClient: true,
					systemRole: 'admin',
					userId: null,
				},
			});

			const cookies = await loginUser();

			const verifier = generateTestPKCEVerifier();
			const challenge = generateTestPKCEChallenge(verifier);

			const response = await request(app)
				.get('/auth/authorize')
				.set('Cookie', cookies)
				.query({
					client_id: 'admin-system-client',
					redirect_uri: systemClientRedirectUri,
					response_type: 'code',
					code_challenge: challenge,
					code_challenge_method: 'S256',
					state: 'admin-role-test',
					scope: 'read admin',
				})
				.expect(302);

			expect(response.headers.location).toContain('code=');
		});
	});

	// ============================================================================
	// COMPARISON: SYSTEM vs EXTERNAL CLIENTS
	// ============================================================================

	describe('System vs External Client Behavior', () => {
		it('should require consent for external client but not for system client', async () => {
			// ========== CREATE BOTH CLIENTS ==========
			await createSystemClient({ systemRole: 'bff' });

			// Create external client
			const externalClientSecret = await bcrypt.hash('external-secret-123', 10);
			await prisma.oAuthClient.create({
				data: {
					clientId: 'external-test-client',
					clientSecret: externalClientSecret,
					clientName: 'External Test Client',
					redirectUris: [systemClientRedirectUri],
					grantTypes: ['authorization_code', 'refresh_token'],
					isPublic: false,
					isActive: true,
					isSystemClient: false, // External client
					userId: testUserId,
				},
			});

			const cookies = await loginUser();

			const verifier = generateTestPKCEVerifier();
			const challenge = generateTestPKCEChallenge(verifier);

			// ========== SYSTEM CLIENT: Direct redirect (no consent) ==========
			const systemResponse = await request(app)
				.get('/auth/authorize')
				.set('Cookie', cookies)
				.query({
					client_id: systemClientId,
					redirect_uri: systemClientRedirectUri,
					response_type: 'code',
					code_challenge: challenge,
					code_challenge_method: 'S256',
					state: 'system-test',
					scope: 'read',
				})
				.expect(302); // Direct redirect

			expect(systemResponse.headers.location).toContain('code=');

			// ========== EXTERNAL CLIENT: Consent required (200 response) ==========
			const externalResponse = await request(app)
				.get('/auth/authorize')
				.set('Cookie', cookies)
				.query({
					client_id: 'external-test-client',
					redirect_uri: systemClientRedirectUri,
					response_type: 'code',
					code_challenge: challenge,
					code_challenge_method: 'S256',
					state: 'external-test',
					scope: 'read',
				})
				.expect(200); // Consent required

			expect(externalResponse.body).toHaveProperty('message', 'Consent required');
			expect(externalResponse.body).toHaveProperty('consentUrl');
		});
	});

	// ============================================================================
	// EDGE CASES
	// ============================================================================

	describe('Edge Cases', () => {
		it('should fail with invalid PKCE verifier for system client', async () => {
			await createSystemClient();
			const cookies = await loginUser();

			const verifier = generateTestPKCEVerifier();
			const challenge = generateTestPKCEChallenge(verifier);
			const wrongVerifier = generateTestPKCEVerifier(); // Different verifier

			// Get authorization code
			const authorizeResponse = await request(app)
				.get('/auth/authorize')
				.set('Cookie', cookies)
				.query({
					client_id: systemClientId,
					redirect_uri: systemClientRedirectUri,
					response_type: 'code',
					code_challenge: challenge,
					code_challenge_method: 'S256',
					state: 'pkce-test',
					scope: 'read',
				})
				.expect(302);

			const url = new URL(authorizeResponse.headers.location);
			const authCode = url.searchParams.get('code');

			// Exchange with wrong verifier
			const tokenResponse = await request(app)
				.post('/auth/token')
				.send({
					grant_type: 'authorization_code',
					code: authCode,
					client_id: systemClientId,
					redirect_uri: systemClientRedirectUri,
					code_verifier: wrongVerifier,
				})
				.expect(401);

			expect(tokenResponse.body).toHaveProperty('error');
		});

		it('should fail with invalid redirect URI for system client', async () => {
			await createSystemClient();
			const cookies = await loginUser();

			const verifier = generateTestPKCEVerifier();
			const challenge = generateTestPKCEChallenge(verifier);

			const response = await request(app)
				.get('/auth/authorize')
				.set('Cookie', cookies)
				.query({
					client_id: systemClientId,
					redirect_uri: 'http://malicious.com/callback', // Invalid redirect URI
					response_type: 'code',
					code_challenge: challenge,
					code_challenge_method: 'S256',
					state: 'invalid-uri-test',
					scope: 'read',
				})
				.expect(401);

			expect(response.body).toHaveProperty('error');
		});

		it('should fail for inactive system client', async () => {
			// Create inactive system client
			const clientSecret = await bcrypt.hash(systemClientSecretPlain, 10);

			await prisma.oAuthClient.create({
				data: {
					clientId: 'inactive-system-client',
					clientSecret,
					clientName: 'Inactive System Client',
					redirectUris: [systemClientRedirectUri],
					grantTypes: ['authorization_code'],
					isPublic: false,
					isActive: false, // Inactive
					isSystemClient: true,
					systemRole: 'bff',
					userId: null,
				},
			});

			const cookies = await loginUser();

			const verifier = generateTestPKCEVerifier();
			const challenge = generateTestPKCEChallenge(verifier);

			const response = await request(app)
				.get('/auth/authorize')
				.set('Cookie', cookies)
				.query({
					client_id: 'inactive-system-client',
					redirect_uri: systemClientRedirectUri,
					response_type: 'code',
					code_challenge: challenge,
					code_challenge_method: 'S256',
					state: 'inactive-test',
					scope: 'read',
				})
				.expect(401);

			expect(response.body).toHaveProperty('error');
		});

		it('should handle system client without specifying scope', async () => {
			await createSystemClient();
			const cookies = await loginUser();

			const verifier = generateTestPKCEVerifier();
			const challenge = generateTestPKCEChallenge(verifier);

			// Request without scope parameter
			const authorizeResponse = await request(app)
				.get('/auth/authorize')
				.set('Cookie', cookies)
				.query({
					client_id: systemClientId,
					redirect_uri: systemClientRedirectUri,
					response_type: 'code',
					code_challenge: challenge,
					code_challenge_method: 'S256',
					state: 'no-scope-test',
					// No scope specified
				})
				.expect(302);

			expect(authorizeResponse.headers.location).toContain('code=');

			// Exchange for token
			const url = new URL(authorizeResponse.headers.location);
			const authCode = url.searchParams.get('code');

			const tokenResponse = await request(app)
				.post('/auth/token')
				.send({
					grant_type: 'authorization_code',
					code: authCode,
					client_id: systemClientId,
					redirect_uri: systemClientRedirectUri,
					code_verifier: verifier,
				})
				.expect(200);

			expect(tokenResponse.body).toHaveProperty('access_token');
		});
	});
});
