/**
 * Represents the possible categories of errors that can occur within the domain layer.
 *
 * - `'bootstrap'`: Errors related to the application bootstrap process.
 * - `'config'`: Errors related to configuration issues.
 * - `'container'`: Errors related to dependency injection or service container.
 * - `'http'`: Errors related to HTTP requests or responses.
 * - `'domain'`: Errors specific to domain logic or business rules.
 * - `'oauth'`: Errors related to OAuth authentication or authorization.
 */

export type ErrorType = 'bootstrap' | 'config' | 'container' | 'http' | 'domain' | 'oauth';

export class AppError extends Error {
	public readonly errorType: ErrorType;
	public readonly context?: Record<string, unknown>;
	constructor(msg: string, errorType: ErrorType, context?: Record<string, unknown>) {
		super(msg);
		this.name = 'AppError';
		this.errorType = errorType;
		this.context = context;

		Error.captureStackTrace(this, AppError);
	}
}

/**
 * Represents an error that occurs when a value object validation or construction fails.
 *
 * This error extends {@link AppError} and is used throughout the domain layer to indicate
 * issues with value object creation, validation, or manipulation. It automatically captures
 * the stack trace and sets the error name to 'ValueObjectError'.
 *
 * @extends AppError
 *
 * @example
 * ```typescript
 * if (!isValidEmail(email)) {
 *   throw new ValueObjectError('Invalid email format');
 * }
 * ```
 */

export class ValueObjectError extends AppError {
	constructor(msg: string) {
		super(msg, 'domain');
		this.name = 'ValueObjectError';

		Error.captureStackTrace(this, ValueObjectError);
	}
}

/**
 * Error thrown when there is a failure during the creation of a client entity.
 *
 * Extends the {@link AppError} class and sets the error domain to 'domain'.
 *
 * @remarks
 * This error is typically used to indicate domain-specific issues encountered
 * while attempting to create a new client entity within the application.
 *
 * @example
 * ```typescript
 * throw new ClientEntityCreateError('Failed to create client entity due to validation error.');
 * ```
 */

export class ClientEntityCreateError extends AppError {
	constructor(msg: string) {
		super(msg, 'domain');
		this.name = 'ClientEntityCreateError';
		Error.captureStackTrace(this, ClientEntityCreateError);
	}
}

/**
 * Represents an error that occurs during client persistence operations within the domain layer.
 * Extends the {@link AppError} class to provide additional context specific to client-related persistence failures.
 *
 * @remarks
 * This error should be thrown when there is a failure in saving, updating, or retrieving client data from the persistence layer.
 *
 * @example
 * ```typescript
 * throw new ClientPersistenceError('Failed to save client data');
 * ```
 *
 * @param msg - A descriptive error message explaining the cause of the error.
 * @param options - Optional additional information or context for the error.
 */

export class ClientPersistenceError extends AppError {
	constructor(msg: string, options?: string) {
		super(msg, 'domain', { options });
		this.name = 'ClientPersistenceError';
		Error.captureStackTrace(this, ClientPersistenceError);
	}
}

/**
 * Error thrown when a system client is assigned an owner user, which is not allowed.
 *
 * System clients must not have an associated owner user, so the `owner_user_id` must be `null`.
 * This error indicates a violation of that domain rule.
 *
 * @extends AppError
 * @category Domain Error
 */

export class InvalidSystemClientOwnershipError extends AppError {
	constructor() {
		super('System clients cannot have an owner user. owner_user_id must be null', 'domain');
		this.name = 'InvalidSystemClientOwnershipError';

		Error.captureStackTrace(this, InvalidSystemClientOwnershipError);
	}
}

/**
 * Error thrown when a third-party client is created or managed without specifying an owner user.
 *
 * This error indicates that the `owner_user_id` property is required for third-party clients,
 * ensuring that every such client is associated with a valid user in the system.
 *
 * @extends AppError
 * @example
 * throw new InvalidThirdPartyClientOwnershipError();
 */

export class InvalidThirdPartyClientOwnershipError extends AppError {
	constructor() {
		super('Third-party clients must have an owner user. owner_user_id is required', 'domain');
		this.name = 'InvalidThirdPartyClientOwnershipError';

		Error.captureStackTrace(this, InvalidThirdPartyClientOwnershipError);
	}
}

/**
 * Error thrown when an attempt is made to modify a system client via the API.
 *
 * @remarks
 * System clients are protected entities that cannot be altered through API operations.
 * This error should be used to prevent unauthorized modifications to such clients.
 *
 * @example
 * ```typescript
 * throw new SystemClientCannotBeModifiedError('system-client-id');
 * ```
 *
 * @param clientId - The identifier of the system client that was attempted to be modified.
 *
 * @extends AppError
 */

export class SystemClientCannotBeModifiedError extends AppError {
	constructor(clientId: string) {
		super(`System client '${clientId}' cannot be modified via API`, 'domain');
		this.name = 'SystemClientCannotBeModifiedError';

		Error.captureStackTrace(this, SystemClientCannotBeModifiedError);
	}
}

/**
 * Error thrown when an attempt is made to delete a client that is marked as non-deletable.
 *
 * @remarks
 * This error indicates that the client with the specified `clientId` has the `is_deletable` property set to `false`,
 * and therefore cannot be deleted from the system.
 *
 * @example
 * ```typescript
 * throw new ClientNotDeletableError('client-123');
 * ```
 *
 * @extends AppError
 */

export class ClientNotDeletableError extends AppError {
	constructor(clientId: string) {
		super(`Client '${clientId}' cannot be deleted (is_deletable=false)`, 'domain');
		this.name = 'ClientNotDeletableError';

		Error.captureStackTrace(this, ClientNotDeletableError);
	}
}
