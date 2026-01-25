/**
 * Database Helper para tests de integración
 */

import type { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

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
	prisma: PrismaClient,
): Promise<TestDatabaseSeed> {
	// Usuario de prueba
	const unique = Date.now() + "-" + Math.floor(Math.random() * 10000);
	const passwordPlain = "Test123!@#";
	const passwordHash = await bcrypt.hash(passwordPlain, 10);

	console.log("[seedTestDatabase] Creando usuario de prueba...");
	const testUser = await prisma.user.create({
		data: {
			email: `test-${unique}@byteberry.test`,
			username: `testuser_${unique}`,
			passwordHash,
			fullName: "Test User",
			roles: ["user"],
			isActive: true,
			emailVerified: true,
			isDeveloper: false,
			canUseExpenses: true,
			developerEnabledAt: null,
			expensesEnabledAt: null,
		},
	});
	console.log("[seedTestDatabase] Usuario creado:", testUser.id);

	// Verificar que el usuario existe realmente en la base de datos
	const userExists = await prisma.user.findUnique({
		where: { id: testUser.id },
	});
	if (!userExists) {
		throw new Error(
			`[seedTestDatabase] El usuario de prueba no fue persistido correctamente. ID: ${testUser.id}`,
		);
	}
	console.log("[seedTestDatabase] Usuario verificado en DB:", userExists.id);

	// Scopes con nombres únicos para evitar conflictos
	const scopeDefinitions = await Promise.all([
		prisma.scopeDefinition.create({
			data: {
				name: `read_${unique}`,
				description: "Read access",
				isDefault: true,
			},
		}),
		prisma.scopeDefinition.create({
			data: {
				name: `write_${unique}`,
				description: "Write access",
				isDefault: false,
			},
		}),
		prisma.scopeDefinition.create({
			data: {
				name: `admin_${unique}`,
				description: "Admin access",
				isDefault: false,
			},
		}),
	]);

	console.log(
		"[seedTestDatabase] Creando cliente OAuth2 para userId:",
		testUser.id,
	);
	const clientSecretPlain = "test-client-secret-123";
	const clientSecret = await bcrypt.hash(clientSecretPlain, 10);
	const testClient = await prisma.oAuthClient.create({
		data: {
			clientId: `test-client-id-${unique}`,
			clientSecret,
			clientName: "Test OAuth Client",
			redirectUris: [
				"http://localhost:5173/callback",
				"http://localhost:4003/callback",
			],
			grantTypes: ["authorization_code", "refresh_token"],
			isPublic: false,
			isActive: true,
			userId: testUser.id,
			isSystemClient: false,
			systemRole: null,
		},
	});
	console.log("[seedTestDatabase] Cliente OAuth2 creado:", testClient.id);

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
export async function seedTestDatabaseUserOnly(prisma: PrismaClient): Promise<{
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
	// Usuario de prueba con datos únicos para evitar conflictos
	const unique = Date.now() + "-" + Math.floor(Math.random() * 10000);
	const passwordPlain = "Test123!@#";
	const passwordHash = await bcrypt.hash(passwordPlain, 10);

	const testUser = await prisma.user.create({
		data: {
			email: `test-${unique}@byteberry.test`,
			username: `testuser_${unique}`,
			passwordHash,
			fullName: "Test User",
			roles: ["user"],
			isActive: true,
			emailVerified: true,
			isDeveloper: false,
			canUseExpenses: true,
			developerEnabledAt: null,
			expensesEnabledAt: null,
		},
	});

	// Scopes
	const scopeDefinitions = await Promise.all([
		prisma.scopeDefinition.create({
			data: {
				name: "read",
				description: "Read access",
				isDefault: true,
			},
		}),
		prisma.scopeDefinition.create({
			data: {
				name: "write",
				description: "Write access",
				isDefault: false,
			},
		}),
		prisma.scopeDefinition.create({
			data: {
				name: "admin",
				description: "Admin access",
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
		scopes: scopeDefinitions.map((scope) => ({
			id: scope.id,
			name: scope.name,
			description: scope.description,
			isDefault: scope.isDefault,
		})),
	};
}

/**
 * Tipos de cuenta disponibles para tests
 */
export type TestAccountType = "user" | "developer" | "hybrid";

/**
 * Datos de usuario de prueba con información de account type
 */
export interface TestUserData {
	id: string;
	email: string;
	username: string;
	passwordHash: string;
	passwordPlain: string;
	isDeveloper: boolean;
	canUseExpenses: boolean;
	developerEnabledAt: Date | null;
	expensesEnabledAt: Date | null;
}

/**
 * Crea un usuario de prueba con un account type específico
 * @param prisma - Cliente Prisma
 * @param accountType - Tipo de cuenta: 'user', 'developer', o 'hybrid'
 * @param options - Opciones adicionales para personalizar el usuario
 */
export async function createTestUser(
	prisma: PrismaClient,
	accountType: TestAccountType,
	options?: {
		email?: string;
		username?: string;
		password?: string;
		fullName?: string;
	},
): Promise<TestUserData> {
	const passwordPlain = options?.password ?? "Test123!@#";
	const passwordHash = await bcrypt.hash(passwordPlain, 10);
	const now = new Date();

	// Determinar flags según el account type
	let isDeveloper = false;
	let canUseExpenses = false;
	let developerEnabledAt: Date | null = null;
	let expensesEnabledAt: Date | null = null;

	switch (accountType) {
		case "user":
			isDeveloper = false;
			canUseExpenses = true;
			expensesEnabledAt = now;
			break;
		case "developer":
			isDeveloper = true;
			canUseExpenses = false;
			developerEnabledAt = now;
			break;
		case "hybrid":
			isDeveloper = true;
			canUseExpenses = true;
			developerEnabledAt = now;
			expensesEnabledAt = now;
			break;
	}

	const email = options?.email ?? `${accountType}@byteberry.test`;
	const username = options?.username ?? `${accountType}user`;

	const user = await prisma.user.create({
		data: {
			email,
			username,
			passwordHash,
			fullName: options?.fullName ?? `Test ${accountType} User`,
			roles: ["user"],
			isActive: true,
			emailVerified: true,
			isDeveloper,
			canUseExpenses,
			developerEnabledAt,
			expensesEnabledAt,
		},
	});

	return {
		id: user.id,
		email: user.email,
		username: user.username!,
		passwordHash,
		passwordPlain,
		isDeveloper: user.isDeveloper,
		canUseExpenses: user.canUseExpenses,
		developerEnabledAt: user.developerEnabledAt,
		expensesEnabledAt: user.expensesEnabledAt,
	};
}

/**
 * Siembra la base de datos con un usuario developer y scopes
 * Útil para tests de clientes que requieren acceso de developer
 */
export async function seedTestDatabaseWithDeveloper(
	prisma: PrismaClient,
): Promise<{
	testUser: TestUserData;
	scopes: Array<{
		id: string;
		name: string;
		description: string;
		isDefault: boolean;
	}>;
}> {
	const testUser = await createTestUser(prisma, "developer");

	// Scopes con nombres únicos para evitar conflictos
	const unique = Date.now() + "-" + Math.floor(Math.random() * 10000);
	const scopeDefinitions = await Promise.all([
		prisma.scopeDefinition.create({
			data: {
				name: `read_${unique}`,
				description: "Read access",
				isDefault: true,
			},
		}),
		prisma.scopeDefinition.create({
			data: {
				name: `write_${unique}`,
				description: "Write access",
				isDefault: false,
			},
		}),
		prisma.scopeDefinition.create({
			data: {
				name: `admin_${unique}`,
				description: "Admin access",
				isDefault: false,
			},
		}),
	]);

	return {
		testUser,
		scopes: scopeDefinitions.map((s) => ({
			id: s.id,
			name: s.name,
			description: s.description,
			isDefault: s.isDefault,
		})),
	};
}

/**
 * Siembra la base de datos con un usuario developer, un cliente OAuth2 y scopes
 * Útil para tests de clientes que requieren acceso de developer con datos iniciales
 */
export async function seedTestDatabaseWithDeveloperAndClient(
	prisma: PrismaClient,
): Promise<TestDatabaseSeed> {
	// Usuario developer de prueba
	const unique = Date.now() + "-" + Math.floor(Math.random() * 10000);
	const passwordPlain = "Test123!@#";
	const passwordHash = await bcrypt.hash(passwordPlain, 10);

	console.log(
		"[seedTestDatabaseWithDeveloperAndClient] Creando usuario developer...",
	);
	const testUser = await prisma.user.create({
		data: {
			email: `test-dev-${unique}@byteberry.test`,
			username: `testdev_${unique}`,
			passwordHash,
			fullName: "Test Developer User",
			roles: ["user", "developer"],
			isActive: true,
			emailVerified: true,
			isDeveloper: true,
			canUseExpenses: true,
			developerEnabledAt: new Date(),
			expensesEnabledAt: null,
		},
	});

	// Scopes con nombres únicos para evitar conflictos
	const scopeDefinitions = await Promise.all([
		prisma.scopeDefinition.create({
			data: {
				name: `read_${unique}`,
				description: "Read access",
				isDefault: true,
			},
		}),
		prisma.scopeDefinition.create({
			data: {
				name: `write_${unique}`,
				description: "Write access",
				isDefault: false,
			},
		}),
		prisma.scopeDefinition.create({
			data: {
				name: `admin_${unique}`,
				description: "Admin access",
				isDefault: false,
			},
		}),
	]);

	console.log(
		"[seedTestDatabaseWithDeveloperAndClient] Creando cliente OAuth2 para userId:",
		testUser.id,
	);
	const clientSecretPlain = "test-client-secret-123";
	const clientSecret = await bcrypt.hash(clientSecretPlain, 10);
	const testClient = await prisma.oAuthClient.create({
		data: {
			clientId: `test-client-id-${unique}`,
			clientSecret,
			clientName: "Test Developer Client",
			redirectUris: [
				"http://localhost:5173/callback",
				"http://localhost:4003/callback",
			],
			grantTypes: ["authorization_code", "refresh_token"],
			isPublic: false,
			isActive: true,
			userId: testUser.id,
			isSystemClient: false,
			systemRole: null,
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
 * Siembra solo los scopes (útil cuando se crean usuarios manualmente)
 */
export async function seedScopes(prisma: PrismaClient): Promise<
	Array<{
		id: string;
		name: string;
		description: string;
		isDefault: boolean;
	}>
> {
	const scopeDefinitions = await Promise.all([
		prisma.scopeDefinition.create({
			data: {
				name: "read",
				description: "Read access",
				isDefault: true,
			},
		}),
		prisma.scopeDefinition.create({
			data: {
				name: "write",
				description: "Write access",
				isDefault: false,
			},
		}),
		prisma.scopeDefinition.create({
			data: {
				name: "admin",
				description: "Admin access",
				isDefault: false,
			},
		}),
	]);

	return scopeDefinitions.map((s) => ({
		id: s.id,
		name: s.name,
		description: s.description,
		isDefault: s.isDefault,
	}));
}
