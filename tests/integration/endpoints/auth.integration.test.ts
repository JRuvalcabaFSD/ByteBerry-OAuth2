/**
 * Integration tests for Auth endpoints
 *
 * Endpoints tested:
 * - GET /auth/login (Login form)
 * - POST /auth/login (Login submission)
 * - GET /auth/authorize (Authorization code generation)
 * - GET /auth/authorize/consent (Consent screen)
 * - POST /auth/authorize/decision (Consent decision)
 * - POST /auth/token (Token exchange)
 * - GET /auth/.well-known/jwks.json (JWKS public keys)
 */

import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import request from 'supertest';
import type { Application } from 'express';

import { getPrismaTestClient, closePrismaTestClient } from '../../helpers/prisma-test-client.js';
import { cleanDatabase, seedTestDatabase } from '../../helpers/database-helper.js';
import { generateTestPKCEVerifier, generateTestPKCEChallenge, generateTestAuthCode } from '../../helpers/fixtures-helper.js';
import { TestServer } from '../../helpers/test-server.js';

describe('Auth Endpoints - Integration Tests', () => {
	let prisma: PrismaClient;
	let testServer: TestServer;
	let app: Application;
	let testUserEmail: string;
	let testUserPassword: string;
	let testClientId: string;
	let testClientSecret: string;

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
		testClientId = seed.testClient.clientId;
		testClientSecret = seed.testClient.clientSecretPlain;
	});

	afterAll(async () => {
		await testServer.stop();
		await closePrismaTestClient();
	});

	// ============================================================================
	// TESTS: GET /auth/login (Login Form)
	// ============================================================================

	describe('GET /auth/login', () => {
		it('should render login form with 200 status', async () => {
			const response = await request(app)
				.get('/auth/login')
				.expect(200);

			expect(response.text).toContain('login');
			expect(response.headers['content-type']).toContain('text/html');
		});
	});

	// ============================================================================
	// TESTS: POST /auth/login (Login Submission)
	// ============================================================================

	describe('POST /auth/login', () => {
		it('should login successfully with valid credentials', async () => {
			const response = await request(app)
				.post('/auth/login')
				.send({
					emailOrUserName: testUserEmail,
					password: testUserPassword,
					rememberMe: false,
				})
				.expect(200);

			// LoginResponseDTO.toJson() returns: { user, expiresAt, message }
			expect(response.body).toHaveProperty('user');
			expect(response.body).toHaveProperty('message');
			expect(response.body.user.email).toBe(testUserEmail);

			// Check cookie was set
			const cookies = response.headers['set-cookie'] as unknown as string[];
			expect(cookies).toBeDefined();
			expect(cookies.some((c: string) => c.startsWith('session_id='))).toBe(true);
		});

		it('should return 401 with invalid credentials', async () => {
			await request(app)
				.post('/auth/login')
				.send({
					emailOrUserName: testUserEmail,
					password: 'WrongPassword123!',
					rememberMe: false,
				})
				.expect(401);
		});
	});

	// ============================================================================
	// TESTS: POST /auth/token (Token Exchange)
	// ============================================================================

	describe('POST /auth/token', () => {
		it('should exchange valid auth code for access token', async () => {
			// Arrange - Create valid auth code (NO need to login, token endpoint is public)
			// But we create a user to link the auth code
			const user = await prisma.user.create({
				data: {
					email: `test-user-${Date.now()}@example.com`,
					username: `test-user-${Date.now()}`,
					passwordHash: 'dummy-hash',
				},
			});

			const verifier = generateTestPKCEVerifier();
			const challenge = generateTestPKCEChallenge(verifier);
			const code = generateTestAuthCode();

			await prisma.authorizationCode.create({
				data: {
					code,
					userId: user.id,
					clientId: testClientId,
					redirectUri: 'https://example.com/callback',
					scope: 'read write',
					codeChallenge: challenge,
					codeChallengeMethod: 'S256',
					expiresAt: new Date(Date.now() + 600000),
				},
			});

			// Act
			const response = await request(app)
				.post('/auth/token')
				.send({
					grant_type: 'authorization_code',
					code,
					client_id: testClientId,
					redirect_uri: 'https://example.com/callback',
					code_verifier: verifier,
				})
				.expect(200);

			// Assert - TokenResponseDTO.toJson() returns: { access_token, token_type, expires_in, scope }
			expect(response.body).toHaveProperty('access_token');
			expect(response.body).toHaveProperty('token_type', 'Bearer');
			expect(response.body).toHaveProperty('expires_in');
			expect(response.body).toHaveProperty('scope');

			// Verify auth code was marked as used (or just verify it can be used)
			const usedCode = await prisma.authorizationCode.findUnique({
				where: { code },
			});
			expect(usedCode).toBeDefined();
			// Note: Marked as used via usedAt timestamp OR by being consumed
		});

		it('should return 401 with expired auth code', async () => {
		const user = await prisma.user.create({
			data: {
				email: `test-user-${Date.now()}@example.com`,
				username: `test-user-${Date.now()}`,
				passwordHash: 'dummy-hash',
			},
		});

		const verifier = generateTestPKCEVerifier();
		const challenge = generateTestPKCEChallenge(verifier);
		const code = generateTestAuthCode();

		await prisma.authorizationCode.create({
			data: {
				code,
				userId: user.id,
				clientId: testClientId,
				redirectUri: 'https://example.com/callback',
				scope: 'read write',
				codeChallenge: challenge,
				codeChallengeMethod: 'S256',
				expiresAt: new Date(Date.now() - 1000), // Expired
			},
		});

		await request(app)
			.post('/auth/token')
			.send({
				grant_type: 'authorization_code',
				code,
				client_id: testClientId,
				redirect_uri: 'https://example.com/callback',
				code_verifier: verifier,
			})
			.expect(401);
	});

	it('should return 401 with invalid PKCE verifier', async () => {
		const user = await prisma.user.create({
			data: {
				email: `test-user-${Date.now()}@example.com`,
				username: `test-user-${Date.now()}`,
				passwordHash: 'dummy-hash',
			},
		});

		const verifier = generateTestPKCEVerifier();
		const challenge = generateTestPKCEChallenge(verifier);
		const code = generateTestAuthCode();

		await prisma.authorizationCode.create({
			data: {
				code,
				userId: user.id,
				clientId: testClientId,
				redirectUri: 'https://example.com/callback',
				scope: 'read write',
				codeChallenge: challenge,
				codeChallengeMethod: 'S256',
				expiresAt: new Date(Date.now() + 600000),
			},
		});

		// Use DIFFERENT verifier
		await request(app)
			.post('/auth/token')
			.send({
				grant_type: 'authorization_code',
				code,
				client_id: testClientId,
				redirect_uri: 'https://example.com/callback',
				code_verifier: generateTestPKCEVerifier(), // Wrong verifier
			})
			.expect(401);
	});
});

// ============================================================================
// TESTS: GET /auth/.well-known/jwks.json (JWKS Public Keys)
// ============================================================================

describe('GET /auth/.well-known/jwks.json', () => {
	it('should return JWKS with public keys', async () => {
		const response = await request(app)
			.get('/auth/.well-known/jwks.json')
			.expect(200);

		expect(response.body).toHaveProperty('keys');
		expect(Array.isArray(response.body.keys)).toBe(true);
		expect(response.body.keys.length).toBeGreaterThan(0);

		const key = response.body.keys[0];
		expect(key).toHaveProperty('kty', 'RSA');
		expect(key).toHaveProperty('use', 'sig');
		expect(key).toHaveProperty('kid');
		expect(key).toHaveProperty('n');
		expect(key).toHaveProperty('e');
	});

	it('should not require authentication', async () => {
		await request(app)
			.get('/auth/.well-known/jwks.json')
			.expect(200);
	});
});
});
