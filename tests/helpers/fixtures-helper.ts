/**
 * Fixtures Helper - Generadores de datos de prueba
 */

import crypto from 'node:crypto';

export function generateTestPKCEVerifier(byteLength: number = 32): string {
	const buffer = crypto.randomBytes(byteLength);
	return buffer
		.toString('base64')
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=/g, '');
}

export function generateTestPKCEChallenge(verifier: string): string {
	return crypto.createHash('sha256').update(verifier).digest('base64url');
}

export function generateTestAuthCode(): string {
	const timestamp = Date.now();
	const random = crypto.randomBytes(6).toString('hex');
	return `TEST_CODE_${timestamp}_${random}`;
}

export function generateTestEmail(prefix: string = 'test'): string {
	const timestamp = Date.now();
	const random = crypto.randomBytes(4).toString('hex');
	return `${prefix}_${timestamp}_${random}@byteberry.test`;
}

export function generateTestUsername(prefix: string = 'testuser'): string {
	const timestamp = Date.now();
	return `${prefix}_${timestamp}`;
}

export function generateTestClientId(): string {
	const timestamp = Date.now();
	return `test-client-${timestamp}`;
}

export function generateTestState(length: number = 32): string {
	return crypto.randomBytes(length).toString('hex').substring(0, length);
}
