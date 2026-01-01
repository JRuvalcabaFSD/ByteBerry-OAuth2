import { AppError } from '@domain';
import { Token } from '@interfaces';

/**
 * Represents an error that occurs within a dependency injection container.
 *
 * Extends the {@link AppError} class and includes the token associated with the error.
 *
 * @remarks
 * This error is typically thrown when there is a problem resolving or instantiating a dependency.
 *
 * @example
 * ```typescript
 * throw new ContainerError('Failed to resolve dependency', SomeToken);
 * ```
 *
 * @param msg - A descriptive error message.
 * @param token - The token related to the dependency that caused the error.
 */

export class ContainerError extends AppError {
	public readonly token: Token;
	constructor(msg: string, token: Token) {
		super(msg, 'container');
		this.token = token;
		this.name = 'ContainerError';

		Error.captureStackTrace(this, ContainerError);
	}
}

/**
 * Error thrown when attempting to create or resolve a service from the container
 * that has not been registered.
 *
 * @remarks
 * This error extends {@link ContainerError} and provides additional context
 * by including the token of the unregistered service.
 *
 * @example
 * ```typescript
 * throw new ContainerCreationError(MyServiceToken);
 * ```
 *
 * @param token - The token representing the service that was not registered.
 * @extends ContainerError
 * @public
 */

export class ContainerCreationError extends ContainerError {
	constructor(token: Token) {
		super(`${token} service not registered`, token);
		this.name = 'ContainerCreationError';

		Error.captureStackTrace(this, ContainerCreationError);
	}
}

/**
 * Error thrown when attempting to register a token that has already been registered
 * in the container.
 *
 * @extends ContainerError
 * @remarks
 * This error is useful for preventing duplicate token registrations, which could
 * lead to unexpected behavior or conflicts within the dependency injection container.
 *
 * @example
 * ```typescript
 * try {
 *   container.register(token, value);
 * } catch (error) {
 *   if (error instanceof TokenAlreadyRegisteredError) {
 *     // Handle duplicate registration
 *   }
 * }
 * ```
 *
 * @param token - The token that was attempted to be registered again.
 */

export class TokenAlreadyRegisteredError extends ContainerError {
	constructor(token: Token) {
		super(`Token ${token} is already registered`, token);
		this.name = 'TokenAlreadyRegisteredError';

		Error.captureStackTrace(this, TokenAlreadyRegisteredError);
	}
}

/**
 * Error thrown when a requested token is not registered in the container.
 *
 * @remarks
 * This error extends {@link ContainerError} and is typically used to indicate
 * that a dependency token could not be found during resolution.
 *
 * @example
 * ```typescript
 * throw new TokenNotRegisteredError(myToken);
 * ```
 *
 * @param token - The token that was not registered.
 */

export class TokenNotRegisteredError extends ContainerError {
	constructor(token: Token) {
		super(`Token ${token} is not registered`, token);
		this.name = 'TokenNotRegisteredError';

		Error.captureStackTrace(this, TokenNotRegisteredError);
	}
}

/**
 * Error thrown when a circular dependency is detected in the dependency injection container.
 *
 * @extends {ContainerError}
 *
 * @example
 * // Throws when a dependency chain forms a cycle:
 * throw new CircularDependencyError(['ServiceA', 'ServiceB'], 'ServiceA');
 *
 * @param dependencyChain - The current chain of dependencies being resolved.
 * @param currentToken - The token (identifier) of the dependency that caused the cycle.
 */

export class CircularDependencyError extends ContainerError {
	constructor(dependencyChain: string[], currentToken: Token) {
		const chain = [...dependencyChain, ...currentToken];
		const chainDescription = chain.map((t) => t).join(' -> ');

		super(`circular dependency detected: ${chainDescription}`, currentToken);
		this.name = 'CircularDependencyError ';

		Error.captureStackTrace(this, CircularDependencyError);
	}
}

export class InjectableError extends ContainerError {
	constructor(token: Token, dep: string) {
		super(`Self Registration Error: The class '${token}' depends on '${String(dep)}', but this is not registered.`, token);
		this.name = 'InjectableError';

		Error.captureStackTrace(this, InjectableError);
	}
}
