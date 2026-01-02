import { UserEntity } from '@domain';
import { IUserRepository } from '@interfaces';
import { Injectable } from '@shared';

export const MOCK_USERS: UserEntity[] = [
	// Admin user - full permissions
	UserEntity.create({
		id: 'user_mock_admin_001',
		email: 'admin@byteberry.dev',
		username: 'admin',
		passwordHash: 'admin123', // F1: Plain text - F2: bcrypt hash
		fullName: 'Administrador ByteBerry',
		roles: ['user', 'admin'],
		isActive: true,
		emailVerified: true,
		createdAt: new Date('2025-01-01T00:00:00Z'),
		updatedAt: new Date('2025-01-01T00:00:00Z'),
	}),

	// Regular user - standard permissions
	UserEntity.create({
		id: 'user_mock_user_002',
		email: 'user@byteberry.dev',
		username: 'usuario',
		passwordHash: 'user123', // F1: Plain text - F2: bcrypt hash
		fullName: 'Usuario Regular',
		roles: ['user'],
		isActive: true,
		emailVerified: true,
		createdAt: new Date('2025-01-02T00:00:00Z'),
		updatedAt: new Date('2025-01-02T00:00:00Z'),
	}),

	// Demo user - standard permissions
	UserEntity.create({
		id: 'user_mock_demo_003',
		email: 'demo@byteberry.dev',
		username: 'demo',
		passwordHash: 'demo123', // F1: Plain text - F2: bcrypt hash
		fullName: 'Usuario Demo',
		roles: ['user'],
		isActive: true,
		emailVerified: false,
		createdAt: new Date('2025-01-03T00:00:00Z'),
		updatedAt: new Date('2025-01-03T00:00:00Z'),
	}),
];

@Injectable({ name: 'UserRepository' })
export class InMemoryUserRepository implements Partial<IUserRepository> {
	public async findByEmail(email: string): Promise<UserEntity | null> {
		const normalizeEmail = email.toLowerCase().trim();
		const user = MOCK_USERS.find((user) => user.email === normalizeEmail);
		if (!user) return null;
		return UserEntity.create({ ...user });
	}

	// public async findByUserName(username: string): Promise<UserEntity | undefined> {
	// 	const normalizeUsername = username.toLowerCase().trim();
	// 	return MOCK_USERS.find((user) => user.username === normalizeUsername);
	// }
	// public async findById(id: string): Promise<UserEntity | undefined> {
	// 	return MOCK_USERS.find((user) => user.id === id);
	// }
	// public async validateCredentials(emailOrUsername: string, password: string): Promise<UserEntity | undefined> {
	// 	const user = (await this.findByEmail(emailOrUsername)) ?? ((await this.findByUserName(emailOrUsername)) as UserEntity);

	// 	if (!user) {
	// 		return undefined;
	// 	}

	// 	if (!user.validatePassword(password)) {
	// 		return undefined;
	// 	}

	// 	return user;
	// }
}
