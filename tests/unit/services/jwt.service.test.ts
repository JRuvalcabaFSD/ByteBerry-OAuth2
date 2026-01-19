import { describe, it, expect, beforeEach, vi } from 'vitest';
import { generateKeyPairSync } from 'crypto';
import jwt from 'jsonwebtoken';
import { InvalidTokenError } from '@shared';
import type { IConfig, IKeyLoader, ILogger } from '@interfaces';
import { JwtService } from '@infrastructure';

describe('JwtService', () => {
	let jwtService: JwtService;
	let mockConfig: IConfig;
	let mockKeyLoader: IKeyLoader;
	let mockLogger: ILogger;
	let privateKey: string;
	let publicKey: string;

	beforeEach(() => {
		const { privateKey: pk, publicKey: pub } = generateKeyPairSync('rsa', {
			modulusLength: 2048,
			publicKeyEncoding: { type: 'spki', format: 'pem' },
			privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
		});

		privateKey = pk;
		publicKey = pub;

		mockConfig = {
			jwtIssuer: 'test-issuer',
			jwtAudience: ['test-audience'],
			jwtAccessTokenExpiresIn: 3600,
			jwtKeyId: 'test-key-id',
		} as IConfig;

		mockKeyLoader = {
			getPrivateKey: vi.fn(() => privateKey),
			getPublicKey: vi.fn(() => publicKey),
		} as unknown as IKeyLoader;

		mockLogger = {
			debug: vi.fn(),
			error: vi.fn(),
			warn: vi.fn(),
		} as unknown as ILogger;

		jwtService = new JwtService(mockConfig, mockKeyLoader, mockLogger);
	});

	describe('generateAccessToken', () => {
		it('should generate a valid JWT token', () => {
			const payload = {
				sub: 'user123',
				email: 'user@example.com',
				client_id: 'client123',
				scope: 'read write',
				roles: ['admin'],
			};

			const token = jwtService.generateAccessToken(payload);

			expect(token).toBeTruthy();
			expect(typeof token).toBe('string');
			expect(token.split('.').length).toBe(3);
		});

		it('should include issuer and audience in token', () => {
			const payload = {
				sub: 'user123',
				email: 'user@example.com',
				client_id: 'client123',
				scope: 'read',
				roles: ['admin'],
			};

			const token = jwtService.generateAccessToken(payload);
			const decoded = jwt.decode(token) as any;

			expect(decoded.iss).toBe('test-issuer');
			expect(decoded.aud).toEqual(['test-audience']);
		});

		it('should include iat and exp claims', () => {
			const payload = {
				sub: 'user123',
				email: 'user@example.com',
				client_id: 'client123',
				scope: '',
				roles: ['admin'],
			};

			const before = Math.floor(Date.now() / 1000);
			const token = jwtService.generateAccessToken(payload);
			const after = Math.floor(Date.now() / 1000);
			const decoded = jwt.decode(token) as any;

			expect(decoded.iat).toBeGreaterThanOrEqual(before);
			expect(decoded.iat).toBeLessThanOrEqual(after);
			expect(decoded.exp).toBe(decoded.iat + 3600);
		});

		it('should log debug message on successful generation', () => {
			const payload = {
				sub: 'user123',
				email: 'user@example.com',
				client_id: 'client123',
				scope: 'read',
				roles: ['admin'],
			};

			jwtService.generateAccessToken(payload);

			expect(mockLogger.debug).toHaveBeenCalledWith('Access token generated', expect.objectContaining({
				sub: 'user123',
				email: 'user@example.com',
				client_id: 'client123',
			}));
		});

		it('should throw error and log when signing fails', () => {
			const mockFailingKeyLoader = {
				getPrivateKey: vi.fn(() => 'invalid-key'),
				getPublicKey: vi.fn(() => publicKey),
			} as unknown as IKeyLoader;

			const failingService = new JwtService(mockConfig, mockFailingKeyLoader, mockLogger);

			const payload = {
				sub: 'user123',
				email: 'user@example.com',
				client_id: 'client123',
			scope: '',
				roles: ['admin'],
			};

			expect(() => failingService.generateAccessToken(payload)).toThrow();
			expect(mockLogger.error).toHaveBeenCalled();
		});
	});

	describe('verifyToken', () => {
		it('should verify a valid token', () => {
			const payload = {
				sub: 'user123',
				email: 'user@example.com',
				client_id: 'client123',
				scope: 'read',
				roles: ['admin'],
			};

			const token = jwtService.generateAccessToken(payload);
			const decoded = jwtService.verifyToken(token, 'test-audience');

			expect(decoded.sub).toBe('user123');
			expect(decoded.email).toBe('user@example.com');
		});

		it('should throw InvalidTokenError for expired token', () => {
			const expiredToken = jwt.sign(
				{ sub: 'user123', iss: 'test-issuer', aud: ['test-audience'], exp: Math.floor(Date.now() / 1000) - 100 },
				privateKey,
				{ algorithm: 'RS256' }
			);

			expect(() => jwtService.verifyToken(expiredToken, 'test-audience')).toThrow(InvalidTokenError);
			expect(() => jwtService.verifyToken(expiredToken, 'test-audience')).toThrow('Token has expired');
		});

		it('should throw InvalidTokenError for invalid signature', () => {
			const payload = {
				sub: 'user123',
				email: 'user@example.com',
				client_id: 'client123',
				scope: '',
				roles: ['admin'],
			};

			const token = jwtService.generateAccessToken(payload);
			const tampered = token.slice(0, -10) + '0123456789';

			expect(() => jwtService.verifyToken(tampered, 'test-audience')).toThrow(InvalidTokenError);
		});

		it('should throw InvalidTokenError for audience mismatch', () => {
			const payload = {
				sub: 'user123',
				email: 'user@example.com',
				client_id: 'client123',
				scope: '',
				roles: ['admin'],
			};

			const token = jwtService.generateAccessToken(payload);

			expect(() => jwtService.verifyToken(token, 'different-audience')).toThrow(InvalidTokenError);
		expect(() => jwtService.verifyToken(token, 'different-audience')).toThrow('Token verification failed');
			jwtService.verifyToken(token, 'test-audience');

			expect(mockLogger.debug).toHaveBeenCalledWith('JWT token verified successfully', { sub: 'user123' });
		});

		it('should handle array audience correctly', () => {
			const multiAudienceToken = jwt.sign(
				{
					sub: 'user123',
					iss: 'test-issuer',
					aud: ['audience1', 'audience2'],
					iat: Math.floor(Date.now() / 1000),
					exp: Math.floor(Date.now() / 1000) + 3600,
				},
				privateKey,
				{ algorithm: 'RS256' }
			);

			const decoded = jwtService.verifyToken(multiAudienceToken, 'audience2');
			expect(decoded.sub).toBe('user123');
		});
	});

	describe('decodeToken', () => {
		it('should decode a valid token without verification', () => {
			const payload = {
				sub: 'user123',
				email: 'user@example.com',
				client_id: 'client123',
				scope: 'read',
				roles: ['admin'],
			};

			const token = jwtService.generateAccessToken(payload);
			const decoded = jwtService.decodeToken(token);

			expect(decoded).toBeTruthy();
			expect(decoded?.sub).toBe('user123');
		});

		it('should return null for invalid token', () => {
			const result = jwtService.decodeToken('invalid.token.string');

			expect(result).toBeNull();
		});

		it('should return null if decoded is a string', () => {
			vi.spyOn(jwt, 'decode').mockReturnValueOnce('string-token' as any);

			const result = jwtService.decodeToken('some-token');

			expect(result).toBeNull();
		});

		it('should log warning when decoding', () => {
			const payload = {
				sub: 'user123',
				email: 'user@example.com',
				client_id: 'client123',
				scope: '',
				roles: ['admin'],
			};

			const token = jwtService.generateAccessToken(payload);
			jwtService.decodeToken(token);

			expect(mockLogger.warn).toHaveBeenCalledWith('Decoding JWT token without verification');
		});

		it('should log debug on successful decode', () => {
			const payload = {
				sub: 'user123',
				email: 'user@example.com',
				client_id: 'client123',
				scope: '',
				roles: ['admin'],
			};

			const token = jwtService.generateAccessToken(payload);
			jwtService.decodeToken(token);

			expect(mockLogger.debug).toHaveBeenCalledWith('JWT token decoded successfully', { sub: 'user123' });
		});
	});
});
