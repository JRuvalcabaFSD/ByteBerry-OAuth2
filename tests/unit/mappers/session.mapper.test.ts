import { describe, it, expect, vi } from 'vitest';
import { Session } from '@prisma/client';
import { SessionEntity } from '@domain';
import { SessionMapper } from '@infrastructure';

describe('SessionMapper', () => {
	describe('toDomain', () => {
		it('should map a session with metadata to a SessionEntity', () => {
			const mockSession: Session = {
				id: '123',
				userId: 'user-1',
				expiresAt: new Date(Date.now() + 3600000),
				userAgent: 'Mozilla/5.0',
				ipAddress: '192.168.1.1',
				metadata: { key: 'value' } as any,
				createdAt: new Date(),
				updatedAt: new Date(),
			};

			const result = SessionMapper.toDomain(mockSession);

			expect(result).toBeInstanceOf(SessionEntity);
			expect(result.id).toBe('123');
			expect(result.userId).toBe('user-1');
			expect(result.metadata).toEqual({ key: 'value' });
		});

		it('should map a session with null metadata to an empty object', () => {
			const mockSession: Session = {
				id: '456',
				userId: 'user-2',
				expiresAt: new Date(Date.now() + 3600000),
				userAgent: 'Mozilla/5.0',
				ipAddress: '192.168.1.1',
				metadata: null,
				createdAt: new Date(),
				updatedAt: new Date(),
			};

			const result = SessionMapper.toDomain(mockSession);

			expect(result).toBeInstanceOf(SessionEntity);
			expect(result.metadata).toEqual({});
		});

		it('should spread all session properties to the domain entity', () => {
			const mockSession: Session = {
				id: '789',
				userId: 'user-3',
				expiresAt: new Date(Date.now() + 3600000),
				userAgent: 'Mozilla/5.0',
				ipAddress: '192.168.1.1',
				metadata: { custom: 'data' } as any,
				createdAt: new Date(),
				updatedAt: new Date(),
			};

			const result = SessionMapper.toDomain(mockSession);

			expect(result.id).toBe('789');
			expect(result.userId).toBe('user-3');
		});
	});
});
