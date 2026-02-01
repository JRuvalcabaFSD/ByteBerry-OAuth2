/**
 * Fixtures Helper - Generadores de datos de prueba
 */

import crypto from "node:crypto";
import request from "supertest";
import type { Application } from "express";
import type { PrismaClient } from "@prisma/client";

export function generateTestPKCEVerifier(byteLength: number = 32): string {
	const buffer = crypto.randomBytes(byteLength);
	return buffer
		.toString("base64")
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=/g, "");
}

export function generateTestPKCEChallenge(verifier: string): string {
	return crypto.createHash("sha256").update(verifier).digest("base64url");
}

export function generateTestAuthCode(): string {
	const timestamp = Date.now();
	const random = crypto.randomBytes(6).toString("hex");
	return `TEST_CODE_${timestamp}_${random}`;
}

export function generateTestEmail(prefix: string = "test"): string {
	const timestamp = Date.now();
	const random = crypto.randomBytes(4).toString("hex");
	return `${prefix}_${timestamp}_${random}@byteberry.test`;
}

export function generateTestUsername(prefix: string = "testuser"): string {
	const timestamp = Date.now();
	return `${prefix}_${timestamp}`;
}

export function generateTestClientId(): string {
	const timestamp = Date.now();
	return `test-client-${timestamp}`;
}

export function generateTestState(length: number = 32): string {
	return crypto.randomBytes(length).toString("hex").substring(0, length);
}

/**
 * Helper function to obtain a JWT access token via OAuth2 authorization code flow
 */
export async function getTestAccessToken(
	app: Application,
	prisma: PrismaClient,
	testUserId: string,
	testClientId: string,
	redirectUri: string = "https://example.com/callback",
): Promise<string> {
	// Generate PKCE verifier and challenge
	const verifier = generateTestPKCEVerifier();
	const challenge = generateTestPKCEChallenge(verifier);

	// Create authorization code in database
	const authCode = generateTestAuthCode();
	await prisma.authorizationCode.create({
		data: {
			code: authCode,
			userId: testUserId,
			clientId: testClientId,
			redirectUri,
			scope: "read write",
			codeChallenge: challenge,
			codeChallengeMethod: "S256",
			expiresAt: new Date(Date.now() + 600000), // 10 minutes
		},
	});

	// Exchange code for token
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

	return tokenResponse.body.access_token;
}
