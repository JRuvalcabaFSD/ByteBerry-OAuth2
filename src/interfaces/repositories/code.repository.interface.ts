import { CodeEntity } from '@domain';

/**
 * Extends the global ServiceMap interface to include the IConfig interface.
 * This allows for type-safe access to configuration settings throughout the application.
 * @module @ServiceMap
 * @interface ServiceMap
 */

declare module '@ServiceMap' {
	interface ServiceMap {
		CodeRepository: ICodeRepository;
	}
}

/**
 * Repository interface for managing OAuth 2.0 authorization codes.
 *
 * This interface defines the contract for persisting and retrieving authorization codes
 * used in the OAuth 2.0 authorization code flow. Implementations should handle the storage,
 * retrieval, and cleanup of authorization codes with their associated metadata.
 *
 * @interface IAuthCodeRepository
 *
 * @example
 * ```typescript
 * class InMemoryAuthCodeRepository implements IAuthCodeRepository {
 *   async save(code: AuthCodeEntity): Promise<void> {
 *     // Implementation
 *   }
 *
 *   async findByCode(code: string): Promise<AuthCodeEntity | null> {
 *     // Implementation
 *   }
 *
 *   async cleanup(): Promise<void> {
 *     // Implementation
 *   }
 * }
 * ```
 */

export interface ICodeRepository {
	save(code: CodeEntity): Promise<void>;
	findByCode(code: string): Promise<CodeEntity | null>;
	cleanup(): Promise<void>;
}
