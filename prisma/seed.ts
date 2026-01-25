import * as bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

// Constants
const BCRYPT_ROUNDS = 10;

// ============================================================================
// SEED DATA DEFINITIONS
// ============================================================================

const USERS = [
	// HYBRID - Admin con todas las features
	{
		email: 'admin@byteberry.dev',
		username: 'admin',
		password: 'admin123',
		fullName: 'Administrator User',
		roles: ['user', 'admin'],
		isActive: true,
		emailVerified: true,
		isDeveloper: true,
		canUseExpenses: true,
		developerEnabledAt: new Date(),
		expensesEnabledAt: new Date(),
	},
	// USER - Solo expense tracking
	{
		email: 'user@byteberry.dev',
		username: 'user',
		password: 'user123',
		fullName: 'Regular User',
		roles: ['user'],
		isActive: true,
		emailVerified: true,
		isDeveloper: false,
		canUseExpenses: true,
		developerEnabledAt: null,
		expensesEnabledAt: new Date(),
	},
	// DEVELOPER - Solo OAuth client creation
	{
		email: 'developer@byteberry.dev',
		username: 'developer',
		password: 'dev123',
		fullName: 'Developer User',
		roles: ['user'],
		isActive: true,
		emailVerified: true,
		isDeveloper: true,
		canUseExpenses: false,
		developerEnabledAt: new Date(),
		expensesEnabledAt: null,
	},
	// USER - Demo user sin email verificado
	{
		email: 'demo@byteberry.dev',
		username: 'demo',
		password: 'demo123',
		fullName: 'Demo User',
		roles: ['user'],
		isActive: true,
		emailVerified: false,
		isDeveloper: false,
		canUseExpenses: true,
		developerEnabledAt: null,
		expensesEnabledAt: new Date(),
	},
];

const OAUTH_CLIENT = {
	clientId: 'postman-testing-client',
	clientSecret: 'secret-postman-123',
	clientName: 'Postman Testing Client',
	redirectUris: [
		'http://localhost:5173/callback',
		'https://oauth.pstmn.io/v1/callback',
		'https://myapp.com/oauth/callback',
	],
	grantTypes: ['authorization_code', 'refresh_token'],
	isPublic: false,
	isActive: true,
	isSystemClient: false, // ✅ IMPORTANTE: Este NO es system client
	systemRole: null,
};

const SCOPE_DEFINITIONS = [
	{
		name: 'read',
		description: 'Read access to user data and resources',
		isDefault: true,
	},
	{
		name: 'write',
		description: 'Write access to create and modify resources',
		isDefault: false,
	},
	{
		name: 'admin',
		description: 'Full administrative access to all resources',
		isDefault: false,
	},
];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

async function hashPassword(password: string): Promise<string> {
	return bcrypt.hash(password, BCRYPT_ROUNDS);
}

function log(message: string): void {
	console.log(`[${new Date().toISOString()}] ${message}`);
}

function logSuccess(message: string): void {
	console.log(`✅ ${message}`);
}

function logError(message: string, error?: unknown): void {
	console.error(`❌ ${message}`);
	if (error) {
		console.error(error);
	}
}

function logWarning(message: string): void {
	console.warn(`⚠️  ${message}`);
}

// ============================================================================
// CLEANUP FUNCTIONS
// ============================================================================

/**
 * Clean all data from database before seeding
 * IMPORTANT:
 * - Preserves system clients (isSystemClient=true)
 * - Only deletes user-created clients
 * - Order matters due to foreign key constraints
 */
async function cleanDatabase(): Promise<void> {
	log('Starting database cleanup...');

	try {
		// ✅ CRÍTICO: Verificar si existen system clients ANTES de borrar
		const systemClients = await prisma.oAuthClient.findMany({
			where: { isSystemClient: true },
		});

		if (systemClients.length > 0) {
			logWarning(`Found ${systemClients.length} system client(s) - will be preserved:`);
			systemClients.forEach((client) => {
				logWarning(`  - ${client.clientId} (role: ${client.systemRole})`);
			});
		}

		// Delete in correct order (children first, parents last)

		// 1. Delete user consents (all can be deleted)
		await prisma.userConsent.deleteMany();
		logSuccess('Deleted all user consents');

		// 2. Delete authorization codes (all can be deleted)
		await prisma.authorizationCode.deleteMany();
		logSuccess('Deleted all authorization codes');

		// 3. Delete sessions (all can be deleted)
		await prisma.session.deleteMany();
		logSuccess('Deleted all sessions');

		// 4. ✅ Delete ONLY user-created OAuth clients (preserve system clients)
		const deletedClients = await prisma.oAuthClient.deleteMany({
			where: {
				isSystemClient: false, // ✅ Solo borrar clients de usuario
			},
		});
		logSuccess(`Deleted ${deletedClients.count} user-created OAuth client(s)`);

		// 5. Delete users (all can be deleted)
		await prisma.user.deleteMany();
		logSuccess('Deleted all users');

		// 6. Delete scope definitions (all can be deleted)
		await prisma.scopeDefinition.deleteMany();
		logSuccess('Deleted all scope definitions');

		// ✅ Verificar que system clients siguen ahí
		const remainingSystemClients = await prisma.oAuthClient.count({
			where: { isSystemClient: true },
		});

		if (remainingSystemClients > 0) {
			logSuccess(`✅ Preserved ${remainingSystemClients} system client(s)`);
		}

		logSuccess('Database cleanup completed');
	} catch (error) {
		logError('Database cleanup failed', error);
		throw error;
	}
}

// ============================================================================
// SEED FUNCTIONS
// ============================================================================

/**
 * Seed users with hashed passwords and account types
 */
async function seedUsers(): Promise<void> {
	log('Seeding users...');

	try {
		for (const userData of USERS) {
			const passwordHash = await hashPassword(userData.password);

			const user = await prisma.user.create({
				data: {
					email: userData.email,
					username: userData.username,
					passwordHash,
					fullName: userData.fullName,
					roles: userData.roles,
					isActive: userData.isActive,
					emailVerified: userData.emailVerified,
					isDeveloper: userData.isDeveloper,
					canUseExpenses: userData.canUseExpenses,
					developerEnabledAt: userData.developerEnabledAt,
					expensesEnabledAt: userData.expensesEnabledAt,
				},
			});

			// Calcular accountType para el log
			let accountType = 'USER';
			if (user.isDeveloper && user.canUseExpenses) {
				accountType = 'HYBRID';
			} else if (user.isDeveloper) {
				accountType = 'DEVELOPER';
			}

			logSuccess(`Created user: ${user.email} (${user.username}) - Type: ${accountType}`);
		}

		logSuccess(`Seeded ${USERS.length} users`);
	} catch (error) {
		logError('User seeding failed', error);
		throw error;
	}
}

/**
 * Seed OAuth2 client with hashed secret
 * NOTE: This creates a USER client for testing, NOT a system client
 */
async function seedOAuthClient(): Promise<void> {
	log('Seeding OAuth client...');

	try {
		// Get admin user (HYBRID account - can create clients)
		const adminUser = await prisma.user.findUnique({
			where: { email: 'admin@byteberry.dev' },
		});

		if (!adminUser) {
			throw new Error('Admin user not found');
		}

		const clientSecretHash = await hashPassword(OAUTH_CLIENT.clientSecret);

		const client = await prisma.oAuthClient.create({
			data: {
				clientId: OAUTH_CLIENT.clientId,
				clientSecret: clientSecretHash,
				clientName: OAUTH_CLIENT.clientName,
				redirectUris: OAUTH_CLIENT.redirectUris,
				grantTypes: OAUTH_CLIENT.grantTypes,
				isPublic: OAUTH_CLIENT.isPublic,
				isActive: OAUTH_CLIENT.isActive,
				isSystemClient: OAUTH_CLIENT.isSystemClient, // ✅ false
				systemRole: OAUTH_CLIENT.systemRole, // ✅ null
				userId: adminUser.id, // ✅ Owned by admin
			},
		});

		logSuccess(`Created OAuth client: ${client.clientId} (owner: ${adminUser.email})`);
	} catch (error) {
		logError('OAuth client seeding failed', error);
		throw error;
	}
}

/**
 * Seed scope definitions
 */
async function seedScopeDefinitions(): Promise<void> {
	log('Seeding scope definitions...');

	try {
		for (const scopeData of SCOPE_DEFINITIONS) {
			const scope = await prisma.scopeDefinition.create({
				data: scopeData,
			});

			logSuccess(`Created scope: ${scope.name} (default: ${scope.isDefault})`);
		}

		logSuccess(`Seeded ${SCOPE_DEFINITIONS.length} scope definitions`);
	} catch (error) {
		logError('Scope definition seeding failed', error);
		throw error;
	}
}

// ============================================================================
// VERIFICATION FUNCTIONS
// ============================================================================

/**
 * Verify seeded data including account types and system clients
 */
async function verifySeededData(): Promise<void> {
	log('Verifying seeded data...');

	try {
		const userCount = await prisma.user.count();
		const userClientCount = await prisma.oAuthClient.count({
			where: { isSystemClient: false },
		});
		const systemClientCount = await prisma.oAuthClient.count({
			where: { isSystemClient: true },
		});
		const scopeCount = await prisma.scopeDefinition.count();

		// Verificar distribución de account types
		const hybridCount = await prisma.user.count({
			where: { isDeveloper: true, canUseExpenses: true },
		});
		const developerCount = await prisma.user.count({
			where: { isDeveloper: true, canUseExpenses: false },
		});
		const userOnlyCount = await prisma.user.count({
			where: { isDeveloper: false, canUseExpenses: true },
		});

		log(`Users in database: ${userCount}`);
		log(`  - HYBRID accounts: ${hybridCount}`);
		log(`  - DEVELOPER accounts: ${developerCount}`);
		log(`  - USER accounts: ${userOnlyCount}`);
		log(`OAuth clients in database:`);
		log(`  - User clients: ${userClientCount}`);
		log(`  - System clients: ${systemClientCount}`); // ✅ Mostrar system clients
		log(`Scope definitions in database: ${scopeCount}`);

		// Validaciones
		if (userCount !== USERS.length) {
			throw new Error(`Expected ${USERS.length} users, found ${userCount}`);
		}

		if (userClientCount !== 1) {
			throw new Error(`Expected 1 user OAuth client, found ${userClientCount}`);
		}

		if (scopeCount !== SCOPE_DEFINITIONS.length) {
			throw new Error(`Expected ${SCOPE_DEFINITIONS.length} scopes, found ${scopeCount}`);
		}

		// Verificar que tenemos al menos un usuario de cada tipo
		if (hybridCount === 0) {
			throw new Error('Expected at least one HYBRID account');
		}
		if (developerCount === 0) {
			throw new Error('Expected at least one DEVELOPER account');
		}
		if (userOnlyCount === 0) {
			throw new Error('Expected at least one USER account');
		}

		// ✅ Mostrar info de system clients si existen
		if (systemClientCount > 0) {
			const systemClients = await prisma.oAuthClient.findMany({
				where: { isSystemClient: true },
			});
			log('');
			logSuccess('System clients preserved:');
			systemClients.forEach((client) => {
				log(`  - ${client.clientId} (role: ${client.systemRole})`);
			});
		}

		logSuccess('Data verification passed');
	} catch (error) {
		logError('Data verification failed', error);
		throw error;
	}
}

// ============================================================================
// MAIN SEED FUNCTION
// ============================================================================

async function main() {
	log('========================================');
	log('Starting database seed process...');
	log('========================================');

	try {
		// Step 1: Clean existing data (preserves system clients)
		await cleanDatabase();
		log('');

		// Step 2: Seed users
		await seedUsers();
		log('');

		// Step 3: Seed OAuth client
		await seedOAuthClient();
		log('');

		// Step 4: Seed scope definitions
		await seedScopeDefinitions();
		log('');

		// Step 5: Verify seeded data
		await verifySeededData();
		log('');

		log('========================================');
		logSuccess('Database seed completed successfully!');
		log('========================================');

		// Print credentials for reference
		log('');
		log('📋 SEEDED CREDENTIALS:');
		log('');
		log('Users:');
		USERS.forEach((user) => {
			let accountType = 'USER';
			if (user.isDeveloper && user.canUseExpenses) {
				accountType = 'HYBRID';
			} else if (user.isDeveloper) {
				accountType = 'DEVELOPER';
			}

			log(`  - ${user.email} / ${user.password}`);
			log(`    Roles: ${user.roles.join(', ')}`);
			log(`    Account Type: ${accountType}`);
			log(`    Can Create Clients: ${user.isDeveloper}`);
			log(`    Can Use Expenses: ${user.canUseExpenses}`);
			log('');
		});
		log('OAuth Client (User-created):');
		log(`  - Client ID: ${OAUTH_CLIENT.clientId}`);
		log(`  - Client Secret: ${OAUTH_CLIENT.clientSecret}`);
		log(`  - Owner: admin@byteberry.dev`);
		log('');
		log('Scopes:');
		SCOPE_DEFINITIONS.forEach((scope) => {
			log(`  - ${scope.name}: ${scope.description}`);
		});
		log('');
		log('💡 TESTING TIPS:');
		log('  - Use admin@byteberry.dev to test HYBRID features (expenses + clients)');
		log('  - Use developer@byteberry.dev to test DEVELOPER-only features (clients only)');
		log('  - Use user@byteberry.dev to test USER-only features (expenses only)');
		log('  - Try upgrading user@byteberry.dev to developer with PUT /user/me/upgrade/developer');
		log('  - System clients (like BFF) are preserved and will not be deleted');
		log('');
	} catch (error) {
		logError('Seed process failed', error);
		process.exit(1);
	}
}

// ============================================================================
// EXECUTE SEED
// ============================================================================

main()
	.catch((error) => {
		logError('Unhandled error during seed', error);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
