/**
 * Database Helper para tests de integración
 */

import type { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

/**
 * Limpia TODAS las tablas de la base de datos
 * IMPORTANTE: Respeta el orden de las foreign keys
 */
export async function cleanDatabase(prisma: PrismaClient): Promise<void> {
	// Orden CRÍTICO: Primero tablas con FK, después las referenciadas
	await prisma.userConsent.deleteMany({});
	await prisma.authorizationCode.deleteMany({});
	await prisma.session.deleteMany({});
	await prisma.oAuthClient.deleteMany({});
	await prisma.user.deleteMany({});
	await prisma.scopeDefinition.deleteMany({});
}

/**
 * Datos de prueba que retorna seedTestDatabase
 */
export interface TestDatabaseSeed {
	testUser: {
		id: string;
		email: string;
		username: string;
		passwordHash: string;
		passwordPlain: string;
	};
	testClient: {
		id: string;
		clientId: string;
		clientSecret: string;
		clientSecretPlain: string;
		clientName: string;
		redirectUris: string[];
		grantTypes: string[];
		isPublic: boolean;
	};
	scopes: Array<{
		id: string;
		name: string;
		description: string;
		isDefault: boolean;
	}>;
}

/**
 * Siembra datos mínimos necesarios para tests
 */
export async function seedTestDatabase(
	prisma: PrismaClient
): Promise<TestDatabaseSeed> {
	// Usuario de prueba
	const passwordPlain = 'Test123!@#';
	const passwordHash = await bcrypt.hash(passwordPlain, 10);

	const testUser = await prisma.user.create({
		data: {
			email: 'test@byteberry.test',
			username: 'testuser',
			passwordHash,
			fullName: 'Test User',
			roles: ['user'],
			isActive: true,
			emailVerified: true,
		},
	});

	// Scopes
	const scopeDefinitions = await Promise.all([
		prisma.scopeDefinition.create({
			data: {
				name: 'read',
				description: 'Read access',
				isDefault: true,
			},
		}),
		prisma.scopeDefinition.create({
			data: {
				name: 'write',
				description: 'Write access',
				isDefault: false,
			},
		}),
		prisma.scopeDefinition.create({
			data: {
				name: 'admin',
				description: 'Admin access',
				isDefault: false,
			},
		}),
	]);

	// Cliente OAuth2
	const clientSecretPlain = 'test-client-secret-123';
	const clientSecret = await bcrypt.hash(clientSecretPlain, 10);

	const testClient = await prisma.oAuthClient.create({
		data: {
			clientId: 'test-client-id',
			clientSecret,
			clientName: 'Test OAuth Client',
			redirectUris: [
				'http://localhost:5173/callback',
				'http://localhost:4003/callback',
			],
			grantTypes: ['authorization_code', 'refresh_token'],
			isPublic: false,
			isActive: true,
			userId: testUser.id,
		},
	});

	return {
		testUser: {
			id: testUser.id,
			email: testUser.email,
			username: testUser.username!,
			passwordHash,
			passwordPlain,
		},
		testClient: {
			id: testClient.id,
			clientId: testClient.clientId,
			clientSecret,
			clientSecretPlain,
			clientName: testClient.clientName,
			redirectUris: testClient.redirectUris,
			grantTypes: testClient.grantTypes,
			isPublic: testClient.isPublic,
		},
		scopes: scopeDefinitions.map((s) => ({
			id: s.id,
			name: s.name,
			description: s.description,
			isDefault: s.isDefault,
		})),
	};
}

/**
 * Verifica que la DB esté vacía
 */
export async function isDatabaseEmpty(prisma: PrismaClient): Promise<boolean> {
	const counts = await Promise.all([
		prisma.user.count(),
		prisma.oAuthClient.count(),
		prisma.authorizationCode.count(),
		prisma.session.count(),
		prisma.userConsent.count(),
		prisma.scopeDefinition.count(),
	]);

	return counts.every((count) => count === 0);
}

/**
 * Siembra solo el usuario y scopes (sin cliente OAuth)
 * Útil para tests de clientes donde se necesita una DB limpia de clientes
 */
export async function seedTestDatabaseUserOnly(
	prisma: PrismaClient
): Promise<{
	testUser: {
		id: string;
		email: string;
		username: string;
		passwordHash: string;
		passwordPlain: string;
	};
	scopes: Array<{
		id: string;
		name: string;
		description: string;
		isDefault: boolean;
	}>;
}> {
	// Usuario de prueba
	const passwordPlain = 'Test123!@#';
	const passwordHash = await bcrypt.hash(passwordPlain, 10);

	const testUser = await prisma.user.create({
		data: {
			email: 'test@byteberry.test',
			username: 'testuser',
			passwordHash,
			fullName: 'Test User',
			roles: ['user'],
			isActive: true,
			emailVerified: true,
		},
	});

	// Scopes
	const scopeDefinitions = await Promise.all([
		prisma.scopeDefinition.create({
			data: {
				name: 'read',
				description: 'Read access',
				isDefault: true,
			},
		}),
		prisma.scopeDefinition.create({
			data: {
				name: 'write',
				description: 'Write access',
				isDefault: false,
			},
		}),
		prisma.scopeDefinition.create({
			data: {
				name: 'admin',
				description: 'Admin access',
				isDefault: false,
			},
		}),
	]);

	return {
		testUser: {
			id: testUser.id,
			email: testUser.email,
			username: testUser.username!,
			passwordHash,
			passwordPlain,
		},
		scopes: scopeDefinitions.map((s) => ({
			id: s.id,
			name: s.name,
			description: s.description,
			isDefault: s.isDefault,
		})),
	};
}
