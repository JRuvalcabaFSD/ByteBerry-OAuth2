import type { PrismaClient } from "@prisma/client";
import request from "supertest";
import type { Application } from "express";

import {
	getPrismaTestClient,
	closePrismaTestClient,
} from "../../helpers/prisma-test-client.js";
import {
	cleanDatabase,
	seedTestDatabase,
} from "../../helpers/database-helper.js";
import {
	generateTestPKCEVerifier,
	generateTestPKCEChallenge,
} from "../../helpers/fixtures-helper.js";
import { TestServer } from "../../helpers/test-server.js";

describe("OAuth2 Authorization Code Flow - Integration Tests", () => {
	let prisma: PrismaClient;
	let testServer: TestServer;
	let app: Application;
	let testUserEmail: string;
	let testUserPassword: string;
	let testUserId: string;
	let testClientId: string;
	let testClientSecret: string;
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
		testClientSecret = seed.testClient.clientSecretPlain;
	});

	afterAll(async () => {
		await testServer.stop();
		await closePrismaTestClient();
	});

	async function loginUser(): Promise<string[]> {
		const response = await request(app)
			.post("/auth/login")
			.send({
				emailOrUserName: testUserEmail,
				password: testUserPassword,
				rememberMe: false,
			})
			.expect(200);

		const cookies = response.headers["set-cookie"] ?? [];
		return Array.isArray(cookies) ? cookies : [cookies];
	}

	describe("Complete OAuth2 Flow with Consent", () => {
		it("should complete full OAuth2 flow: login → consent → authorize → token", async () => {
			// ========== STEP 1: User Login ==========
			const cookies = await loginUser();
			expect(cookies).toBeDefined();

			// ========== STEP 2: Request Authorization (No Consent Yet) ==========
			const verifier = generateTestPKCEVerifier();
			const challenge = generateTestPKCEChallenge(verifier);
			const state = "random-state-123";
			const redirectUri = "http://localhost:5173/callback"; // Must match registered URI in seed
			const scope = "read write";

			const authorizeResponse = await request(app)
				.get("/auth/authorize")
				.set("Cookie", cookies)
				.query({
					client_id: testClientId,
					redirect_uri: redirectUri,
					response_type: "code",
					code_challenge: challenge,
					code_challenge_method: "S256",
					state,
					scope,
				})
				.expect(200); // Returns consent required

			// Assert consent is required
			expect(authorizeResponse.body).toHaveProperty(
				"message",
				"Consent required",
			);
			expect(authorizeResponse.body).toHaveProperty("consentUrl");
			expect(authorizeResponse.body).toHaveProperty("clientId", testClientId);

			// ========== STEP 3: Grant Consent ==========
			const consentResponse = await request(app)
				.post("/auth/authorize/decision")
				.set("Cookie", cookies)
				.send({
					decision: "approve",
					client_id: testClientId,
					redirect_uri: redirectUri,
					response_type: "code",
					code_challenge: challenge,
					code_challenge_method: "S256",
					state,
					scope,
				})
				.expect(302); // Redirect with auth code

			// Extract authorization code from redirect
			const location = consentResponse.headers.location;
			expect(location).toContain(redirectUri);
			expect(location).toContain("code=");
			expect(location).toContain(`state=${state}`);

			const url = new URL(location);
			const authCode = url.searchParams.get("code");
			const returnedState = url.searchParams.get("state");

			expect(authCode).toBeDefined();
			expect(returnedState).toBe(state);

			// Verify consent was created in database
			const consent = await prisma.userConsent.findFirst({
				where: {
					userId: testUserId,
					clientId: testClientId,
					revokedAt: null,
				},
			});
			expect(consent).toBeDefined();
			expect(consent?.scopes).toEqual(["read", "write"]);

			// ========== STEP 4: Exchange Code for Token ==========
			const tokenResponse = await request(app)
				.post("/auth/token")
				.send({
					grant_type: "authorization_code",
					code: authCode,
					client_id: testClientId,
					redirect_uri: redirectUri,
					code_verifier: verifier,
				})
				.expect(200);

			// Assert token response
			expect(tokenResponse.body).toHaveProperty("access_token");
			expect(tokenResponse.body).toHaveProperty("token_type", "Bearer");
			expect(tokenResponse.body).toHaveProperty("expires_in");
			expect(tokenResponse.body.scope).toContain("read");
			expect(tokenResponse.body.scope).toContain("write");

			const accessToken = tokenResponse.body.access_token;
			expect(accessToken).toBeDefined();

			expect(authCode).toBeDefined();

			const usedCode = await prisma.authorizationCode.findFirst({
				where: { code: authCode as string }, // Cast explícito
			});
			expect(usedCode?.usedAt).not.toBeNull();

			// ========== STEP 5: Use Access Token (Verify JWT works) ==========
			// Decode JWT to verify claims (without validating signature in test)
			const [, payload] = accessToken.split(".");
			const decodedPayload = JSON.parse(
				Buffer.from(payload, "base64").toString(),
			);

			expect(decodedPayload).toHaveProperty("sub", testUserId);
			expect(decodedPayload).toHaveProperty("email", testUserEmail);
			expect(decodedPayload).toHaveProperty("client_id", testClientId);
			expect(decodedPayload.scope).toContain("read");
			expect(decodedPayload).toHaveProperty("exp");
		});

		it("should skip consent screen when valid consent already exists", async () => {
			// ========== STEP 1: Login ==========
			const cookies = await loginUser();

			// ========== STEP 2: Create Pre-existing Consent ==========
			await prisma.userConsent.create({
				data: {
					userId: testUserId,
					clientId: testClientId,
					scopes: ["read", "write"],
					grantedAt: new Date(),
				},
			});

			// ========== STEP 3: Request Authorization (Should Skip Consent) ==========
			const verifier = generateTestPKCEVerifier();
			const challenge = generateTestPKCEChallenge(verifier);
			const state = "state-with-consent";
			const redirectUri = "http://localhost:5173/callback";

			const authorizeResponse = await request(app)
				.get("/auth/authorize")
				.set("Cookie", cookies)
				.query({
					client_id: testClientId,
					redirect_uri: redirectUri,
					response_type: "code",
					code_challenge: challenge,
					code_challenge_method: "S256",
					state,
					scope: "read write",
				})
				.expect(302); // Direct redirect with code (no consent screen)

			// Extract auth code
			const location = authorizeResponse.headers.location;
			expect(location).toContain(redirectUri);
			expect(location).toContain("code=");
			expect(location).toContain(`state=${state}`);

			const url = new URL(location);
			const authCode = url.searchParams.get("code");
			expect(authCode).toBeDefined();

			// ========== STEP 4: Exchange Code for Token ==========
			const tokenResponse = await request(app)
				.post("/auth/token")
				.send({
					grant_type: "authorization_code",
					code: authCode,
					client_id: testClientId,
					redirect_uri: redirectUri,
					code_verifier: verifier,
				})
				.expect(200);

			expect(tokenResponse.body).toHaveProperty("access_token");
		});

		it("should fail when user denies consent", async () => {
			// ========== STEP 1: Login ==========
			const cookies = await loginUser();

			// ========== STEP 2: Deny Consent ==========
			const verifier = generateTestPKCEVerifier();
			const challenge = generateTestPKCEChallenge(verifier);

			await request(app)
				.post("/auth/authorize/decision")
				.set("Cookie", cookies)
				.send({
					decision: "deny",
					client_id: testClientId,
					redirect_uri: "http://localhost:5173/callback",
					response_type: "code",
					code_challenge: challenge,
					code_challenge_method: "S256",
					state: "deny-state",
					scope: "read",
				})
				.expect(401); // DenyConsentError

			// Verify no consent was created
			const consent = await prisma.userConsent.findFirst({
				where: {
					userId: testUserId,
					clientId: testClientId,
				},
			});
			expect(consent).toBeNull();
		});

		it("should fail token exchange with invalid PKCE verifier", async () => {
			// ========== STEP 1: Complete flow until getting auth code ==========
			const cookies = await loginUser();

			// Create consent
			await prisma.userConsent.create({
				data: {
					userId: testUserId,
					clientId: testClientId,
					scopes: ["read"],
					grantedAt: new Date(),
				},
			});

			const verifier = generateTestPKCEVerifier();
			const challenge = generateTestPKCEChallenge(verifier);

			const authorizeResponse = await request(app)
				.get("/auth/authorize")
				.set("Cookie", cookies)
				.query({
					client_id: testClientId,
					redirect_uri: "http://localhost:5173/callback",
					response_type: "code",
					code_challenge: challenge,
					code_challenge_method: "S256",
					state: "pkce-fail",
					scope: "read",
				})
				.expect(302);

			const location = authorizeResponse.headers.location;
			const url = new URL(location);
			const authCode = url.searchParams.get("code");

			// ========== STEP 2: Try to exchange with WRONG verifier ==========
			const wrongVerifier = generateTestPKCEVerifier(); // Different verifier

			await request(app)
				.post("/auth/token")
				.send({
					grant_type: "authorization_code",
					code: authCode,
					client_id: testClientId,
					redirect_uri: "http://localhost:5173/callback",
					code_verifier: wrongVerifier, // WRONG!
				})
				.expect(401); // PKCE verification failed
		});

		it("should fail when reusing authorization code (replay attack)", async () => {
			// ========== STEP 1: Complete successful flow ==========
			const cookies = await loginUser();

			await prisma.userConsent.create({
				data: {
					userId: testUserId,
					clientId: testClientId,
					scopes: ["read"],
					grantedAt: new Date(),
				},
			});

			const verifier = generateTestPKCEVerifier();
			const challenge = generateTestPKCEChallenge(verifier);

			const authorizeResponse = await request(app)
				.get("/auth/authorize")
				.set("Cookie", cookies)
				.query({
					client_id: testClientId,
					redirect_uri: "http://localhost:5173/callback",
					response_type: "code",
					code_challenge: challenge,
					code_challenge_method: "S256",
					state: "replay",
					scope: "read",
				})
				.expect(302);

			const location = authorizeResponse.headers.location;
			const url = new URL(location);
			const authCode = url.searchParams.get("code");

			// First exchange - SUCCESS
			await request(app)
				.post("/auth/token")
				.send({
					grant_type: "authorization_code",
					code: authCode,
					client_id: testClientId,
					redirect_uri: "http://localhost:5173/callback",
					code_verifier: verifier,
				})
				.expect(200);

			// ========== STEP 2: Try to reuse same code - FAIL ==========
			await request(app)
				.post("/auth/token")
				.send({
					grant_type: "authorization_code",
					code: authCode, // SAME CODE!
					client_id: testClientId,
					redirect_uri: "http://localhost:5173/callback",
					code_verifier: verifier,
				})
				.expect(401); // Code already used
		});

		it("should fail with expired authorization code", async () => {
			// ========== STEP 1: Create expired auth code manually ==========
			const cookies = await loginUser();
			const verifier = generateTestPKCEVerifier();
			const challenge = generateTestPKCEChallenge(verifier);

			const expiredCode = "EXPIRED_CODE_123";
			await prisma.authorizationCode.create({
				data: {
					code: expiredCode,
					userId: testUserId,
					clientId: testClientId,
					redirectUri: "http://localhost:5173/callback",
					scope: "read",
					codeChallenge: challenge,
					codeChallengeMethod: "S256",
					expiresAt: new Date(Date.now() - 60000), // Expired 1 min ago
				},
			});

			// ========== STEP 2: Try to exchange expired code ==========
			await request(app)
				.post("/auth/token")
				.send({
					grant_type: "authorization_code",
					code: expiredCode,
					client_id: testClientId,
					redirect_uri: "http://localhost:5173/callback",
					code_verifier: verifier,
				})
				.expect(401); // Code expired
		});
	});

	describe("Scope Validation in OAuth2 Flow", () => {
		it("should grant consent only for requested scopes", async () => {
			// ========== STEP 1: Login and grant consent for specific scopes ==========
			const cookies = await loginUser();

			const verifier = generateTestPKCEVerifier();
			const challenge = generateTestPKCEChallenge(verifier);

			await request(app)
				.post("/auth/authorize/decision")
				.set("Cookie", cookies)
				.send({
					decision: "approve",
					client_id: testClientId,
					redirect_uri: "http://localhost:5173/callback",
					response_type: "code",
					code_challenge: challenge,
					code_challenge_method: "S256",
					state: "scope-test",
					scope: "read", // Only 'read', not 'write'
				})
				.expect(302);

			// ========== STEP 2: Verify consent scopes ==========
			const consent = await prisma.userConsent.findFirst({
				where: {
					userId: testUserId,
					clientId: testClientId,
				},
			});

			expect(consent?.scopes).toEqual(["read"]);
			expect(consent?.scopes).not.toContain("write");
		});

		it("should require new consent when requesting additional scopes", async () => {
			// ========== STEP 1: Create consent for 'read' only ==========
			const cookies = await loginUser();

			await prisma.userConsent.create({
				data: {
					userId: testUserId,
					clientId: testClientId,
					scopes: ["read"], // Only read
					grantedAt: new Date(),
				},
			});

			// ========== STEP 2: Request authorization with additional scope ==========
			const verifier = generateTestPKCEVerifier();
			const challenge = generateTestPKCEChallenge(verifier);

			const response = await request(app)
				.get("/auth/authorize")
				.set("Cookie", cookies)
				.query({
					client_id: testClientId,
					redirect_uri: "http://localhost:5173/callback",
					response_type: "code",
					code_challenge: challenge,
					code_challenge_method: "S256",
					state: "additional-scope",
					scope: "read write", // Requesting 'write' additionally
				})
				.expect(200); // Consent required again

			expect(response.body).toHaveProperty("message", "Consent required");
		});
	});

	describe("Multiple Clients", () => {
		it("should maintain separate consents for different clients", async () => {
			// ========== STEP 1: Create second client ==========
			const client2 = await prisma.oAuthClient.create({
				data: {
					id: "client-2",
					clientId: "test-client-2",
					clientSecret: "hashed-secret-2",
					clientName: "Second App",
					redirectUris: ["https://app2.com/callback"],
					grantTypes: ["authorization_code"],
					isPublic: false,
					isActive: true,
					userId: testUserId,
				},
			});

			// ========== STEP 2: Grant consent to first client ==========
			const cookies = await loginUser();

			await prisma.userConsent.create({
				data: {
					userId: testUserId,
					clientId: testClientId, // Client 1
					scopes: ["read"],
					grantedAt: new Date(),
				},
			});

			// ========== STEP 3: Request authorization for second client ==========
			const verifier = generateTestPKCEVerifier();
			const challenge = generateTestPKCEChallenge(verifier);

			const response = await request(app)
				.get("/auth/authorize")
				.set("Cookie", cookies)
				.query({
					client_id: client2.clientId, // Client 2
					redirect_uri: "https://app2.com/callback",
					response_type: "code",
					code_challenge: challenge,
					code_challenge_method: "S256",
					state: "multi-client",
					scope: "read",
				})
				.expect(200); // Consent required for client 2

			expect(response.body).toHaveProperty("message", "Consent required");
			expect(response.body.clientId).toBe(client2.clientId);
		});
	});
});
