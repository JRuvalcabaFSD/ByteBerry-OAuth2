import { UserEntity } from '@domain';

/**
 * Extends the global ServiceMap interface to include the IConfig interface.
 * This allows for type-safe access to configuration settings throughout the application.
 * @module @ServiceMap
 * @interface ServiceMap
 */

declare module '@ServiceMap' {
	interface ServiceMap {
		UserRepository: IUserRepository;
	}
}

//TODO documentar
export interface IUserRepository {
	findByEmail(email: string): Promise<UserEntity | null>;
	findByUserName(username: string): Promise<UserEntity | null>;
	findById(id: string): Promise<UserEntity | null>;
	validateCredentials(emailOrUsername: string, password: string): Promise<UserEntity | null>;
	save(user: UserEntity): Promise<void>;
	update(user: UserEntity): Promise<void>;
}
