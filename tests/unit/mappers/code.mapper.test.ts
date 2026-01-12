import { AuthorizationCode } from '@prisma/client';
import { CodeEntity, ClientIdVO, CodeChallengeVO } from '@domain';
import { CodeMapper } from '@infrastructure';

describe('CodeMapper', () => {
	describe('toEntity', () => {
		// Valid PKCE code challenge (43+ characters, alphanumeric)
		const validCodeChallenge = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUV';

		it('should map AuthorizationCode to CodeEntity with value objects', () => {
			const authCode = {
				code: 'test-code',
				userId: 'user-123',
				clientId: 'client-123',
				codeChallenge: validCodeChallenge,
				codeChallengeMethod: 'S256',
				redirectUri: 'http://localhost:3000/callback',
				expiresAt: new Date(Date.now() + 600000),
				used: false,
				usedAt: null,
				createdAt: new Date(),
				scope: null,
				state: null,
			} as AuthorizationCode;

			const result = CodeMapper.toEntity(authCode);

			expect(result).toBeInstanceOf(CodeEntity);
			expect(result.code).toBe(authCode.code);
		});

		it('should create ClientIdVO from clientId', () => {
			const authCode = {
				code: 'test-code',
				userId: 'user-123',
				clientId: 'client-123',
				codeChallenge: validCodeChallenge,
				codeChallengeMethod: 'S256',
				redirectUri: 'http://localhost:3000/callback',
				expiresAt: new Date(Date.now() + 600000),
				used: false,
				usedAt: null,
				createdAt: new Date(),
				scope: null,
				state: null,
			} as AuthorizationCode;

			const result = CodeMapper.toEntity(authCode);

			expect(result.clientId).toBeInstanceOf(ClientIdVO);
		});

		it('should create CodeChallengeVO with challenge and method', () => {
			const authCode = {
				code: 'test-code',
				userId: 'user-123',
				clientId: 'client-123',
				codeChallenge: validCodeChallenge,
				codeChallengeMethod: 'S256',
				redirectUri: 'http://localhost:3000/callback',
				expiresAt: new Date(Date.now() + 600000),
				used: false,
				usedAt: null,
				createdAt: new Date(),
				scope: null,
				state: null,
			} as AuthorizationCode;

			const result = CodeMapper.toEntity(authCode);

			expect(result.codeChallenge).toBeInstanceOf(CodeChallengeVO);
		});

		it('should mark entity as used when code.used is true and usedAt exists', () => {
			const usedAt = new Date();
			const authCode = {
				code: 'test-code',
				userId: 'user-123',
				clientId: 'client-123',
				codeChallenge: validCodeChallenge,
				codeChallengeMethod: 'S256',
				redirectUri: 'http://localhost:3000/callback',
				expiresAt: new Date(Date.now() + 600000),
				used: true,
				usedAt,
				createdAt: new Date(),
				scope: null,
				state: null,
			} as AuthorizationCode;

			const result = CodeMapper.toEntity(authCode);

			expect(result.isUsed()).toBe(true);
		});

		it('should not mark entity as used when code.used is false', () => {
			const authCode = {
				code: 'test-code',
				userId: 'user-123',
				clientId: 'client-123',
				codeChallenge: validCodeChallenge,
				codeChallengeMethod: 'plain',
				redirectUri: 'http://localhost:3000/callback',
				expiresAt: new Date(Date.now() + 600000),
				used: false,
				usedAt: null,
				createdAt: new Date(),
				scope: null,
				state: null,
			} as AuthorizationCode;

			const result = CodeMapper.toEntity(authCode);

			expect(result.isUsed()).toBe(false);
		});
	});
});
