import { ClientEntity } from '@domain';
import { clientMapper } from '@infrastructure';
import { OAuthClient } from '@prisma/client';

describe('clientMapper', () => {
	it('should convert OAuthClient to ClientEntity', () => {
		const oauthClient: OAuthClient = {
			id: '1',
			clientId: 'test-client-id',
			clientSecret: 'test-secret',
			redirectUris: ['http://localhost:3000/callback'],
			createdAt: new Date(),
			updatedAt: new Date(),
			clientName: '',
			grantTypes: [],
			isPublic: false,
			isActive: false,
			clientSecretOld: null,
			secretExpiresAt: null,
			userId: ''
		};

		const result = clientMapper.toDomain(oauthClient);

		expect(result).toBeInstanceOf(ClientEntity);
	});

	it('should preserve all OAuthClient properties when converting to domain', () => {
		const oauthClient: OAuthClient = {
			id: '123',
			clientId: 'my-app',
			clientSecret: 'secret123',
			redirectUris: ['http://localhost:3000/callback'],
			createdAt: new Date('2024-01-01'),
			updatedAt: new Date('2024-01-02'),
			clientName: '',
			grantTypes: [],
			isPublic: false,
			isActive: false,
			clientSecretOld: null,
			secretExpiresAt: null,
			userId: ''
		};

		vi.spyOn(ClientEntity, 'create');

		clientMapper.toDomain(oauthClient);

		expect(ClientEntity.create).toHaveBeenCalledWith(oauthClient);
	});

	it('should handle OAuthClient with multiple redirect URIs', () => {
		const oauthClient: OAuthClient = {
			id: '2',
			clientId: 'multi-uri-client',
			clientSecret: 'secret456',
			redirectUris: [
				'http://localhost:3000/callback',
				'http://localhost:3001/callback',
			],
			createdAt: new Date(),
			updatedAt: new Date(),
			clientName: '',
			grantTypes: [],
			isPublic: false,
			isActive: false,
			clientSecretOld: null,
			secretExpiresAt: null,
			userId: ''
		};

		const result = clientMapper.toDomain(oauthClient);

		expect(result).toBeInstanceOf(ClientEntity);
	});
});
