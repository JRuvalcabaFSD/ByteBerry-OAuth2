import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import { NotFoundRecordError } from './http.errors.js';

/**
 * Represents an error that occurs during a database operation.
 *
 * @remarks
 * This error is thrown when a database-related operation fails.
 * It extends the built-in `Error` class and includes additional properties
 * such as `statusCode` and `errorType` for standardized error handling.
 *
 * @example
 * ```typescript
 * throw new DatabaseError('Failed to connect to database');
 * ```
 *
 * @property statusCode - The HTTP status code associated with the error (default: 400).
 * @property errorType - A string identifying the type of error ('database').
 * @param message - A descriptive error message (default: 'Database operation failed').
 * @param cause - The underlying cause of the error, if any.
 */

export class DatabaseError extends Error {
	public statusCode = 422;
	public readonly errorType = 'database';
	constructor(message = 'Database operation failed', cause?: unknown) {
		super(message);
		this.cause = cause;

		Error.captureStackTrace(this, DatabaseError);
	}
}

/**
 * Error thrown when a unique constraint is violated in the database.
 *
 * @extends DatabaseError
 * @example
 * throw new UniqueConstraintError('email');
 *
 * @param field - The name of the field that caused the unique constraint violation.
 * @param cause - (Optional) The underlying cause of the error.
 */

class UniqueConstraintError extends DatabaseError {
	constructor(field: string, cause?: unknown) {
		super(`Unique constraint violated on field: ${field}`, cause);
		this.name = 'UniqueConstraintError';

		Error.captureStackTrace(this, UniqueConstraintError);
	}
}

/**
 * Error thrown when a foreign key constraint is violated in the database.
 *
 * @extends DatabaseError
 * @example
 * throw new ForeignKeyConstraintError('fk_user_profile');
 *
 * @param constraint - The name of the violated foreign key constraint.
 * @param cause - Optional. The underlying cause of the error.
 */

class ForeignKeyConstraintError extends DatabaseError {
	constructor(constraint: string, cause?: unknown) {
		super(`Foreign key constraint violated: ${constraint}`, cause);
		this.name = 'ForeignKeyConstraintError';

		Error.captureStackTrace(this, ForeignKeyConstraintError);
	}
}

/**
 * Represents an error that occurs when a database connection fails or times out.
 *
 * @extends DatabaseError
 * @remarks
 * This error should be thrown when the application is unable to establish a connection
 * to the database, or when a connection attempt exceeds the allowed timeout period.
 *
 * @param cause - (Optional) The underlying cause of the connection failure.
 */

class DatabaseConnectionError extends DatabaseError {
	constructor(cause?: unknown) {
		super('Database connection failed or timeout', cause);
		this.name = 'DatabaseConnectionError';

		Error.captureStackTrace(this, DatabaseConnectionError);
	}
}

/**
 * Represents a database error indicating a conflict, such as duplicate records.
 *
 * Extends the {@link DatabaseError} class to provide additional context for
 * errors caused by conflicting or duplicate entries in the database.
 *
 * @example
 * throw new ConflictError('A user with this email already exists.');
 */

export class ConflictError extends DatabaseError {
	constructor(msg: string) {
		super(msg, 'Registros duplicados');
		this.name = 'ConflictError';

		Error.captureStackTrace(this, ConflictError);
	}
}

export function handledPrismaError(error: unknown): Error {
	let result: Error;
	if (error instanceof PrismaClientKnownRequestError) {
		switch (error.code) {
			case 'P2002': {
				const field = (error.meta?.target as string[])?.join(', ') || 'unknown';
				result = new UniqueConstraintError(field, error);
				break;
			}
			case 'P2003': {
				const constraint = error.meta?.field_name as string;
				result = new ForeignKeyConstraintError(constraint, error);
				break;
			}
			case 'P2025': // <--- AGREGAR ESTE CASO
				result = new NotFoundRecordError(error.message);
				break;
			case 'P2011':
				result = new UniqueConstraintError('null_constraint', error);
				break;
			case 'P1001':
			case 'P1003':
			case 'P1017':
				result = new DatabaseConnectionError(error);
				break;
			default:
				result = new DatabaseConnectionError(error);
		}
	} else {
		result = new DatabaseConnectionError(error);
	}

	if (process.env.NODE_ENV === 'production') {
		delete result.stack;
	}

	return result;
}
