import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
	DatabaseError,
	ConflictError,
	handledPrismaError,
} from '@shared';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import { NotFoundRecordError } from '@shared';

describe('DatabaseError', () => {
	it('should create a DatabaseError with default message', () => {
		const error = new DatabaseError();

		expect(error.message).toBe('Database operation failed');
		expect(error.statusCode).toBe(422);
		expect(error.errorType).toBe('database');
		expect(error).toBeInstanceOf(Error);
	});

	it('should create a DatabaseError with custom message', () => {
		const error = new DatabaseError('Custom error message');

		expect(error.message).toBe('Custom error message');
		expect(error.statusCode).toBe(422);
		expect(error.errorType).toBe('database');
	});

	it('should create a DatabaseError with cause', () => {
		const cause = new Error('Root cause');
		const error = new DatabaseError('Custom message', cause);

		expect(error.message).toBe('Custom message');
		expect(error.cause).toBe(cause);
	});

	it('should be instanceof Error', () => {
		const error = new DatabaseError();

		expect(error).toBeInstanceOf(Error);
	});
});

describe('ConflictError', () => {
	it('should create a ConflictError with message', () => {
		const error = new ConflictError('A user with this email already exists.');

		expect(error.message).toBe('A user with this email already exists.');
		expect(error.name).toBe('ConflictError');
		expect(error.statusCode).toBe(422);
		expect(error.errorType).toBe('database');
	});

	it('should create a ConflictError with cause', () => {
		const cause = 'Registros duplicados';
		const error = new ConflictError('Duplicate entry');

		expect(error.cause).toBe('Registros duplicados');
	});

	it('should extend DatabaseError', () => {
		const error = new ConflictError('Test conflict');

		expect(error).toBeInstanceOf(DatabaseError);
		expect(error).toBeInstanceOf(Error);
	});
});

describe('handledPrismaError', () => {
	it('should handle P2002 (unique constraint) error', () => {
		// Crear un objeto que sea instancia de PrismaClientKnownRequestError
		const prismError = Object.create(PrismaClientKnownRequestError.prototype);
		prismError.code = 'P2002';
		prismError.meta = {
			target: ['email', 'username'],
		};

		const result = handledPrismaError(prismError);

		expect(result).toBeInstanceOf(DatabaseError);
		expect(result.message).toContain('Unique constraint violated');
		expect(result.message).toContain('email, username');
	});

	it('should handle P2002 error with unknown field', () => {
		const prismError = Object.create(PrismaClientKnownRequestError.prototype);
		prismError.code = 'P2002';
		prismError.meta = {};

		const result = handledPrismaError(prismError);

		expect(result).toBeInstanceOf(DatabaseError);
		expect(result.message).toContain('Unique constraint violated');
		expect(result.message).toContain('unknown');
	});

	it('should handle P2003 (foreign key constraint) error', () => {
		const prismError = Object.create(PrismaClientKnownRequestError.prototype);
		prismError.code = 'P2003';
		prismError.meta = {
			field_name: 'user_id',
		};

		const result = handledPrismaError(prismError);

		expect(result).toBeInstanceOf(DatabaseError);
		expect(result.message).toContain('Foreign key constraint violated');
		expect(result.message).toContain('user_id');
	});

	it('should handle P2025 (record not found) error', () => {
		const prismError = Object.create(PrismaClientKnownRequestError.prototype);
		prismError.code = 'P2025';
		prismError.message = 'An operation failed because it depends on one or more records that were required but not found.';

		const result = handledPrismaError(prismError);

		expect(result).toBeInstanceOf(NotFoundRecordError);
		expect(result.message).toBe('An operation failed because it depends on one or more records that were required but not found.');
	});

	it('should handle P2011 (null constraint) error', () => {
		const prismError = Object.create(PrismaClientKnownRequestError.prototype);
		prismError.code = 'P2011';

		const result = handledPrismaError(prismError);

		expect(result).toBeInstanceOf(DatabaseError);
		expect(result.message).toContain('Unique constraint violated');
		expect(result.message).toContain('null_constraint');
	});

	it('should handle P1001 (connection error)', () => {
		const prismError = Object.create(PrismaClientKnownRequestError.prototype);
		prismError.code = 'P1001';

		const result = handledPrismaError(prismError);

		expect(result).toBeInstanceOf(DatabaseError);
		expect(result.message).toBe('Database connection failed or timeout');
	});

	it('should handle P1003 (connection error)', () => {
		const prismError = Object.create(PrismaClientKnownRequestError.prototype);
		prismError.code = 'P1003';

		const result = handledPrismaError(prismError);

		expect(result).toBeInstanceOf(DatabaseError);
		expect(result.message).toBe('Database connection failed or timeout');
	});

	it('should handle P1017 (connection error)', () => {
		const prismError = Object.create(PrismaClientKnownRequestError.prototype);
		prismError.code = 'P1017';

		const result = handledPrismaError(prismError);

		expect(result).toBeInstanceOf(DatabaseError);
		expect(result.message).toBe('Database connection failed or timeout');
	});

	it('should handle unknown Prisma error code', () => {
		const prismError = Object.create(PrismaClientKnownRequestError.prototype);
		prismError.code = 'P9999';

		const result = handledPrismaError(prismError);

		expect(result).toBeInstanceOf(DatabaseError);
		expect(result.message).toBe('Database connection failed or timeout');
	});

	it('should handle non-Prisma errors', () => {
		const error = new Error('Some random error');

		const result = handledPrismaError(error);

		expect(result).toBeInstanceOf(DatabaseError);
		expect(result.message).toBe('Database connection failed or timeout');
		expect(result.cause).toBe(error);
	});

	it('should handle null or undefined errors', () => {
		const result = handledPrismaError(null);

		expect(result).toBeInstanceOf(DatabaseError);
		expect(result.message).toBe('Database connection failed or timeout');
		expect(result.cause).toBe(null);
	});

	it('should remove stack trace in production environment', () => {
		const originalEnv = process.env.NODE_ENV;
		process.env.NODE_ENV = 'production';

		const error = new DatabaseError('Test error');
		const result = handledPrismaError(error);

		expect(result.stack).toBeUndefined();

		process.env.NODE_ENV = originalEnv;
	});

	it('should keep stack trace in non-production environment', () => {
		const originalEnv = process.env.NODE_ENV;
		process.env.NODE_ENV = 'development';

		const error = new DatabaseError('Test error');
		const result = handledPrismaError(error);

		expect(result.stack).toBeDefined();

		process.env.NODE_ENV = originalEnv;
	});

	it('should preserve error cause in handled error', () => {
		const cause = new Error('Root cause');
		const prismError = Object.create(PrismaClientKnownRequestError.prototype);
		prismError.code = 'P2002';
		prismError.meta = { target: ['email'] };
		prismError.cause = cause;

		const result = handledPrismaError(prismError);

		expect(result.cause).toBeDefined();
	});
});
