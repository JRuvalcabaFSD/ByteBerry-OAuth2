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
	{
		email: 'admin@byteberry.dev',
		username: 'admin',
		password: 'admin123', // Will be hashed
		fullName: 'Administrator User',
		roles: ['user', 'admin'],
		isActive: true,
		emailVerified: true,
	},
	{
		email: 'user@byteberry.dev',
		username: 'user',
		password: 'user123', // Will be hashed
		fullName: 'Regular User',
		roles: ['user'],
		isActive: true,
		emailVerified: true,
	},
	{
		email: 'demo@byteberry.dev',
		username: 'demo',
		password: 'demo123', // Will be hashed
		fullName: 'Demo User',
		roles: ['user'],
		isActive: true,
		emailVerified: false, // Email not verified for testing
	},
];

const OAUTH_CLIENT = {
	clientId: 'postman-123',
  clientSecret: 'secret-postman-123',
  clientName: 'Postman Testing Client',
	redirectUris: ['http://localhost:5173/callback', 'https://oauth.pstmn.io/v1/callback', 'https://myapp.com/oauth/callback'],
	grantTypes: ['authorization_code', 'refresh_token'],
  isPublic: false,
  isActive: true,
  userId: ''
};

const SCOPE_DEFINITIONS = [
	{
		name: 'read',
		description: 'Read access to user data and resources',
		isDefault: true, // Auto-granted
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

/**
 * Hash a password using bcrypt
 */
async function hashPassword(password: string): Promise<string> {
	return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * Log with timestamp
 */
function log(message: string): void {
	console.log(`[${new Date().toISOString()}] ${message}`);
}

/**
 * Log success message
 */
function logSuccess(message: string): void {
	console.log(`✅ ${message}`);
}

/**
 * Log error message
 */
function logError(message: string, error?: unknown): void {
	console.error(`❌ ${message}`);
	if (error) {
		console.error(error);
	}
}

// ============================================================================
// CLEANUP FUNCTIONS
// ============================================================================

/**
 * Clean all data from database before seeding
 * IMPORTANT: Order matters due to foreign key constraints
 */
async function cleanDatabase(): Promise<void> {
	log('Starting database cleanup...');

	try {
		// Delete in correct order (children first, parents last)
		await prisma.userConsent.deleteMany();
		logSuccess('Deleted all user consents');

		await prisma.authorizationCode.deleteMany();
		logSuccess('Deleted all authorization codes');

		await prisma.session.deleteMany();
		logSuccess('Deleted all sessions');

		await prisma.oAuthClient.deleteMany();
		logSuccess('Deleted all OAuth clients');

		await prisma.user.deleteMany();
		logSuccess('Deleted all users');

		await prisma.scopeDefinition.deleteMany();
		logSuccess('Deleted all scope definitions');

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
 * Seed users with hashed passwords
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
				},
			});

			logSuccess(`Created user: ${user.email} (${user.username})`);
		}

		logSuccess(`Seeded ${USERS.length} users`);
	} catch (error) {
		logError('User seeding failed', error);
		throw error;
	}
}

/**
 * Seed OAuth2 client with hashed secret
 */
async function seedOAuthClient(): Promise<void> {
  log('Seeding OAuth client...');

  try {
    // Get admin user
    const adminUser = await prisma.user.findUnique({
      where: { email: 'admin@byteberry.dev' }
    });

    if (!adminUser) {
      throw new Error('Admin user not found');
    }

    const clientSecretHash = await hashPassword(OAUTH_CLIENT.clientSecret);

    const client = await prisma.oAuthClient.create({
      data: {
        ...OAUTH_CLIENT,
        clientSecret: clientSecretHash,
        userId: adminUser.id, // ✅ NUEVO
      },
    });

    logSuccess(`Created OAuth client: ${client.clientId}`);
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
 * Verify seeded data
 */
async function verifySeededData(): Promise<void> {
	log('Verifying seeded data...');

	try {
		const userCount = await prisma.user.count();
		const clientCount = await prisma.oAuthClient.count();
		const scopeCount = await prisma.scopeDefinition.count();

		log(`Users in database: ${userCount}`);
		log(`OAuth clients in database: ${clientCount}`);
		log(`Scope definitions in database: ${scopeCount}`);

		if (userCount !== USERS.length) {
			throw new Error(`Expected ${USERS.length} users, found ${userCount}`);
		}

		if (clientCount !== 1) {
			throw new Error(`Expected 1 OAuth client, found ${clientCount}`);
		}

		if (scopeCount !== SCOPE_DEFINITIONS.length) {
			throw new Error(`Expected ${SCOPE_DEFINITIONS.length} scopes, found ${scopeCount}`);
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
		// Step 1: Clean existing data
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
			log(`  - ${user.email} / ${user.password} (roles: ${user.roles.join(', ')})`);
		});
		log('');
		log('OAuth Client:');
		log(`  - Client ID: ${OAUTH_CLIENT.clientId}`);
		log(`  - Client Secret: ${OAUTH_CLIENT.clientSecret}`);
		log('');
		log('Scopes:');
		SCOPE_DEFINITIONS.forEach((scope) => {
			log(`  - ${scope.name}: ${scope.description}`);
		});
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
